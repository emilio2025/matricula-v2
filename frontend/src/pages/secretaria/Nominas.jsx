import { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { niveles, gradosDeNivel, getGrado, getNivel, calcularEdad } from '../../data/catalogo';
import PageHeader from '../../components/PageHeader';
import Loader from '../../components/Loader';
import Icono from '../../components/Icono';
import { exportarCSV } from '../director/Dashboard';

// Lista de alumnos matriculados por sección (los aprobados en línea)
export default function Nominas() {
  const { solicitudes, secciones, cargando, institucion } = useData();
  const { toast } = useUI();
  const [nivelId, setNivelId] = useState('primaria');
  const [gradoId, setGradoId] = useState('pri-1');
  const grs = gradosDeNivel(nivelId);
  const secs = secciones.filter((s) => s.gradoId === gradoId);
  const [secId, setSecId] = useState(null);
  const seccion = secs.find((s) => s.id === secId) || secs[0];

  const alumnos = useMemo(() => solicitudes
    .filter((s) => s.estado === 'aprobada' && s.seccionId === seccion?.id)
    .sort((a, b) => a.alumno.apellidos.localeCompare(b.alumno.apellidos, 'es')), [solicitudes, seccion]);

  if (cargando) return <Loader />;

  const cambiarNivel = (id) => { setNivelId(id); setGradoId(gradosDeNivel(id)[0].id); setSecId(null); };

  const exportar = () => {
    exportarCSV(`nomina-${seccion.id}.csv`, alumnos.map((s, i) => ({
      N: i + 1, Apellidos: s.alumno.apellidos, Nombres: s.alumno.nombres, DNI: s.alumno.dni,
      Edad: calcularEdad(s.alumno.fechaNacimiento), Apoderado: s.apoderado?.nombres || '—', Celular: s.apoderado?.telefono || '—',
    })));
    toast('Nómina descargada.');
  };

  return (
    <>
      <PageHeader titulo="Nóminas por sección" subtitulo="Alumnos matriculados en línea en cada sección.">
        <button className="btn btn-ghost no-print" onClick={exportar} disabled={!alumnos.length}><Icono nombre="descargar" tamano={18} /> CSV</button>
        <button className="btn btn-primary no-print" onClick={() => window.print()} disabled={!alumnos.length}><Icono nombre="imprimir" tamano={18} /> Imprimir</button>
      </PageHeader>

      <div className="tabs no-print">
        {niveles.map((n) => <button key={n.id} className={nivelId === n.id ? 'active' : ''} onClick={() => cambiarNivel(n.id)}><Icono nombre={n.icono} tamano={16} /> {n.nombre}</button>)}
      </div>

      <div className="nomina-layout">
        <aside className="card nomina-grados no-print">
          {grs.map((g) => (
            <div key={g.id}>
              <button className={`grado-btn ${gradoId === g.id ? 'active' : ''}`} onClick={() => { setGradoId(g.id); setSecId(null); }}>{g.nombre}</button>
              {gradoId === g.id && (
                <div className="sec-pills">
                  {secciones.filter((s) => s.gradoId === g.id).map((s) => (
                    <button key={s.id} className={`sec-pill ${seccion?.id === s.id ? 'active' : ''}`} onClick={() => setSecId(s.id)}>
                      {s.nombre} · {s.turno}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </aside>

        <section className="card nomina-hoja">
          <header className="nomina-head">
            <div>
              <span className="muted small">{institucion.nombre} · Periodo {institucion.periodo}</span>
              <h2>{getNivel(nivelId).nombre} · {getGrado(gradoId).nombre} · Sección {seccion?.nombre}</h2>
              <span className="muted small">Turno {seccion?.turno.toLowerCase()} · {seccion?.matriculados} de {seccion?.capacidad} vacantes ocupadas en total</span>
            </div>
            <span className="nomina-count"><strong>{alumnos.length}</strong> matriculados en línea</span>
          </header>
          {alumnos.length === 0 ? (
            <div className="empty">
              <Icono nombre="usuarios" tamano={32} />
              <p>Aún no hay alumnos aprobados en línea para esta sección.</p>
              <small className="muted">Cuando secretaría apruebe una solicitud asignando esta sección, el alumno aparecerá aquí.</small>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>N.°</th><th>Apellidos y nombres</th><th>DNI</th><th>Edad</th><th>Apoderado</th><th>Celular</th></tr></thead>
                <tbody>
                  {alumnos.map((s, i) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td><strong>{s.alumno.apellidos}</strong>, {s.alumno.nombres}</td>
                      <td>{s.alumno.dni}</td>
                      <td>{calcularEdad(s.alumno.fechaNacimiento)}</td>
                      <td>{s.apoderado?.nombres || '—'}</td>
                      <td>{s.apoderado?.telefono || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
