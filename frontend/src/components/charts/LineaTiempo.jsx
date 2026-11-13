import { useRef, useState } from 'react';

// Gráfico de área de una sola serie con línea guía y tooltip al pasar el mouse
// datos: [{ fecha: 'YYYY-MM-DD', valor: n }]
export default function LineaTiempo({ datos, alto = 240, etiqueta = 'Solicitudes' }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 720; const H = alto; const m = { t: 16, r: 16, b: 28, l: 34 };
  const iw = W - m.l - m.r; const ih = H - m.t - m.b;
  const max = Math.max(4, ...datos.map((d) => d.valor));
  const techo = Math.ceil(max / 4) * 4;
  const x = (i) => m.l + (datos.length === 1 ? iw / 2 : (i / (datos.length - 1)) * iw);
  const y = (v) => m.t + ih - (v / techo) * ih;
  const linea = datos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(datos.length - 1)},${m.t + ih} L${x(0)},${m.t + ih} Z`;
  const ticksY = [0, techo / 4, techo / 2, (3 * techo) / 4, techo];
  const paso = Math.max(1, Math.ceil(datos.length / 7));
  const fmt = (f) => { const [, mm, dd] = f.split('-'); return `${dd}/${mm}`; };

  const mover = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - m.l) / iw) * (datos.length - 1));
    setHover(Math.max(0, Math.min(datos.length - 1, i)));
  };

  const h = hover != null ? datos[hover] : null;
  const total = datos.reduce((a, d) => a + d.valor, 0);

  return (
    <div className="chart" onMouseLeave={() => setHover(null)}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="chart-svg" onMouseMove={mover} role="img" aria-label={`${etiqueta} por día: ${total} en total`}>
        <defs>
          <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--azul-500)" stopOpacity=".28" />
            <stop offset="100%" stopColor="var(--azul-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={m.l - 8} y={y(t) + 4} className="axis-text" textAnchor="end">{t}</text>
          </g>
        ))}
        {datos.map((d, i) => (i % paso === 0 || i === datos.length - 1) && (
          <text key={d.fecha} x={x(i)} y={H - 8} className="axis-text" textAnchor="middle">{fmt(d.fecha)}</text>
        ))}
        <path d={area} fill="url(#gradArea)" />
        <path d={linea} fill="none" stroke="var(--azul-700)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} className="crosshair" />
            <circle cx={x(hover)} cy={y(h.valor)} r="5" fill="var(--azul-700)" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.valor) / H) * 100}%` }}>
          <strong>{h.valor}</strong> <span>{h.valor === 1 ? etiqueta.toLowerCase().replace(/es$/, '') : etiqueta.toLowerCase()}</span>
          <small>{fmt(h.fecha)}/{h.fecha.slice(0, 4)}</small>
        </div>
      )}
    </div>
  );
}
