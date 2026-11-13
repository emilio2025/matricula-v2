import { useState } from 'react';
import { niveles, gradosDeNivel } from '../../data/catalogo';
import { useData } from '../../context/DataContext';
import Loader from '../../components/Loader';
import Icono from '../../components/Icono';

export default function Vacantes() {
  const { secciones, cargando, vacantesLibres } = useData();
  const [nivelId, setNivelId] = useState('todos');
  const nivelesVisibles = nivelId === 'todos' ? niveles : niveles.filter((n) => n.id === nivelId);

  return (
    <>
    <section className="page-banner"><div className="container"><h1>Vacantes disponibles</h1><p>Se actualizan cada vez que secretaría aprueba una matrícula.</p></div></section>
    <section className="section container">
      <div className="toolbar">
        <label>
          Nivel{' '}
          <select value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
            <option value="todos">Todos</option>
            {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </label>
      </div>
      {cargando ? <Loader /> : nivelesVisibles.map((n) => (
        <div key={n.id} className="card mb">
          <h3 className="h-icon"><Icono nombre={n.icono} /> {n.nombre}</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{n.etiquetaGrado}</th><th>Sección</th><th>Turno</th><th>Vacantes libres</th></tr></thead>
              <tbody>
                {gradosDeNivel(n.id).flatMap((g) =>
                  secciones.filter((s) => s.gradoId === g.id).map((s) => {
                    const libres = vacantesLibres(s);
                    return (
                      <tr key={s.id}>
                        <td>{g.nombre}</td>
                        <td>{s.nombre}</td>
                        <td>{s.turno}</td>
                        <td><span className={`badge ${libres === 0 ? 'badge-red' : libres <= 5 ? 'badge-amber' : 'badge-green'}`}>{libres === 0 ? 'Completo' : libres}</span></td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
    </>
  );
}
