import { formatearFecha } from '../data/catalogo';

const tipo = (t) => (/^Aprobada/.test(t) ? 'ok' : /^Rechazada/.test(t) ? 'bad' : /Observada/.test(t) ? 'warn' : /Subsan/.test(t) ? 'info' : 'base');

// Línea de tiempo vertical con los eventos de una solicitud
export default function Historial({ items = [] }) {
  return (
    <ol className="historial">
      {[...items].reverse().map((h, i) => (
        <li key={i} className={`h-${tipo(h.texto)}`}>
          <span className="h-dot" />
          <div><strong>{h.texto}</strong><small>{formatearFecha(h.fecha)}</small></div>
        </li>
      ))}
    </ol>
  );
}
