import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { getNivel, getGrado, formatearFecha } from '../../data/catalogo';
import PageHeader from '../../components/PageHeader';
import StatusBadge, { PagoBadge } from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import Icono from '../../components/Icono';

const PASOS = ['Enviada', 'En revisión', 'Resuelta'];
const pasoDe = (e) => (e === 'pendiente' ? 1 : e === 'observada' ? 1 : 2);

export default function MisSolicitudes() {
  const { usuario } = useAuth();
  const { solicitudes, secciones, cargando, institucion } = useData();

  if (cargando) return <Loader filas={3} />;
  const mias = solicitudes.filter((s) => s.usuarioId === usuario.id);
  const observadas = mias.filter((s) => s.estado === 'observada');

  return (
    <>
      <div className="welcome">
        <div>
          <span className="muted small">Matrícula {institucion.periodo}</span>
          <h1>Hola, {usuario.nombre.split(' ')[0]}</h1>
          <p className="muted">{mias.length ? `Tienes ${mias.length} solicitud${mias.length > 1 ? 'es' : ''} registrada${mias.length > 1 ? 's' : ''}.` : 'Aún no registras solicitudes este periodo.'}</p>
        </div>
        <Link to="/portal/nueva" className="btn btn-primary btn-lg"><Icono nombre="mas" tamano={18} /> Nueva matrícula</Link>
      </div>

      {observadas.length > 0 && (
        <Link to={`/portal/solicitud/${observadas[0].id}`} className="banner-warn">
          <Icono nombre="alerta" />
          <span><strong>{observadas.length === 1 ? 'Una solicitud necesita tu atención' : `${observadas.length} solicitudes necesitan tu atención`}</strong>{observadas[0].observacion}</span>
          <span className="banner-cta">Subsanar <Icono nombre="flecha" tamano={16} /></span>
        </Link>
      )}

      {mias.length === 0 ? (
        <div className="card empty">
          <Icono nombre="documento" tamano={36} />
          <h3>Empieza tu primera matrícula</h3>
          <p className="muted">Te tomará unos 5 minutos. Ten a la mano el DNI del alumno y sus documentos.</p>
          <Link to="/portal/nueva" className="btn btn-primary">Registrar matrícula</Link>
        </div>
      ) : (
        <div className="grid-cards">
          {mias.map((s) => {
            const sec = secciones.find((x) => x.id === s.seccionId);
            const p = pasoDe(s.estado);
            return (
              <Link key={s.id} to={`/portal/solicitud/${s.id}`} className="card card-hover sol-card">
                <div className="sol-card-top">
                  <span className="avatar">{s.alumno.nombres[0]}{s.alumno.apellidos[0]}</span>
                  <StatusBadge estado={s.estado} /><PagoBadge pago={s.pago} />
                </div>
                <h3>{s.alumno.nombres} {s.alumno.apellidos}</h3>
                <p className="muted">{getNivel(s.nivelId).nombre} · {getGrado(s.gradoId).nombre}</p>
                <ol className={`mini-steps est-${s.estado}`}>
                  {PASOS.map((t, i) => <li key={t} className={i <= p ? 'on' : ''}><span />{i === 2 && s.estado !== 'pendiente' && s.estado !== 'observada' ? (s.estado === 'aprobada' ? 'Aprobada' : 'Rechazada') : t}</li>)}
                </ol>
                <div className="sol-card-foot">
                  <span className="small muted">{s.id} · {formatearFecha(s.fecha)}</span>
                  {sec && <span className="small"><strong>Sección {sec.nombre}</strong> · {sec.turno}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
