import express, { Request, Response } from 'express';
import cors from 'cors';
import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3004; // Bu servis 3004'te çalışacak

app.use(cors());
app.use(express.json());

// --- 🐰 RABBITMQ DINLEYICISI (PUB/SUB) ---
const connectRabbitMQ = async () => {
    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const connection = await amqp.connect(rabbitUrl);
        const channel = await connection.createChannel();

        // 1. Exchange Tanımla (Order ve Product ile aynı isim)
        const exchangeName = 'ORDER_EXCHANGE';
        await channel.assertExchange(exchangeName, 'fanout', { durable: false });

        // 2. Özel Kuyruk Oluştur
        const q = await channel.assertQueue('', { exclusive: true });

        // 3. Bağla (Bind)
        channel.bindQueue(q.queue, exchangeName, '');

        console.log(`📧 Notification Service Dinliyor... (Queue: ${q.queue})`);

        // Mesaj gelince ne yapalım?
        channel.consume(q.queue, (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());

                console.log('------------------------------------------------');
                console.log('📧 E-POSTA GÖNDERİLİYOR...');
                console.log(`👤 Kime: User ID ${content.userId}`);
                console.log(`📦 Ürün: ${content.productId}`);
                console.log(`✅ Durum: Sipariş alındı, hazırlanıyor.`);
                console.log('------------------------------------------------');

                // Mesajı onayla (Silinsin)
                channel.ack(msg);
            }
        });

    } catch (error) {
        console.error('❌ RabbitMQ Hatası:', error);
        setTimeout(connectRabbitMQ, 5000);
    }
};

// Basit Sağlık Kontrolü
app.get('/', (req, res) => {
    res.json({ service: 'Notification Service', status: 'Active' });
});

app.listen(port, () => {
    console.log(`🔔 Notification Service http://localhost:${port} üzerinde çalışıyor`);
    connectRabbitMQ();
});