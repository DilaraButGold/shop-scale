import express from 'express';
import cors from 'cors';
import proxy from 'express-http-proxy';

const app = express();
const port = 3000; // Gateway, ana kapı olduğu için 3000'de çalışır

app.use(cors());
app.use(express.json()); // Gelen JSON verisini oku

// --- SERVİS TANIMLARI ---
// (İleride bu portlarda servisleri ayağa kaldıracağız)
const authService = proxy('http://localhost:3001');
const productService = proxy('http://localhost:3002');
const orderService = proxy('http://localhost:3003');

// --- YÖNLENDİRMELER (ROUTING) ---

// 1. Auth İstekleri (Login, Register)
app.use('/auth', (req, res, next) => {
    console.log(`🔀 Gateway: İstek Auth Servisine yönlendiriliyor -> ${req.url}`);
    authService(req, res, next);
});

// 2. Ürün İstekleri (Listeleme, Detay)
app.use('/products', (req, res, next) => {
    console.log(`📦 Gateway: İstek Product Servisine yönlendiriliyor -> ${req.url}`);
    productService(req, res, next);
});

// 3. Sipariş İstekleri (Satın Alma)
app.use('/orders', (req, res, next) => {
    console.log(`🛒 Gateway: İstek Order Servisine yönlendiriliyor -> ${req.url}`);
    orderService(req, res, next);
});

// Ana Sayfa
app.get('/', (req, res) => {
    res.json({ message: "ShopScale API Gateway Hazır! 🚀" });
});

app.listen(port, () => {
    console.log(`Gateway http://localhost:${port} üzerinde çalışıyor`);
});