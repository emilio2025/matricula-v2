import { ESTADOS, ESTADOS_PAGO } from '../data/catalogo';

export default function StatusBadge({ estado }) {
  const e = ESTADOS[estado] || { texto: estado, color: 'gray' };
  return <span className={`badge badge-${e.color}`}>{e.texto}</span>;
}

// V2: estado del pago de la matrícula (solo para solicitudes aprobadas)
export function PagoBadge({ pago }) {
  if (!pago) return null;
  const e = ESTADOS_PAGO[pago.estado] || ESTADOS_PAGO.pendiente;
  return <span className={`badge badge-${e.color} chip-pago`}>{e.texto}</span>;
}
