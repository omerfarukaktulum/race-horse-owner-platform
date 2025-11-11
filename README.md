# TJK Stablemate

Türkiye'deki yarış atı sahipleri için kapsamlı yönetim platformu.

## 🎯 Özellikler

### ✅ Tamamlanan Özellikler

#### Kimlik Doğrulama & Kullanıcı Yönetimi
- ✅ Sahip ve antrenör kayıt sistemi
- ✅ JWT tabanlı kimlik doğrulama
- ✅ Rol bazlı erişim kontrolü (RBAC)
- ✅ Güvenli middleware

#### Sahip Onboarding
- ✅ TJK sahip adı arama (mock)
- ✅ Eküri oluşturma
- ✅ TJK'dan at içe aktarma (mock)

#### At Yönetimi
- ✅ At listeleme (Yarışta/Aygır/Kısrak sekmeler)
- ✅ At detay sayfası
- ✅ At ekleme/düzenleme/silme
- ✅ Hipodrom ve çiftlik ataması
- ✅ Antrenör ataması

#### Gider Takibi
- ✅ Gider ekleme (çoklu at seçimi)
- ✅ Fotoğraf yükleme (base64)
- ✅ 9 kategori + özel kategori
- ✅ Gider listeleme ve filtreleme
- ✅ Tarih, kategori, at bazlı filtreleme
- ✅ Gider silme (sahip/admin)

#### İstatistikler & Raporlar
- ✅ At istatistikleri (durum, hipodrom dağılımı)
- ✅ Gider istatistikleri (aylık trend, kategori dağılımı)
- ✅ Recharts ile görselleştirme
- ✅ CSV dışa aktarma
- ✅ Top harcama yapılan atlar
- ✅ Ortalama gider hesaplamaları

#### Abonelik & Faturalandırma
- ✅ Stripe entegrasyonu
- ✅ Aylık abonelik planı
- ✅ Ödeme checkout sayfası
- ✅ Müşteri portalı
- ✅ Webhook işlemleri
- ✅ Ücretsiz vs Premium karşılaştırma

#### Admin Panel
- ✅ Kullanıcı listesi ve filtreleme
- ✅ Hipodrom CRUD API'leri
- ✅ Çiftlik CRUD API'leri
- ✅ Admin dashboard

#### UI/UX
- ✅ Mobil responsive tasarım
- ✅ Türkçe arayüz
- ✅ Modern gradient arka planlar
- ✅ Radix UI bileşenleri
- ✅ Toast bildirimleri (Sonner)
- ✅ Loading durumları

#### SEO & Meta
- ✅ Metadata yapılandırması
- ✅ robots.txt
- ✅ sitemap.xml
- ✅ manifest.json (PWA hazır)
- ✅ Open Graph etiketleri

### ✅ TJK Entegrasyonu (Hibrit Yaklaşım!)

🎉 **Gerçek TJK Verileri**: API + Playwright ile tam entegrasyon!

**Sahip Araması:**
- ✅ TJK'nın resmi API'si kullanılıyor
- ✅ Hızlı ve güvenilir (~200-500ms)
- ✅ Otomatik fallback mock data'ya

**At İçe Aktarma:**
- ✅ Playwright browser automation ile TJK sitesinden çekiliyor
- ✅ TJK'nın anti-bot korumasını bypass eder
- ✅ 50+ at için bile çalışır
- ⚠️ 5-10 saniye sürebilir (kabul edilebilir)
- ✅ At adı, doğum yılı, cinsiyet, durum bilgileri
- ✅ Çoklu seçim ve otomatik import

**Teknik Detaylar:**
- Sahip arama: TJK REST API kullanılıyor (hızlı)
- At import: Playwright ile otomatik tarayıcı kontrolü (güvenilir)
- Detaylı döküman: `TJK_API_INTEGRATION.md` ve `PLAYWRIGHT_IMPLEMENTATION.md`

### 📋 Planlanan
- [ ] Vercel Blob ile fotoğraf yükleme
- [ ] Rate limiting (Redis/KV)
- [ ] E2E testler (Playwright)
- [ ] Google Analytics entegrasyonu
- [ ] Email bildirimleri (Resend)

## 🛠 Teknolojiler

- **Frontend**: Next.js 14.1 (App Router), React 18, TypeScript 5+
- **Database**: PostgreSQL, Prisma 6.8.2
- **Authentication**: NextAuth 4.24.11, JWT, bcryptjs
- **Payments**: Stripe
- **Styling**: Tailwind CSS 3.3, Radix UI
- **Charts**: Recharts
- **Notifications**: Sonner
- **Date**: date-fns 4.1
- **Validation**: Zod
- **Deployment**: Vercel

## 📦 Kurulum

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Playwright Chromium'u yükleyin:**
```bash
npx playwright install chromium
```
⚠️ **Önemli**: At içe aktarma için Playwright gereklidir (~300MB).

3. **Veritabanını oluşturun:**
```bash
createdb tjk_stablemate
```

4. **Environment değişkenlerini kontrol edin:**
`.env.local` dosyası zaten oluşturuldu. Stripe API anahtarlarını güncelleyin.

5. **Veritabanı şemasını oluşturun:**
```bash
npm run db:push
```

6. **Seed verilerini yükleyin:**
```bash
npm run db:seed
```

7. **Development sunucusunu başlatın:**
```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

## 👥 Demo Kullanıcılar

### Sahip (Owner)
- **Email:** demo@owner.com
- **Password:** owner123456
- **Özellikler:** At ekleme, gider takibi, istatistikler, abonelik

### Antrenör (Trainer)
- **Email:** demo@trainer.com
- **Password:** trainer123456
- **Özellikler:** Atanan atları görüntüleme, gider ekleme

### Admin
- **Email:** admin@tjk.com
- **Password:** admin123456
- **Özellikler:** Tüm kullanıcılar, atlar, referans verileri yönetimi

## 🗂 Proje Yapısı

```
app/
├── (auth)/                    # Kimlik doğrulama sayfaları
│   ├── signin/
│   ├── register/
│   └── onboarding/
├── app/                       # Ana uygulama
│   ├── home/                 # Dashboard
│   ├── horses/               # At yönetimi
│   ├── expenses/             # Gider takibi
│   ├── stats/                # İstatistikler
│   ├── billing/              # Abonelik
│   └── stablemate/           # Eküri yönetimi
├── admin/                    # Admin panel
├── api/                      # API routes
│   ├── auth/                # Kimlik doğrulama
│   ├── horses/              # At API'leri
│   ├── expenses/            # Gider API'leri
│   ├── stats/               # İstatistik API'leri
│   ├── billing/             # Ödeme API'leri
│   ├── tjk/                 # TJK entegrasyonu
│   └── admin/               # Admin API'leri
├── components/ui/            # UI bileşenleri
└── lib/                      # Yardımcı fonksiyonlar
    ├── context/             # React contexts
    ├── constants/           # Sabitler
    ├── utils/               # Utility functions
    └── validation/          # Zod schemas

prisma/
├── schema.prisma            # Veritabanı şeması
└── seed.ts                  # Seed script
```

## 🔑 Önemli API Endpoint'leri

### Kimlik Doğrulama
- `POST /api/auth/signin` - Giriş
- `POST /api/auth/register/owner` - Sahip kaydı
- `POST /api/auth/register/trainer` - Antrenör kaydı
- `GET /api/auth/me` - Mevcut kullanıcı

### Atlar
- `GET /api/horses` - At listesi
- `POST /api/horses` - Yeni at
- `GET /api/horses/[id]` - At detayı
- `PATCH /api/horses/[id]` - At güncelleme
- `DELETE /api/horses/[id]` - At silme

### Giderler
- `GET /api/expenses` - Gider listesi
- `POST /api/expenses` - Yeni gider
- `DELETE /api/expenses/[id]` - Gider silme

### İstatistikler
- `GET /api/stats/horses` - At istatistikleri
- `GET /api/stats/expenses` - Gider istatistikleri
- `GET /api/stats/expenses/export` - CSV dışa aktarma

### Abonelik
- `POST /api/billing/create-checkout-session` - Ödeme başlat
- `POST /api/billing/create-portal-session` - Portal oluştur
- `POST /api/webhooks/stripe` - Stripe webhooks

## 🚀 Deployment

### Vercel Deployment

1. GitHub reposunu Vercel'e bağlayın
2. Environment variables'ı ayarlayın:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`
   - `NEXT_PUBLIC_APP_URL`

3. Build ayarları:
   - Build Command: `prisma generate && next build`
   - Output Directory: `.next`

4. Deploy!

## 🔐 Güvenlik

- ✅ JWT tabanlı kimlik doğrulama
- ✅ Bcrypt şifre hashleme (12 rounds)
- ✅ CSRF koruması
- ✅ Güvenlik headers (CSP, X-Frame-Options)
- ✅ Rate limiting hazır (KV ile aktif edilebilir)
- ✅ SQL injection koruması (Prisma ORM)
- ✅ XSS koruması

## 🐛 Bilinen Sorunlar & Geliştirme Notları

### TJK Entegrasyonu
- **Sahip Araması**: ✅ TJK resmi API ile çalışıyor (gerçek veriler)
- **At Listesi**: ✅ TJK resmi API ile çalışıyor (gerçek veriler)
- **Örnek At Gösterimi**: ✅ Her sahip için doğrulama amaçlı
- **Detay**: Bkz. `TJK_API_INTEGRATION.md`

### Fotoğraf Yükleme
- **Durum**: Base64 encoding kullanımda  
- **Gelecek**: Vercel Blob entegrasyonu eklenecek

## 📄 Lisans

MIT

## 🙏 Teşekkürler

- [Next.js](https://nextjs.org/) - Framework
- [Prisma](https://www.prisma.io/) - ORM
- [Radix UI](https://www.radix-ui.com/) - UI Components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Recharts](https://recharts.org/) - Charts
