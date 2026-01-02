import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

app.use(cors());
app.use(express.json());

// --- VERİTABANI BAĞLANTI TESTİ ---
async function checkDbConnection() {
    try {
        await prisma.$connect();
        console.log('🐘 Veritabanı bağlantısı başarılı!');
    } catch (error) {
        console.error('❌ Veritabanı bağlantı hatası:', error);
    }
}
checkDbConnection();

// --- ROTALAR ---

// Kayıt Ol
app.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { fullName, email, password } = req.body;

        if (!email || !password || !fullName) {
            res.status(400).json({ error: 'Eksik bilgi: Ad, Email veya Şifre boş olamaz.' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: { fullName, email, password: hashedPassword }
        });

        res.status(201).json({ message: 'Kullanıcı oluşturuldu', userId: user.id });
    } catch (error: any) {
        console.error("❌ Kayıt Hatası:", error);
        // P2002: Unique constraint failed (Email zaten var)
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Bu email adresi zaten kayıtlı.' });
        } else {
            res.status(500).json({ error: 'Kayıt işlemi başarısız', details: error.message });
        }
    }
});

// Giriş Yap
app.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email ve şifre zorunludur.' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.status(401).json({ error: 'Hatalı şifre.' });
            return;
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Giriş başarılı', token });

    } catch (error: any) {
        // 🔥 BURASI KRİTİK: Hatanın gerçek sebebini terminale ve telefona basıyoruz
        console.error("❌ Login Hatası Detaylı:", error);
        res.status(500).json({ error: 'Sunucu içi hata oluştu', details: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ service: 'Auth Service', status: 'Active' });
});

app.listen(port, () => {
    console.log(`🔐 Auth Service http://localhost:${port} üzerinde çalışıyor`);
});