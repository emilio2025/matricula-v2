import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { niveles, gradosDeNivel } from '../../data/catalogo';
import PageHeader from '../../components/PageHeader';
import Loader from '../../components/Loader';
import { useUI } from '../../context/UIContext';

export default function GestionVacantes() {
  const { secciones, cargando, actualizarSeccion, vacantesLibres } = useData();
  const [nivelId, setNivelId] = useState(niveles[0].id);
  const [aviso, setAviso] = useState('');
  const { toast } = useUI();
  const nivel = niveles.find((n) => n.id === nivelId);

  const cambiarCapacidad = (sec, valor) => {
    const n = parseInt(valor, 10);
    if (Number.isNaN(n) || n < sec.matriculados) {
      setAviso(`La capacidad de la sección ${sec.nombre} no puede ser menor a sus ${sec.matriculados} matriculados.`);
      return false;
    }
    setAviso('');
    if (n !== sec.capacidad) {
      actualizarSeccion(sec.id, { capacidad: n })
        .then(() => toast(`Capacidad de la sección ${sec.nombre} actualizada a ${n}.`))
        .catch((e) => toast(e.message, 'error'));
    }
    return true;
  };

  const totales = secciones
    .filter((s) => gradosDeNivel(nivelId).some((g) => g.id === s.gradoId))
    .reduce((acc, s) => ({ cap: acc.cap + s.capacidad, mat: acc.mat + s.matriculados }), { cap: 0, mat: 0 });

  return (
    <>
      <PageHeader titulo="Secciones y vacantes" subtitulo="Ajusta la capacidad de cada sección." />
      <div className="tabs">
        {niveles.map((n) => (
          <button key={n.id} className={nivelId === n.id ? 'active' : ''} onClick={() => setNivelId(n.id)}>{n.nombre}</button>
        ))}
      </div>
      {aviso && <div className="alert alert-warn">{aviso}</div>}
      {cargando ? <Loader /> : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>{nivel.etiquetaGrado}</th><th>Sección</th><th>Turno</th><th>Capacidad</th><th>Matriculados</th><th>Libres</th><th>Ocupación</th></tr>
            </thead>
            <tbody>
              {gradosDeNivel(nivelId).flatMap((g) =>
                secciones.filter((s) => s.gradoId === g.id).map((s) => {
                  const pct = Math.round((s.matriculados / s.capacidad) * 100);
                  return (
                    <tr key={s.id}>
                      <td>{g.nombre}</td>
                      <td>{s.nombre}</td>
                      <td>{s.turno}</td>
                      <td><input type="number" className="input-num" min={s.matriculados} defaultValue={s.capacidad} onBlur={(e) => { if (!cambiarCapacidad(s, e.target.value)) e.target.value = s.capacidad; }} aria-label={`Capacidad ${g.nombre} ${s.nombre}`} /></td>
                      <td>{s.matriculados}</td>
                      <td>{vacantesLibres(s)}</td>
                      <td><div className="bar"><span style={{ width: `${pct}%` }} className={pct >= 100 ? 'full' : pct >= 85 ? 'high' : ''} /></div><small>{pct}%</small></td>
                    </tr>
                  );
                }),
              )}
            </tbody>
            <tfoot>
              <tr><th colSpan="3">Total {nivel.nombre}</th><th>{totales.cap}</th><th>{totales.mat}</th><th>{totales.cap - totales.mat}</th><th></th></tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
