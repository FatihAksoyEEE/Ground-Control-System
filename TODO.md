# Yer Kontrol İstasyonu (GCS) - Proje Planı

Bu belge, Bluetooth üzerinden veri alan, modern ve yüksek performanslı bir İHA Yer Kontrol İstasyonu geliştirmek için gereken adımları içerir. Öncelik, Frontend (Arayüz) geliştirmesidir.

## 🟢 Frontend (Öncelikli)

### 1. Kurulum ve Altyapı
- [x] **Proje Başlangıcı:** Vite + React + Vanilla CSS ile projenin oluşturulması.
- [x] **Dizin Yapısı:** `components`, `hooks`, `services`, `assets`, `styles` klasörlerinin organize edilmesi.
- [x] **Global State Yönetimi:** Context API / State yapısı kuruldu.

### 2. Arayüz Tasarımı (UI/UX)
- [x] **Tema Oluşturma:** Koyu tema (Dark Mode), neon aksan renkleri ve "Glassmorphism" (buzlu cam) efektlerinin CSS değişkenleri (root) olarak tanımlanması.
- [x] **Layout (Yerleşim):**
    -   **Sidebar:** Navigasyon ve mod seçimleri.
    -   **Topbar:** Sistem durumu (Bağlantı, Saat, FPS).
    -   **Main Dashboard:** Sürüklenebilir/boyutlandırılabilir grid yapısı (Grid ile uygulandı).

### 3. Temel Bileşenler (Components)
- [x] **PFD (Primary Flight Display):** Yapay Ufuk (Horizon), Hız ve İrtifa Şeritleri (Tapes).
- [x] **Harita:** Leaflet entegrasyonu, uçak ikonu ve rota çizimi.
- [x] **Telemetri Paneli:** Batarya, GPS, Mod ve Sinyal durumu widget'ları.
- [ ] UAV tipleri için seçenekler ekle (Cuad, Hexa, Octa, Fixed Wing, VTOL, vb.)
- [ ] Daha çok son kullanıcıya yönelik bir arayüz tasarımı yap
- [ ] motorların ayarlaması gibi özellikler ekle.
- [ ] Servo açısı sınırlama, motor yön ve RPM sınırlaması, vb.

---

## 🔵 Backend / Veri Katmanı (Electron & Serial)

### 1. Bağlantı Yönetimi
- [x] **SerialPort Entegrasyonu:** Electron Main Process içinde `serialport` kurulumu.
- [x] **Port Yönetimi:** Portları listeleme (`listPorts`), Bağlanma (`connect`), Kopma (`disconnect`).
- [x] **Config Arayüzü:** Baud Rate, Port seçimi ve Bağlantı Durumu göstergeleri.

### 2. İletişim Protokolü
- [x] **Binary Protokol:** Özel veri paketi yapısı (Header: `0xAA 0xBB`, Payload: 24 bytes).
- [x] **Parser (Ayrıştırıcı):** React tarafında `DataView` ve `Buffer` sistemi ile veri işleme.
- [x] **Performans:** UI Yenileme Hızı (Update Rate) ayarı (Throttle mekanizması).

---

## 🟡 Sırada Yapılacaklar (Remaining Tasks)

### 1. Kalıcılık (Persistence)
- [x] **Ayarları Kaydetme:** Tema, Birimler, Baud Rate ve Sesli Uyarı ayarlarının `localStorage` ile saklanması ve açılışta yüklenmesi.

### 2. Görev Yönetimi (Mission Control)
- [x] **Waypoint Upload:** Haritaya tıklayarak oluşturulan rotanın Binary paket haline getirilip İHA'ya gönderilmesi (Write).
- [x] **Flight Mode Interaction:** Uçuş ekranında haritaya tıklayarak anlık rota değiştirme ve yükleme.
- [x] **GPS Konum Takibi:** Gelen veri paketinden `LAT`, `LON` verilerinin parse edilmesi ve haritada gösterilmesi.
- [ ] **Waypoint Download:** İHA'daki mevcut görevi okuma (Read).
- [ ] **Gamepad Kontrol:** USB Joystick/Gamepad ile İHA kontrolü (RC Override).
- [x] **Mission Edit:** Waypoint'leri sürükleyip bırakarak (Drag & Drop) ve liste üzerinden düzenlemek.
