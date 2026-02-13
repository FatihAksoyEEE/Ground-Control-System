
import React from 'react';

/**
 * Vertical Bar Indicator (Dikey Çubuk Göstergesi)
 *
 * Bu bileşen İrtifa, Throttle (Gaz) gibi dikey değerleri göstermek için kullanılır.
 * @param {number} value - Gösterilecek değer
 * @param {number} max - Maksimum değer
 * @param {string} label - Etiket (Alt., Throttle vb.)
 * @param {string} unit - Birim (m, %, vb.)
 * @param {string} color - Bar rengi (opsiyonel)
 */
const VerticalBar = ({
    value,
    max = 100,
    label = "BAR",
    unit = "",
    color = "#00ff66"
}) => {
    // Yüzde
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className="vertical-bar-container">
            {/* Etiket Üstte */}
            <div className="bar-label">{label}</div>
            <div className="bar-unit">{unit}</div>

            {/* Bar Alanı */}
            <div className="bar-track glass-panel">
                <div
                    className="bar-fill"
                    style={{
                        height: `${percentage}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`
                    }}
                />

                {/* İşaretçiler (Ticks) */}
                {[0, 25, 50, 75, 100].map(tick => (
                    <div
                        key={tick}
                        className="bar-tick"
                        style={{ bottom: `${tick}%` }}
                    >
                        <span className="tick-val">{tick === 0 || tick === 100 ? tick : '-'}</span>
                    </div>
                ))}
            </div>

            {/* Değer Altta */}
            <div className="bar-value" style={{ color: color }}>
                {Number.isInteger(value) ? value : value.toFixed(1)}
            </div>

            <style>{`
        .vertical-bar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 50px;
          height: 200px;
          margin: 0 var(--spacing-sm);
        }
        
        .bar-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-bottom: 2px;
          text-align: center;
        }

        .bar-unit {
            font-size: 0.6rem;
            color: var(--text-dim);
            margin-bottom: var(--spacing-xs);
        }
        
        .bar-track {
          flex: 1;
          width: 20px;
          position: relative;
          background: rgba(0,0,0,0.3);
          border-radius: 10px;
          overflow: hidden; /* Taşmasın */
          display: flex;
          flex-direction: column-reverse; /* Dolum aşağıdan yukarı olsun */
        }
        
        .bar-fill {
          width: 100%;
          border-radius: 10px 10px 0 0; /* Üst köşe yumuşat */
          transition: height 0.3s ease;
        }
        
        .bar-tick {
          position: absolute;
          left: 0;
          width: 100%;
          border-bottom: 1px solid rgba(255,255,255,0.3);
          z-index: 5;
          pointer-events: none;
        }

        .tick-val {
            position: absolute;
            right: -25px;
            font-size: 0.6rem;
            color: var(--text-dim);
            bottom: -5px;
        }
        
        .bar-value {
          margin-top: var(--spacing-sm);
          font-family: var(--font-mono);
          font-weight: bold;
          font-size: 1rem;
        }
      `}</style>
        </div>
    );
};

export default VerticalBar;
