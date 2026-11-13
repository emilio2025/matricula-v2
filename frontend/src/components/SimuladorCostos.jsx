import { useState } from 'react';
import { niveles } from '../data/catalogo';
import { useData } from '../context/DataContext';
import Icono from './Icono';

const MESES = 10; // marzo a diciembre
const DESC_HERMANO = 0.1; // 10 % en la pensión desde el segundo hijo
const DESC_ANUAL = 0.05; // 5 % si paga el año completo por adelantado

const soles = (n) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Calcula cuánto pagaría una familia en el año
export default function SimuladorCostos() {
  const { nivelCfg } = useData();
  const [hijos, setHijos] = useState([{ nivelId: 'primaria' }]);
  const [anual, setAnual] = useState(false);

  const filas = hijos.map((h, i) => {
    const n = nivelCfg(h.nivelId);
    const pension = n.pension * (i > 0 ? 1 - DESC_HERMANO : 1);
    return { ...h, nombre: n.nombre, matricula: n.costoMatricula, pension, totalPensiones: pension * MESES };
  });
  const subtotalPens = filas.reduce((a, f) => a + f.totalPensiones, 0);
  const descAnual = anual ? subtotalPens * DESC_ANUAL : 0;
  const totalMatricula = filas.reduce((a, f) => a + f.matricula, 0);
  const total = totalMatricula + subtotalPens - descAnual;

  const cambiar = (i, nivelId) => setHijos(hijos.map((h, j) => (j === i ? { nivelId } : h)));

  return (
    <div className="simulador">
      <div className="simulador-form">
        <h2><Icono nombre="calculadora" tamano={22} /> Calcula tu inversión anual</h2>
        <p className="muted">Agrega a cada hijo y elige su nivel. Desde el segundo hijo la pensión tiene 10 % de descuento.</p>
        {hijos.map((h, i) => (
          <div key={i} className="sim-row">
            <span className="sim-num">Hijo {i + 1}</span>
            <select value={h.nivelId} onChange={(e) => cambiar(i, e.target.value)} aria-label={`Nivel del hijo ${i + 1}`}>
              {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
            {hijos.length > 1 && <button type="button" className="icon-btn-light" onClick={() => setHijos(hijos.filter((_, j) => j !== i))} aria-label={`Quitar hijo ${i + 1}`}><Icono nombre="cerrar" tamano={16} /></button>}
          </div>
        ))}
        {hijos.length < 5 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHijos([...hijos, { nivelId: 'primaria' }])}><Icono nombre="mas" tamano={16} /> Agregar otro hijo</button>}
        <label className="check">
          <input type="checkbox" checked={anual} onChange={(e) => setAnual(e.target.checked)} />
          Pagar las 10 pensiones por adelantado (5 % de descuento)
        </label>
      </div>
      <div className="simulador-total">
        <span>Total del año</span>
        <strong>{soles(total)}</strong>
        <dl>
          <div><dt>Matrículas</dt><dd>{soles(totalMatricula)}</dd></div>
          <div><dt>Pensiones ({MESES} meses)</dt><dd>{soles(subtotalPens)}</dd></div>
          {anual && <div><dt>Descuento pago anual</dt><dd>− {soles(descAnual)}</dd></div>}
          <div><dt>Cuota mensual</dt><dd>{soles((subtotalPens - descAnual) / MESES)}</dd></div>
        </dl>
        <small>Montos referenciales del periodo vigente.</small>
      </div>
    </div>
  );
}
