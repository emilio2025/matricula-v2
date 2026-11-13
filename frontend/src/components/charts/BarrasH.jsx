import { useState } from 'react';

// Barras horizontales con etiqueta y valor visibles (no dependen solo del color)
// items: [{ id, etiqueta, valor, max?, texto?, color? }]
export default function BarrasH({ items, max }) {
  const [hover, setHover] = useState(null);
  const tope = max || Math.max(1, ...items.map((i) => i.max || i.valor));
  return (
    <div className="hbars">
      {items.map((it) => {
        const pct = ((it.valor / (it.max || tope)) * 100);
        return (
          <div key={it.id} className={`hbar-row ${hover === it.id ? 'is-hover' : ''}`} onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)} tabIndex={0} onFocus={() => setHover(it.id)} onBlur={() => setHover(null)}>
            <span className="hbar-label">{it.icono}{it.etiqueta}</span>
            <div className="hbar-track">
              <span className="hbar-fill" style={{ width: `${Math.max(pct, it.valor ? 2 : 0)}%`, background: it.color }} />
            </div>
            <span className="hbar-value">{it.texto ?? it.valor}</span>
          </div>
        );
      })}
    </div>
  );
}
