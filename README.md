🛒 ShopScale - Microservices E-Commerce Platform

ShopScale, modern e-ticaret sistemlerinin ölçeklenebilirlik ve performans gereksinimlerini karşılamak üzere tasarlanmış, Event-Driven (Olay Güdümlü) ve Microservices mimarisine sahip bir Full-Stack projesidir.

Proje, API Gateway arkasında çalışan 4 farklı mikroservis, çoklu veritabanı (Polyglot Persistence) yapısı ve RabbitMQ üzerinden asenkron iletişim altyapısını içerir. Ön yüz, Amazon benzeri modern bir arayüze sahip React Native mobil uygulamasıdır.

🏗️ Mimari Şeması

Sistem, dış dünyadan gelen istekleri tek bir kapıdan (Gateway) alır ve ilgili servislere yönlendirir. Servisler arası veri tutarlılığı, RabbitMQ üzerinden Pub/Sub modeliyle sağlanır.

graph TD
    Client[📱 Mobil Uygulama] --> Gateway[🚪 API Gateway :3000]
    
    Gateway --> Auth[🔐 Auth Service :3001]
    Gateway --> Product[📦 Product Service :3002]
    Gateway --> Order[🛒 Order Service :3003]
    
    Auth --- AuthDB[(🐘 PostgreSQL)]
    Order --- OrderDB[(🐘 PostgreSQL)]
    Product --- ProductDB[(🍃 MongoDB)]
    
    Order -- "Sipariş Oluştu (Event)" --> RabbitMQ{🐰 RabbitMQ Fanout}
    RabbitMQ -- "Stok Düş" --> Product
    RabbitMQ -- "Email Gönder" --> Notification[🔔 Notification Service :3004]


🧩 Servisler ve Teknolojiler

Servis

Port

Teknoloji

Veritabanı

Görev

API Gateway

3000

Express Proxy

-

Tüm trafiği yönetir ve yönlendirir.

Auth Service

3001

Node.js, JWT

PostgreSQL

Kullanıcı kaydı ve güvenli giriş (Authentication).

Product Service

3002

Node.js

MongoDB

Ürün kataloğu ve stok yönetimi (NoSQL).

Order Service

3003

Node.js

PostgreSQL

Sipariş oluşturma ve olay yayınlama (Publisher).

Notification

3004

Node.js

-

Sipariş olaylarını dinler ve bildirim simüle eder.

🚀 Kritik Teknik Özellikler

1. Asenkron İletişim (Event-Driven)

Sipariş oluşturulduğunda, sistem bloklanmaz. Order Service, RabbitMQ Exchange'ine bir mesaj fırlatır ve yanıtı döner. Arka planda Product Service stoğu düşerken, Notification Service kullanıcıya e-posta atar. Bu, sistemin yüksek trafik altında çökmemesini sağlar.

2. Polyglot Persistence (Çoklu Veri Saklama)

İlişkisel veriler (Kullanıcılar, Siparişler) için PostgreSQL (ACID uyumlu).

Esnek ve hızlı okuma gerektiren veriler (Ürün Kataloğu) için MongoDB.

3. API Gateway Pattern

İstemci (Mobil Uygulama) içeride kaç servis olduğunu bilmez. Tek bir endpoint (localhost:3000) ile muhatap olur. Bu, güvenlik ve yönetim kolaylığı sağlar.

🛠️ Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin.

1. Altyapıyı Başlat (Docker)

Veritabanları ve RabbitMQ konteynerlerini ayağa kaldırın:

docker-compose up -d


2. Servisleri Başlat

Her servis klasörüne gidip bağımlılıkları yükleyin ve başlatın:

API Gateway: cd api-gateway && npm install && npm run dev

Auth Service: cd auth-service && npm install && npx prisma migrate dev --name init && npm run dev

Product Service: cd product-service && npm install && npm run dev

Order Service: cd order-service && npm install && npx prisma migrate dev --name init && npm run dev

Notification Service: cd notification-service && npm install && npm run dev

3. Mobil Uygulamayı Başlat

cd mobile-shop
npm install
npx expo start -c


(Android emülatör için 'a' tuşuna basın)

👨‍💻 Geliştirici Notu

Bu proje; Senior Backend yetkinliklerini, özellikle Distributed Systems, Message Queues (RabbitMQ) ve Microservices Patterns konularını pekiştirmek amacıyla geliştirilmiştir.