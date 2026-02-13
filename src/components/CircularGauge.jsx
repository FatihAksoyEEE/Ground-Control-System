
import React from 'react';

const CircularGauge = ({
    value,
    min = 0,
    max = 100,
    label = "VALUE",
    unit = "",
    color = "#00f3ff",
    size = 120
}) => {
    // Değeri sınırla
    const clampedValue = Math.min(Math.max(value, min), max);

    // Yüzde hesabı
    const percentage = (clampedValue - min) / (max - min);

    // Daire parametreleri
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Progress (Yarım daire değil tam dairenin 3/4'ü gibi olsun. 
    // Custom offset ile başlangıç bitiş ayarlanabilir ama basitlik için tam daire progress kullanalım 
    // veya daha şık durması için 270 derecelik bir gösterge yapalım)

    // 270 Derece Gösterge Ayarları
    const dashArray = circumference;
    // 0.75 (270 derece) dolu olacak max, kalanı boş
    // Ancak bizim percentage'imiz bu 0.75'lik alanın ne kadarını dolduracak.
    // Toplam stroke'un %25'i boşluk (altta).
    // Bunu SVG transform ile döndürerek ayarlayacağız.

    const offset = circumference - (percentage * circumference * 0.75);
    // Tam dairenin 0.75'i kadar alan "aktif" alandır.

    return (
        <div className="gauge-container" style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ transform: 'rotate(135deg)' }} // Başlangıç noktasını sol alta al
            >
                {/* Arkaplan dairesi (Track) - Sadece %75'i dolu olsun */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * 0.25} // %25 boşluk bırak
                    strokeLinecap="round"
                />

                {/* İlerleme dairesi (Progress) */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>

            {/* Metin Alanı (SVG dönüşünden etkilenmemesi için dışarıda absolute) */}
            <div className="gauge-text">
                <div className="gauge-value" style={{ color: color }}>
                    {/* Ondalıklı sayıysa 1 basamak, değilse tam sayı */}
                    {Number.isInteger(value) ? value : value.toFixed(1)}
                </div>
                <div className="gauge-label">{label}</div>
                <div className="gauge-unit">{unit}</div>
            </div>

            <style>{`
        .gauge-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .gauge-text {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        
        .gauge-value {
          font-family: var(--font-mono);
          font-size: 1.5rem;
          font-weight: bold;
          text-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        
        .gauge-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-top: 2px;
          letter-spacing: 1px;
        }
        
        .gauge-unit {
          font-size: 0.6rem;
          color: var(--text-dim);
        }
      `}</style>
        </div>
    );
};

export default CircularGauge;
