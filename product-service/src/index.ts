import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './database';
import Product from './models/Product';
import amqp from 'amqplib';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Veritabanına Bağlan
connectDB();

// --- 🐰 RABBITMQ DINLEYICISI (CONSUMER) ---
const connectRabbitMQ = async () => {
    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const connection = await amqp.connect(rabbitUrl);
        const channel = await connection.createChannel();

        // 1. Exchange'i Tanımla (Order servisiyle aynı isimde)
        const exchangeName = 'ORDER_EXCHANGE';
        await channel.assertExchange(exchangeName, 'fanout', { durable: false });

        // 2. Kendine Özel Geçici Bir Kuyruk Oluştur
        // 'exclusive: true' -> Servis kapanınca kuyruk silinsin
        const q = await channel.assertQueue('', { exclusive: true });

        // 3. Kuyruğu Exchange'e Bağla (Bind)
        // "ORDER_EXCHANGE'e gelen mesajların bir kopyasını bana (q.queue) ver"
        channel.bindQueue(q.queue, exchangeName, '');

        console.log(`📦 Product Service Dinliyor... (Queue: ${q.queue})`);

        channel.consume(q.queue, async (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                console.log('📦 Stok Güncelleme İsteği:', content);

                const { productId, quantity } = content;

                try {
                    const product = await Product.findById(productId);
                    if (product) {
                        product.stock -= quantity;
                        await product.save();
                        console.log(`✅ Ürün (${product.name}) stoğu güncellendi. Yeni Stok: ${product.stock}`);
                    } else {
                        console.error(`❌ Ürün bulunamadı: ${productId}`);
                    }
                    // İşlem başarılı olsun ya da olmasın mesajı onayla
                    channel.ack(msg);
                } catch (err) {
                    console.error('❌ Stok güncelleme hatası:', err);
                    // Hata durumunda da onayla ki kuyruk tıkanmasın (gerçek senaryoda Dead Letter Queue kullanılır)
                    channel.ack(msg);
                }
            }
        });

    } catch (error) {
        console.error('❌ RabbitMQ Hatası:', error);
        // Bağlanamazsa 5 saniye sonra tekrar dene
        setTimeout(connectRabbitMQ, 5000);
    }
};

// --- ROTALAR ---

// 1. Ürünleri Listele (Gateway uyumlu '/')
app.get('/', async (req: Request, res: Response) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        console.error('Ürünleri getirme hatası:', error);
        res.status(500).json({ error: 'Ürünler getirilemedi' });
    }
});

// 2. Yeni Ürün Ekle (Gateway uyumlu '/')
app.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description, price, stock } = req.body;
        const newProduct = new Product({ name, description, price, stock });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Ürün ekleme hatası:', error);
        res.status(500).json({ error: 'Ürün eklenemedi', details: error });
    }
});

// 3. Sağlık Kontrolü
app.get('/health', (req, res) => {
    res.json({ service: 'Product Service', status: 'Active' });
});

// Başlat
app.listen(port, () => {
    console.log(`📦 Product Service http://localhost:${port} üzerinde çalışıyor`);
    // Sunucu başlayınca RabbitMQ'yu da dinlemeye başla
    connectRabbitMQ();
});