
import React, { useRef, useEffect } from 'react';

/**
 * Modern Tape Indicator (Şerit Gösterge)
 * Havacılık stili dikey kayan şerit gösterge (HUD tarzı)
 *
 * @param {number} value - Anlık Değer
 * @param {string} label - Başlık (SPD, ALT)
 * @param {string} unit - Birim (kts, ft, m)
 * @param {boolean} alignLeft - true ise sola hizalı (Hız), false ise sağa (İrtifa)
 */
const TapeGraph = ({ value, label, unit, alignLeft = true }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Temizle
        ctx.clearRect(0, 0, width, height);

        // Arkaplan (Yarı şeffaf siyah paneli)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, width, height);

        // Çerçeve
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);

        // --- Şerit Çizimi (Tape Rendering) ---
        // Her 10 birimde bir büyük çizgi, 5 birimde küçük çentik
        // Merkezde 'value' var. Yukarı ve aşağı doğru 'range' kadar görünür.
        const range = 40; // Yukarı/aşağı +/- 40 birim göster
        const pixelsPerUnit = height / (range * 2); // Toplam range 80 birim

        ctx.save();
        // Sıfır noktası canvas merkezi olsun
        ctx.translate(0, height / 2);

        // Değere göre kaydırma (value arttıkça şerit aşağı kaymalı ki büyük sayılar yukarıda kalsın)
        // Standart HUD mantığı: Yüksek değerler yukarıda.
        // Yani value 100 iken, 110 yukarıda, 90 aşağıda görünür.
        // 100 merkezde. 

        // Döngü aralığını belirle
        const startVal = Math.floor((value - range) / 10) * 10;
        const endVal = Math.ceil((value + range) / 10) * 10;

        ctx.textAlign = alignLeft ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px "Roboto Mono", monospace';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;

        for (let i = startVal; i <= endVal; i += 5) { // 5'er 5'er
            // Konum hesapla
            // i değeri value'dan büyükse (yukarıda), y negatif olmalı.
            const y = -(i - value) * pixelsPerUnit;

            // Sınır kontrolü (hafif taşma payı ile)
            if (y < -height / 2 - 10 || y > height / 2 + 10) continue;

            const isMajor = i % 10 === 0;
            const lineLen = isMajor ? 15 : 8;

            let xStart, xEnd, textX;

            if (alignLeft) {
                // Sol kenara yaslı (Hız göstergesi tipik olarak solda olur ama çentikler sağa bakar)
                // Genelde Hız solda, İrtifa sağda.
                // Hız (Sol Panel): Çentikler sağ kenardan içe doğru.
                xStart = width;
                xEnd = width - lineLen;
                textX = width - lineLen - 5;
            } else {
                // İrtifa (Sağ Panel): Çentikler sol kenardan içe doğru.
                xStart = 0;
                xEnd = lineLen;
                textX = lineLen + 5;
            }

            ctx.beginPath();
            ctx.moveTo(xStart, y);
            ctx.lineTo(xEnd, y);
            ctx.stroke();

            if (isMajor) {
                ctx.fillText(i.toString(), textX, y);
            }
        }

        ctx.restore();

        // --- Sabit Merkez Göstergesi (Current Value Box) ---
        const boxHeight = 24;
        const boxWidth = width + 10; // Biraz taşsın
        const boxY = (height - boxHeight) / 2;

        ctx.save();

        // Kutu Arkaplanı
        ctx.fillStyle = '#111';
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'black';
        // Sol veya sağ çıkıntı (ok şekli)

        if (alignLeft) {
            // Ok sağa bakıyor ->
            ctx.beginPath();
            ctx.moveTo(0, boxY);
            ctx.lineTo(width - 10, boxY);
            ctx.lineTo(width, height / 2); // Uç
            ctx.lineTo(width - 10, boxY + boxHeight);
            ctx.lineTo(0, boxY + boxHeight);
            ctx.closePath();
        } else {
            // Ok sola bakıyor <-
            ctx.beginPath();
            ctx.moveTo(width, boxY);
            ctx.lineTo(10, boxY);
            ctx.lineTo(0, height / 2); // Uç
            ctx.lineTo(10, boxY + boxHeight);
            ctx.lineTo(width, boxY + boxHeight);
            ctx.closePath();
        }

        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Değer Yazısı
        ctx.fillStyle = 'white'; // Öncelikli renk
        ctx.font = 'bold 16px "Roboto Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;

        // Tam sayı göster
        ctx.fillText(Math.round(value).toString(), width / 2, height / 2 + 1);

        ctx.restore();

        // Etiket (Üstte veya Altta)
        ctx.fillStyle = 'var(--text-secondary)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, width / 2, 15);
        ctx.fillText(unit, width / 2, height - 5);

    }, [value, alignLeft, label, unit]);

    return (
        <div className="tape-graph-container">
            <canvas ref={canvasRef} width={60} height={280} />
            <style>{`
         .tape-graph-container {
            margin: 0 5px;
            /* Hafif gölge */
            filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));
         }
       `}</style>
        </div>
    );
};

export default TapeGraph;
