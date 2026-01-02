import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// --- RABBITMQ BAĞLANTISI ---
let channel: amqp.Channel;

const connectRabbitMQ = async () => {
    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672'; // RabbitMQ URL'si  
        const connection = await amqp.connect(rabbitUrl); // Bağlantı oluştur
        channel = await connection.createChannel(); // Kanal oluştur

        // 🔥 DEĞİŞİKLİK: Queue yerine Exchange kullanıyoruz
        // 'fanout': Mesajı, bu exchange'e bağlı herkese gönder demektir.
        await channel.assertExchange('ORDER_EXCHANGE', 'fanout', { durable: false });

        console.log('🐰 RabbitMQ Bağlantısı Başarılı! (Exchange Mode)');
    } catch (error) {
        console.error('❌ RabbitMQ Hatası:', error);
        // Bağlanamazsa 5 saniye sonra tekrar dene
        setTimeout(connectRabbitMQ, 5000);
    }
};

// --- ROTALAR ---

// 1. Sipariş Oluştur (Artık '/' adresinde - Gateway uyumlu)
app.post('/', async (req: Request, res: Response) => {
    try {
        const { userId, productId, quantity, total } = req.body;

        // A. Siparişi Veritabanına Yaz (PostgreSQL)
        const order = await prisma.order.create({
            data: { userId, productId, quantity, total }
        });

        // B. Mesajı Exchange'e Yayınla 📢
        if (channel) {
            const message = JSON.stringify({ userId, productId, quantity });

            // sendToQueue yerine 'publish' kullanıyoruz
            // İlk parametre: Exchange Adı
            // İkinci parametre: Routing Key (Fanout için boş bırakılır)
            channel.publish('ORDER_EXCHANGE', '', Buffer.from(message));

            console.log(`📢 Mesaj Yayınlandı: ${message}`);
        } else {
            console.warn("⚠️ RabbitMQ kanalı hazır değil, mesaj gönderilemedi.");
        }

        res.status(201).json({ message: 'Sipariş alındı!', order });
    } catch (error) {
        console.error("Sipariş hatası:", error);
        res.status(500).json({ error: 'Sipariş oluşturulamadı' });
    }
});

// 2. Siparişleri Listele
app.get('/', async (req: Request, res: Response) => {
    try {
        const orders = await prisma.order.findMany();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Siparişler getirilemedi' });
    }
});

// 3. Sağlık Kontrolü
app.get('/health', (req, res) => {
    res.json({ service: 'Order Service', status: 'Active' });
});

// Başlat
app.listen(port, () => {
    console.log(`🛒 Order Service http://localhost:${port} üzerinde çalışıyor`);
    connectRabbitMQ();
});