
import React, { useRef, useEffect } from 'react';

/**
 * Primary Flight Display (PFD) - Modern / SpaceX Style
 *
 * Referans görüntüye dayalı, dairesel ve teknik görünümlü yapay ufuk.
 *
 * @param {number} roll - Derece cinsinden yatma açısı (+/-)
 * @param {number} pitch - Derece cinsinden dikilme açısı (+/-)
 */
const ArtificialHorizon = ({ roll = 0, pitch = 0 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20; // Dış boşluk bırak

        // Temizle
        ctx.clearRect(0, 0, width, height);

        // --- 1. Ana Maskeleme (Dairesel Orb) ---
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.clip(); // Sadece bu dairenin içine çiz

        // --- 2. Gökyüzü ve Yer (Roll & Pitch ile hareketli) ---
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((roll * Math.PI) / 180); // Roll dönüşü

        // Pitch kaydırması (Piksel/Derece oranı)
        const pixelsPerDegree = radius / 25; // Görünür alan yaklaşık +/- 25 derece olsun
        const pitchOffset = pitch * pixelsPerDegree;
        ctx.translate(0, pitchOffset);

        // Gökyüzü (Gri/Mavi Teknik Ton)
        ctx.fillStyle = '#65727e'; // Açık Gri/Mavi referanstaki gibi
        ctx.fillRect(-width, -height * 3, width * 2, height * 3); // Geniş alan

        // Yer (Koyu Gri/Siyah)
        ctx.fillStyle = '#2d3238'; // Koyu Gri
        ctx.fillRect(-width, 0, width * 2, height * 3);

        // Ufuk Çizgisi
        ctx.beginPath();
        ctx.moveTo(-width, 0);
        ctx.lineTo(width, 0);
        ctx.strokeStyle = '#00ff00'; // Yeşil veya Beyaz (Referansta ince bir çizgi var, biz yeşil yapalım teknik dursun)
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- 3. Pitch Merdiveni (Pitch Ladder) ---
        ctx.font = 'bold 12px "Roboto Mono", monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;

        // +/- 90 derece çizgileri
        for (let i = -90; i <= 90; i += 10) {
            if (i === 0) continue; // Ufuk çizgisi zaten var

            const y = -i * pixelsPerDegree;

            // Sadece görünür alandakileri çiz (Optimizasyon)
            if (y + pitchOffset < -radius || y + pitchOffset > radius) continue;

            const length = i % 30 === 0 ? 80 : 40; // Ana dereceler uzun, aralar kısa

            ctx.beginPath();
            // Kesik çizgi efekti için
            // Sol parça
            ctx.moveTo(-length / 2 - 30, y);
            ctx.lineTo(-length / 2, y);
            ctx.lineTo(-length / 2, y + (i > 0 ? 5 : -5)); // Çentik aşağı veya yukarı

            // Sağ parça
            ctx.moveTo(length / 2 + 30, y);
            ctx.lineTo(length / 2, y);
            ctx.lineTo(length / 2, y + (i > 0 ? 5 : -5));

            ctx.stroke();

            // Değer Yazısı
            ctx.fillText(Math.abs(i).toString(), -length / 2 - 45, y);
            ctx.fillText(Math.abs(i).toString(), length / 2 + 45, y);
        }

        ctx.restore(); // Dönüşleri (Roll/Pitch) sıfırla
        ctx.restore(); // Maskeyi kaldır (Daire dışına çizim serbest)

        // --- 4. Sabit Çerçeve ve Göstergeler ---

        // Dış Halka (Roll Scale)
        ctx.save();
        ctx.translate(centerX, centerY);

        // Çerçeve Çizgisi
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Üst Yay (Roll Dereceleri)
        const arcRadius = radius + 15;
        ctx.beginPath();
        ctx.arc(0, 0, arcRadius, Math.PI, Math.PI * 2); // Yarım daire üstte
        // ctx.strokeStyle = 'white';
        // ctx.lineWidth = 1;
        // ctx.stroke();

        // Roll İşaretçileri (Tikler)
        for (let i = -60; i <= 60; i += 30) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 180);

            ctx.beginPath();
            ctx.moveTo(0, -radius);
            ctx.lineTo(0, -radius - 10);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Derece yazısı (Opsiyonel)
            if (i !== 0) {
                ctx.translate(0, -radius - 20);
                ctx.rotate((-i * Math.PI) / 180); // Yazıyı düzelt
                ctx.fillStyle = '#aaaaaa';
                ctx.font = '10px monospace';
                ctx.fillText(Math.abs(i).toString(), 0, 0);
            }

            ctx.restore();
        }

        // Üst Merkez Üçgeni (Sabit Gösterge)
        ctx.beginPath();
        ctx.moveTo(0, -radius + 5);
        ctx.lineTo(-5, -radius - 10);
        ctx.lineTo(5, -radius - 10);
        ctx.closePath();
        ctx.fillStyle = 'var(--primary-color)';
        ctx.fill();

        // Roll Göstergesi (Hareketli Üçgen - Daire üzerinde kayan)
        ctx.save();
        ctx.rotate((roll * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(-6, -radius + 10);
        ctx.lineTo(6, -radius + 10);
        ctx.closePath();
        ctx.fillStyle = 'white'; // Dönen gösterge
        ctx.fill();
        ctx.restore();

        // --- 5. Merkez Uçak Sembolü (Fixed Aircraft Symbol) ---
        // Referanstaki kırmızı şekil
        ctx.strokeStyle = 'var(--danger-color)'; // Kırmızı/Turuncu
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 0;

        ctx.beginPath();
        // Sol Kanat
        ctx.moveTo(-40, 0);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-15, 8); // Aşağı kıvrım

        // Merkez nokta
        ctx.moveTo(-5, 5);
        ctx.lineTo(0, 0); // Burun
        ctx.lineTo(5, 5);

        // Sağ Kanat
        ctx.moveTo(15, 8);
        ctx.lineTo(15, 0);
        ctx.lineTo(40, 0);

        ctx.stroke();

        // Merkez Nokta (Dot)
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();

        ctx.restore();

    }, [roll, pitch]);

    return (
        <div className="artificial-horizon-container">
            <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="horizon-canvas"
            />
            <style>{`
        .artificial-horizon-container {
            display: flex;
            align-items: center;
            justify-content: center;
            /* Arkaplanı şeffaf yapabiliriz veya koyu panel rengi verebiliriz */
            /* Referanstaki gibi koyu lacivert/siyah kutu hissi için App.jsx içinde panel rengi zaten var */
        }
      `}</style>
        </div>
    );
};

export default ArtificialHorizon;
