# 📡 Ground Control System (GCS)

Bu proje, İHA (İnsansız Hava Aracı) ve drone sistemleri için geliştirilmiş profesyonel bir **Yer Kontrol İstasyonu** arayüzüdür. Uçuş sırasında hava aracından gelen telemetri verilerini anlık olarak görselleştirir ve operatöre aracı uzaktan yönetme imkanı sunar.

---

## 🚀 Temel Yetenekler

- 📊 **Anlık Telemetri:** İrtifa, hız, batarya durumu ve yön (heading) verilerini gerçek zamanlı grafiklerle izleyin.
- 🗺️ **Canlı Harita Takibi:** Aracın GPS koordinatlarını harita üzerinde anlık olarak takip edin.
- ⚙️ **Parametre Yapılandırma:** Uçuş kontrolcüsü üzerindeki PID katsayılarını ve kalibrasyon ayarlarını uzaktan güncelleyin.
- 🚨 **Hata & Uyarı Sistemi:** Kritik batarya seviyesi veya sinyal kaybı gibi durumlarda görsel ve sesli uyarılar.
- 📡 **Veri Kaydı (Logging):** Uçuş verilerini daha sonra analiz etmek üzere yerel veritabanına kaydedin.

---

## 🛠️ Teknik Altyapı

GCS, düşük gecikme ve yüksek veri tutarlılığı sağlamak üzere tasarlanmıştır:

- **Frontend:** JavaScript / React (Dinamik dashboard yapısı).
- **Haberleşme:** Serial Port (UART), WebSocket veya UDP üzerinden veri akışı.
- **Veri Formatı:** MAVLink veya özel protokol paketleri.
- **Grafik Kütüphaneleri:** Chart.js / D3.js (Performanslı veri görselleştirme).

---

## 🔌 Bağlantı Mimarisi

GCS, hava aracındaki telsiz modülü (LoRa, NRF24L01 veya Wi-Fi) aracılığıyla gelen verileri işler:



---

## 💻 Kurulum ve Kullanım

1. Depoyu klonlayın:
   ```bash
   git clone [https://github.com/FatihAksoyEEE/Ground-Control-System.git](https://github.com/FatihAksoyEEE/Ground-Control-System.git)
