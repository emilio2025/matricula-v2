import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { niveles } from '../../data/catalogo';
import PageHeader from '../../components/PageHeader';
import Icono from '../../components/Icono';

// Datos de la institución, fechas del proceso y costos por nivel
export default function Configuracion() {
  const { institucion, costos, guardarConfiguracion } = useData();
  const { toast, confirmar } = useUI();
  const [inst, setInst] = useState(institucion);
  const [cost, setCost] = useState(costos);
  const [errores, setErrores] = useState({});

  const cambiado = JSON.stringify(inst) !== JSON.stringify(institucion) || JSON.stringify(cost) !== JSON.stringify(costos);

  const guardar = async (e) => {
    e.preventDefault();
    const er = {};
    if (inst.nombre.trim().length < 5) er.nombre = 'Escribe el nombre completo.';
    if (!/^\S+@\S+\.\S+$/.test(inst.email)) er.email = 'Correo no válido.';
    if (inst.fechaFinMatricula <= inst.fechaInicioMatricula) er.fechas = 'El cierre debe ser posterior al inicio.';
    Object.entries(cost).forEach(([k, v]) => { if (!(v.matricula > 0) || !(v.pension > 0)) er[k] = 'Montos mayores a 0.'; });
    setErrores(er);
    if (Object.keys(er).length) return toast('Revisa los campos marcados.', 'error');
    const ok = await confirmar({ titulo: 'Guardar configuración', mensaje: 'Los cambios se verán al instante en el portal público y en el simulador de costos.', confirmar: 'Guardar cambios' });
    if (!ok) return;
    try { await guardarConfiguracion(inst, cost); toast('Configuración guardada.'); }
    catch (e2) { toast(e2.message, 'error'); }
  };

  const campo = (k, label, props = {}) => (
    <label className={`field ${errores[k] ? 'has-error' : ''}`}><span>{label}</span>
      <input value={inst[k]} onChange={(e) => setInst({ ...inst, [k]: e.target.value })} {...props} />
      {errores[k] && <small className="error">{errores[k]}</small>}
    </label>
  );

  return (
    <form onSubmit={guardar} noValidate>
      <PageHeader titulo="Configuración del periodo" subtitulo="Lo que cambies aquí se refleja en el portal público.">
        <button type="button" className="btn btn-ghost" disabled={!cambiado} onClick={() => { setInst(institucion); setCost(costos); setErrores({}); }}>Descartar</button>
        <button className="btn btn-primary" disabled={!cambiado}>Guardar cambios</button>
      </PageHeader>

      <div className="config-grid">
        <section className="card">
          <h3 className="h-icon"><Icono nombre="escuela" /> Institución</h3>
          {campo('nombre', 'Nombre')}
          {campo('lema', 'Lema')}
          {campo('direccion', 'Dirección')}
          <div className="grid-2">
            {campo('telefono', 'Teléfono')}
            {campo('email', 'Correo', { type: 'email' })}
          </div>
        </section>

        <section className="card">
          <h3 className="h-icon"><Icono nombre="calendario" /> Proceso de matrícula</h3>
          {campo('periodo', 'Periodo académico', { inputMode: 'numeric', maxLength: 4 })}
          <div className="grid-2">
            {campo('fechaInicioMatricula', 'Inicio de inscripciones', { type: 'date' })}
            {campo('fechaFinMatricula', 'Cierre de inscripciones', { type: 'date' })}
          </div>
          {errores.fechas && <small className="error">{errores.fechas}</small>}
          <p className="muted small">La portada muestra estas fechas y el aviso "Inscripciones abiertas".</p>
        </section>

        <section className="card config-costos">
          <h3 className="h-icon"><Icono nombre="billetera" /> Costos por nivel (S/)</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nivel</th><th>Matrícula</th><th>Pensión mensual</th><th>Total anual</th></tr></thead>
              <tbody>
                {niveles.map((n) => (
                  <tr key={n.id}>
                    <td><span className="h-icon"><Icono nombre={n.icono} tamano={16} /> {n.nombre}</span></td>
                    {['matricula', 'pension'].map((k) => (
                      <td key={k}>
                        <input type="number" min="1" className={`input-num ${errores[n.id] ? 'err' : ''}`} value={cost[n.id][k]}
                          onChange={(e) => setCost({ ...cost, [n.id]: { ...cost[n.id], [k]: Number(e.target.value) } })} aria-label={`${k} ${n.nombre}`} />
                      </td>
                    ))}
                    <td><strong>S/ {(cost[n.id].matricula + cost[n.id].pension * 10).toLocaleString('es-PE')}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Total anual = matrícula + 10 pensiones (marzo a diciembre).</p>
        </section>
      </div>
    </form>
  );
}
