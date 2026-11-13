import { useState } from 'react';

// Mapa de calor secuencial (un solo tono): más oscuro = más ocupado
const pasos = ['#eef2fb', '#d3dcf3', '#a9bbe6', '#7b95d3', '#4f6fbe', '#2f4ba9', '#1d3480'];
const colorDe = (p) => pasos[Math.min(pasos.length - 1, Math.floor(p * pasos.length))];
const tintaDe = (p) => (p >= 0.58 ? '#fff' : 'var(--text)');

// filas: [{ nivel, celdas: [{ id, etiqueta, ocupados, capacidad }] }]
export default function MapaOcupacion({ filas }) {
  const [tip, setTip] = useState(null);
  return (
    <div className="heatmap">
      {filas.map((f) => (
        <div key={f.nivel} className="heat-row">
          <span className="heat-label">{f.nivel}</span>
          <div className="heat-cells">
            {f.celdas.map((c) => {
              const p = c.ocupados / c.capacidad;
              return (
                <button key={c.id} className="heat-cell" style={{ background: colorDe(p), color: tintaDe(p) }}
                  onMouseEnter={() => setTip(c)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(c)} onBlur={() => setTip(null)}
                  aria-label={`${c.etiqueta}: ${c.ocupados} de ${c.capacidad} (${Math.round(p * 100)} %)`}>
                  <span className="heat-name">{c.corto}</span>
                  <span className="heat-pct">{Math.round(p * 100)}%</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="heat-foot">
        <span className="heat-tip">{tip ? `${tip.etiqueta}: ${tip.ocupados} de ${tip.capacidad} vacantes ocupadas` : 'Pasa el mouse sobre un grado para ver el detalle.'}</span>
        <span className="heat-legend" aria-hidden="true">0%{pasos.map((c) => <i key={c} style={{ background: c }} />)}100%</span>
      </div>
    </div>
  );
}
