import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        // Docker'daki mongo servisine bağlanıyoruz
        // mongo:27017 docker ağı içindeki isimdir, localhost dışarıdandır.
        // Biz şimdilik localden geliştirdiğimiz için localhost kullanacağız.
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopdb';

        await mongoose.connect(mongoURI);
        console.log('🍃 MongoDB Bağlantısı Başarılı!');
    } catch (error) {
        console.error('❌ MongoDB Bağlantı Hatası:', error);
        process.exit(1);
    }
};

export default connectDB;