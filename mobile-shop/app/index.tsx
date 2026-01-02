// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    FlatList, Alert, SafeAreaView, Platform, StatusBar, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// 📡 GATEWAY AYARI
// Bilgisayarının IP adresini buraya yaz:
const GATEWAY_URL = 'http://192.168.1.124:3000';

// 🎨 AMAZON KURUMSAL RENK PALETİ
const COLORS = {
    headerBg: '#232F3E',       // Amazon Koyu Lacivert (Header)
    pageBg: '#EAEDED',         // Amazon Açık Gri (Arka Plan)
    cardBg: '#FFFFFF',         // Beyaz Kartlar
    primaryText: '#0F1111',    // Neredeyse Siyah Metin
    secondaryText: '#565959',  // Gri Metin

    orangeBtn: '#FFD814',      // Sepete Ekle Butonu
    orangeBtnBorder: '#FCD200',

    accentOrange: '#FF9900',   // Logo, Yıldızlar, Vurgular
    linkBlue: '#007185',       // Link Rengi

    success: '#067D62',        // Stokta Var Yeşili
    danger: '#B12704',         // Stok Yok Kırmızısı
    border: '#D5D9D9'          // Gri Çizgiler
};

export default function ShopApp() {
    const [token, setToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [products, setProducts] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState('home');
    const [cart, setCart] = useState<any[]>([]);

    const [email, setEmail] = useState('ali@test.com');
    const [password, setPassword] = useState('123456');
    const [isLoginView, setIsLoginView] = useState(true);
    const [fullName, setFullName] = useState('Ali Yılmaz');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkLogin();
    }, []);

    const checkLogin = async () => {
        const savedToken = await AsyncStorage.getItem('token');
        const savedUserId = await AsyncStorage.getItem('userId');
        const savedName = await AsyncStorage.getItem('fullName');

        if (savedToken && savedUserId) {
            setToken(savedToken);
            setUserId(parseInt(savedUserId));
            if (savedName) setFullName(savedName);
            fetchProducts(savedToken);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${GATEWAY_URL}/products`, { timeout: 10000 });
            setProducts(res.data);
        } catch (error) {
            console.error("Ürün çekme hatası:", error.message);
        }
        setLoading(false);
    };

    const handleAuth = async () => {
        setLoading(true);
        const endpoint = isLoginView ? '/auth/login' : '/auth/register';
        const payload = isLoginView ? { email, password } : { fullName, email, password };

        try {
            const res = await axios.post(`${GATEWAY_URL}${endpoint}`, payload, { timeout: 10000 });

            if (res.data.token) {
                await AsyncStorage.setItem('token', res.data.token);
                setToken(res.data.token);

                const uId = res.data.user?.id || res.data.userId || 1;
                const uName = res.data.user?.fullName || fullName;

                await AsyncStorage.setItem('userId', uId.toString());
                await AsyncStorage.setItem('fullName', uName);

                setUserId(uId);
                setFullName(uName);
                fetchProducts();
            } else if (!isLoginView) {
                Alert.alert("Hoş Geldiniz", "Kaydınız oluşturuldu. Giriş yapabilirsiniz.");
                setIsLoginView(true);
            }
        } catch (error) {
            Alert.alert("Hata", "Giriş yapılamadı. Bilgilerinizi kontrol edin.");
        } finally {
            setLoading(false);
        }
    };

    // --- PROFİL MENÜ FONKSİYONLARI ---
    const handleProfileMenu = (menuItem: string) => {
        switch (menuItem) {
            case 'Siparişlerim':
                Alert.alert("Siparişlerim", "Son 3 ayda verdiğiniz sipariş bulunmamaktadır.\n\n(Buraya gerçek sipariş geçmişi API'si bağlanabilir)");
                break;
            case 'Adreslerim':
                Alert.alert("Kayıtlı Adresler", "📍 Ev: Kadıköy, İstanbul\n📍 İş: Levent, İstanbul\n\n(Adres düzenleme özelliği yakında)");
                break;
            case 'Ödeme':
                Alert.alert("Cüzdan", `💳 Kayıtlı Kart: **** 1234\n💰 Bakiye: 500.00 TL`);
                break;
            case 'Mesajlar':
                Alert.alert("Mesaj Merkezi", "Okunmamış mesajınız yok.");
                break;
            default:
                break;
        }
    };

    const handleLogout = async () => {
        Alert.alert("Çıkış Yap", "Hesabınızdan çıkış yapmak istiyor musunuz?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Çıkış Yap", style: "destructive", onPress: async () => {
                    await AsyncStorage.clear();
                    setToken(null);
                    setProducts([]);
                    setCart([]);
                    setActiveTab('home');
                }
            }
        ]);
    };

    const addToCart = (product: any) => {
        if (product.stock <= 0) return;
        setCart([...cart, product]);
        Alert.alert("Sepete Eklendi", `${product.name} artık sepetinizde.`);
    };

    const removeFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const getCartTotal = () => {
        return cart.reduce((total, item) => total + item.price, 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return Alert.alert("Sepet Boş", "Sepetinizde ürün bulunmuyor.");

        setLoading(true);
        let successCount = 0;

        for (const item of cart) {
            try {
                await axios.post(`${GATEWAY_URL}/orders`, {
                    userId: userId || 1,
                    productId: item._id,
                    quantity: 1,
                    total: item.price
                }, { timeout: 10000 });
                successCount++;
            } catch (error) {
                console.log("Sipariş hatası:", item.name);
            }
        }
        setLoading(false);

        if (successCount > 0) {
            Alert.alert("Sipariş Alındı ✅", "Teşekkürler, siparişiniz hazırlanıyor.");
            setCart([]);
            setActiveTab('home');
            setTimeout(fetchProducts, 1000);
        } else {
            Alert.alert("Hata", "Sipariş oluşturulamadı.");
        }
    };

    // --- EKRANLAR ---

    // 1. AUTH SCREEN
    if (!token) {
        return (
            <SafeAreaView style={styles.authContainer}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />

                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>amazon<Text style={{ fontWeight: 'normal', fontStyle: 'italic', color: COLORS.accentOrange }}>ish</Text></Text>
                    <Text style={{ color: '#FFF', marginTop: 5 }}>ShopScale E-Ticaret</Text>
                </View>

                <View style={styles.authCard}>
                    <Text style={styles.authHeader}>{isLoginView ? "Giriş Yap" : "Hesap Oluştur"}</Text>

                    {!isLoginView && (
                        <TextInput style={styles.input} placeholder="Ad Soyad" value={fullName} onChangeText={setFullName} placeholderTextColor="#777" />
                    )}
                    <TextInput style={styles.input} placeholder="E-posta veya telefon" value={email} onChangeText={setEmail} autoCapitalize="none" placeholderTextColor="#777" />
                    <TextInput style={styles.input} placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#777" />

                    <TouchableOpacity style={styles.authBtn} onPress={handleAuth} disabled={loading}>
                        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.authBtnText}>{isLoginView ? "Giriş Yap" : "Amazonish Hesabınızı Oluşturun"}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsLoginView(!isLoginView)} style={{ marginTop: 20 }}>
                        <Text style={styles.switchText}>
                            {isLoginView ? "Yeni müşteri misiniz? " : "Zaten hesabınız var mı? "}
                            <Text style={{ fontWeight: 'bold', color: COLORS.linkBlue }}>
                                {isLoginView ? "Buradan başlayın." : "Giriş yapın."}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // 2. ANA SAYFA (RESİMSİZ, İKONLU LİSTE)
    const renderHome = () => (
        <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <Text style={{ fontSize: 18, marginRight: 10 }}>🔍</Text>
                    <TextInput placeholder="ShopScale'de Ara" style={styles.searchInput} placeholderTextColor="#777" />
                </View>
            </View>

            {/* Adres Barı */}
            <View style={styles.addressBar}>
                <Text style={{ color: 'white', fontSize: 13 }}>📍 {fullName} konumuna teslimat - İstanbul</Text>
            </View>

            <FlatList
                data={products}
                keyExtractor={(item) => item._id}
                refreshing={loading}
                onRefresh={fetchProducts}
                contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
                renderItem={({ item }) => (
                    <View style={styles.productCard}>
                        {/* Sol: İkon Kutusu */}
                        <View style={styles.iconContainer}>
                            <Text style={{ fontSize: 32 }}>📦</Text>
                        </View>

                        {/* Sağ: Detaylar */}
                        <View style={styles.detailsContainer}>
                            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                            <Text style={styles.productDesc} numberOfLines={1}>{item.description}</Text>

                            {/* Rating */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <Text style={{ color: '#FFA41C', fontSize: 12 }}>⭐⭐⭐⭐☆</Text>
                                <Text style={{ fontSize: 12, color: COLORS.secondaryText, marginLeft: 5 }}>1.042</Text>
                            </View>

                            {/* Fiyat */}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
                                <Text style={{ fontSize: 12, marginTop: 4, color: COLORS.primaryText }}>₺</Text>
                                <Text style={styles.priceMain}>{item.price}</Text>
                                <Text style={{ fontSize: 12, marginTop: 4, color: COLORS.primaryText }}>00</Text>
                            </View>

                            {/* Prime */}
                            <Text style={styles.primeText}>✓ <Text style={{ color: '#00A8E1', fontWeight: 'bold' }}>prime</Text></Text>
                            <Text style={styles.deliveryText}>YARIN teslimat</Text>

                            {item.stock <= 5 && item.stock > 0 ? (
                                <Text style={styles.lowStock}>Sadece {item.stock} adet kaldı</Text>
                            ) : item.stock === 0 ? (
                                <Text style={styles.outOfStock}>Geçici olarak temin edilemiyor</Text>
                            ) : null}

                            {/* Sepete Ekle Butonu */}
                            <TouchableOpacity
                                style={[styles.addToCartBtn, item.stock <= 0 && styles.disabledBtn]}
                                onPress={() => addToCart(item)}
                                disabled={item.stock <= 0}
                            >
                                <Text style={styles.addToCartText}>
                                    {item.stock > 0 ? "Sepete Ekle" : "Stok Tükendi"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    // 3. SEPET
    const renderCart = () => (
        <View style={{ flex: 1, backgroundColor: COLORS.pageBg }}>
            <View style={styles.cartHeader}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.primaryText }}>Sepet ({cart.length} ürün)</Text>
            </View>

            {cart.length === 0 ? (
                <View style={styles.emptyCart}>
                    <View style={styles.emptyIconCircle}>
                        <Text style={{ fontSize: 50 }}>🛒</Text>
                    </View>
                    <Text style={styles.emptyTitle}>Sepetiniz şu an boş.</Text>
                    <Text style={styles.emptySubtitle}>Günün fırsatlarını kaçırmayın.</Text>
                    <TouchableOpacity style={styles.goHomeBtn} onPress={() => setActiveTab('home')}>
                        <Text style={styles.goHomeText}>Alışverişe Devam Et</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={cart}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={{ padding: 10, paddingBottom: 150 }}
                        renderItem={({ item, index }) => (
                            <View style={styles.cartItem}>
                                <View style={styles.cartIconBox}><Text style={{ fontSize: 24 }}>🛍️</Text></View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.cartItemName}>{item.name}</Text>
                                    <Text style={styles.cartItemPrice}>₺{item.price}.00</Text>
                                    <Text style={{ color: COLORS.success, fontSize: 12 }}>Stokta var</Text>
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => removeFromCart(index)}>
                                        <Text style={{ fontSize: 14, color: COLORS.linkBlue }}>Sil</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />

                    <View style={styles.cartFooterFixed}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Ara Toplam:</Text>
                            <Text style={styles.totalAmount}>{getCartTotal()} ₺</Text>
                        </View>
                        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.checkoutBtnText}>SİPARİŞİ TAMAMLA ({cart.length} ürün)</Text>}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );

    // 4. PROFİL (ETKİLEŞİMLİ)
    const renderProfile = () => (
        <View style={{ flex: 1 }}>
            <View style={styles.profileHeader}>
                <View style={styles.profileTopRow}>
                    <Text style={styles.headerTitle}>amazon<Text style={{ fontWeight: 'normal', fontStyle: 'italic' }}>ish</Text></Text>
                    <TouchableOpacity onPress={() => handleProfileMenu('Mesajlar')}><Text style={{ fontSize: 20 }}>🔔</Text></TouchableOpacity>
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.greeting}>Merhaba, <Text style={{ fontWeight: 'bold' }}>{fullName}</Text></Text>
                </View>
            </View>

            <ScrollView style={{ padding: 15 }}>
                <Text style={styles.sectionHeader}>Hesabım</Text>

                <View style={styles.menuGrid}>
                    <TouchableOpacity style={styles.menuBox} onPress={() => handleProfileMenu('Siparişlerim')}>
                        <Text style={styles.menuBoxText}>📦 Siparişlerim</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuBox} onPress={() => handleProfileMenu('Tekrar Satın Al')}>
                        <Text style={styles.menuBoxText}>🔄 Tekrar Al</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuBox} onPress={() => handleProfileMenu('Adreslerim')}>
                        <Text style={styles.menuBoxText}>📍 Adreslerim</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuBox} onPress={() => handleProfileMenu('Ödeme')}>
                        <Text style={styles.menuBoxText}>💳 Ödeme</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeader}>Ayarlar</Text>

                <View style={styles.listMenu}>
                    <TouchableOpacity style={styles.listMenuItem} onPress={() => Alert.alert("Bilgi", "Uygulama Sürümü: v1.0.2")}>
                        <Text style={styles.listMenuText}>Uygulama Ayarları</Text>
                        <Text style={{ color: '#CCC' }}>›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.listMenuItem} onPress={handleLogout}>
                        <Text style={[styles.listMenuText, { color: COLORS.danger }]}>Çıkış Yap</Text>
                        <Text style={{ color: '#CCC' }}>›</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />

            <View style={{ flex: 1 }}>
                {activeTab === 'home' && renderHome()}
                {activeTab === 'cart' && renderCart()}
                {activeTab === 'profile' && renderProfile()}
            </View>

            {/* AMAZON TARZI ALT MENÜ */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
                    <Text style={[styles.navIcon, activeTab === 'home' && { color: COLORS.linkBlue }]}>🏠</Text>
                    {activeTab === 'home' && <View style={styles.activeLine} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
                    <Text style={[styles.navIcon, activeTab === 'profile' && { color: COLORS.linkBlue }]}>👤</Text>
                    {activeTab === 'profile' && <View style={styles.activeLine} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('cart')}>
                    <View>
                        <Text style={[styles.navIcon, activeTab === 'cart' && { color: COLORS.linkBlue }]}>🛒</Text>
                        {cart.length > 0 && <View style={styles.navBadge}><Text style={styles.navBadgeText}>{cart.length}</Text></View>}
                    </View>
                    {activeTab === 'cart' && <View style={styles.activeLine} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Text style={styles.navIcon}>☰</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.pageBg },

    // Auth
    authContainer: { flex: 1, backgroundColor: COLORS.pageBg, justifyContent: 'center', padding: 20 },
    logoContainer: { alignItems: 'center', marginBottom: 30 },
    logoText: { fontSize: 32, fontWeight: 'bold', color: COLORS.primaryText },
    logoSubText: { fontSize: 16, color: COLORS.secondaryText, fontStyle: 'italic' },
    authCard: { borderWidth: 1, borderColor: '#D5D9D9', padding: 25, backgroundColor: '#FFF', borderRadius: 8 },
    authHeader: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, color: COLORS.primaryText },
    authSubHeader: { fontSize: 14, color: COLORS.secondaryText, marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#888C8C', borderRadius: 4, padding: 12, marginBottom: 15, fontSize: 15, backgroundColor: '#FFF' },
    authBtn: { backgroundColor: COLORS.orangeBtn, borderColor: '#a88734', borderWidth: 1, padding: 12, borderRadius: 4, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
    authBtnText: { color: '#111', fontSize: 15, fontWeight: '400' },
    switchText: { textAlign: 'center', color: COLORS.secondaryText, fontSize: 13 },

    // Header & Home
    header: { backgroundColor: COLORS.headerBg, padding: 12, paddingTop: Platform.OS === 'android' ? 40 : 12, flexDirection: 'row', alignItems: 'center' },
    searchBar: { flex: 1, flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 6, paddingHorizontal: 10, alignItems: 'center', height: 42 },
    searchInput: { flex: 1, fontSize: 16 },
    searchBtn: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
    headerSubtitle: { fontSize: 14, color: '#FFF' },
    addressBar: { backgroundColor: '#37475A', padding: 10, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' },

    // Product Card
    productCard: { backgroundColor: '#FFF', marginBottom: 8, padding: 12, borderWidth: 1, borderColor: '#E7E7E7', borderRadius: 0 },
    productRow: { flexDirection: 'row' },
    iconContainer: { width: 100, height: 100, backgroundColor: '#F8F8F8', justifyContent: 'center', alignItems: 'center', borderRadius: 4, marginRight: 15 },
    detailsContainer: { flex: 1, justifyContent: 'space-between' },
    productName: { fontSize: 16, color: COLORS.primaryText, lineHeight: 20 },
    productDesc: { fontSize: 13, color: COLORS.secondaryText, marginVertical: 2 },
    priceMain: { fontSize: 22, fontWeight: 'bold', color: COLORS.primaryText },
    primeText: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },
    deliveryText: { fontSize: 12, color: COLORS.secondaryText },
    lowStock: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
    outOfStock: { color: COLORS.danger, fontSize: 13, fontWeight: 'bold', marginTop: 4 },
    addToCartBtn: { backgroundColor: COLORS.orangeBtn, borderColor: COLORS.orangeBtnBorder, borderWidth: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', marginTop: 8 },
    addToCartText: { fontSize: 13, color: '#0F1111' },
    disabledBtn: { backgroundColor: '#EEE', borderColor: '#CCC' },

    // Cart
    cartHeader: { padding: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#DDD' },
    cartSubtotalBox: { padding: 15, backgroundColor: '#FFF', marginBottom: 10 },
    subtotalText: { fontSize: 18, color: COLORS.primaryText },
    subtotalPrice: { fontWeight: 'bold', color: COLORS.danger },
    checkoutBtn: { backgroundColor: COLORS.orangeBtn, borderColor: COLORS.orangeBtnBorder, borderWidth: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    checkoutBtnText: { fontSize: 15, color: '#0F1111' },
    emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyIconCircle: { width: 100, height: 100, backgroundColor: '#FFF', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 2 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primaryText, marginBottom: 5 },
    emptySubtitle: { fontSize: 14, color: COLORS.secondaryText, marginBottom: 20 },
    goHomeBtn: { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#D5D9D9', borderRadius: 8, backgroundColor: '#FFF' },
    goHomeText: { color: COLORS.primaryText },
    cartItem: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, marginBottom: 1, borderBottomWidth: 1, borderColor: '#EEE' },
    cartIconBox: { width: 60, height: 60, backgroundColor: '#F8F8F8', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
    cartItemName: { fontSize: 15, fontWeight: 'bold', color: COLORS.primaryText, marginBottom: 5 },
    cartItemPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.danger },
    deleteBtn: { marginTop: 10 },
    cartFooterFixed: { position: 'absolute', bottom: 70, left: 0, right: 0, padding: 15, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderColor: '#DDD', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 5 },
    totalRow: { flexDirection: 'column' },
    totalLabel: { fontSize: 12, color: COLORS.secondaryText },
    totalAmount: { fontSize: 18, fontWeight: 'bold', color: COLORS.danger },

    // Profile
    profileHeader: { backgroundColor: COLORS.headerBg, padding: 15, paddingTop: Platform.OS === 'android' ? 40 : 15 },
    profileTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    profileInfo: { flexDirection: 'row', alignItems: 'center' },
    greeting: { fontSize: 22, color: '#FFF' },
    menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
    menuBox: { width: '48%', backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#D5D9D9', marginBottom: 10, alignItems: 'center' },
    menuBoxText: { fontSize: 15, color: COLORS.primaryText },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: COLORS.primaryText },
    listMenu: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#D5D9D9' },
    listMenuItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#EEE' },
    listMenuText: { fontSize: 16, color: COLORS.primaryText },

    // Nav
    bottomNav: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#DDD', paddingVertical: 8, justifyContent: 'space-around', position: 'absolute', bottom: 0, left: 0, right: 0 },
    navItem: { alignItems: 'center', flex: 1 },
    navIcon: { fontSize: 20 },
    activeLine: { width: 40, height: 3, backgroundColor: '#007185', marginTop: 2 },
    navBadge: { position: 'absolute', top: -5, right: 25, backgroundColor: COLORS.danger, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    navBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' }
});