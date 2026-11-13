import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { getNivel, getGrado, formatearFecha, calcularEdad } from '../../data/catalogo';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import Icono from '../../components/Icono';
import Historial from '../../components/Historial';
import ZonaArchivo from '../../components/ZonaArchivo';
import PagoMatricula from '../../components/PagoMatricula';

export default function DetalleSolicitud({ vista = 'apoderado' }) {
  const { id } = useParams();
  const { state } = useLocation();
  const { usuario } = useAuth();
  const { solicitudes, secciones, cargando, subsanarSolicitud, institucion, nivelCfg } = useData();
  const { toast } = useUI();
  const [nuevosDocs, setNuevosDocs] = useState({});

  if (cargando) return <Loader filas={4} />;
  const s = solicitudes.find((x) => x.id === id);
  const volver = vista === 'director' ? '/director/solicitudes' : '/portal';
  if (!s || (vista === 'apoderado' && s.usuarioId !== usuario.id)) {
    return <div className="card empty"><h3>No encontramos la solicitud {id}</h3><Link to={volver} className="btn btn-primary">Volver</Link></div>;
  }

  const nivel = nivelCfg(s.nivelId);
  const seccion = secciones.find((x) => x.id === s.seccionId);
  const faltantes = nivel.requisitos.filter((r) => !s.documentos.includes(r));
  const puedeSubsanar = faltantes.length === 0 || faltantes.every((r) => nuevosDocs[r]);

  const subsanar = async () => {
    try {
      await subsanarSolicitud(s.id, Object.keys(nuevosDocs));
      setNuevosDocs({});
      toast('Observación subsanada. Tu solicitud volvió a revisión.');
    } catch (e) { toast(e.message, 'error'); }
  };
  const pagado = s.pago?.estado === 'pagado';

  return (
    <>
      <Link to={volver} className="back no-print"><Icono nombre="atras" tamano={16} /> Volver</Link>
      {state?.recienCreada && s.estado === 'pendiente' && (
        <div className="success-hero no-print">
          <span className="success-icon"><Icono nombre="check" tamano={28} /></span>
          <div>
            <h2>¡Solicitud enviada!</h2>
            <p>Guarda tu código <strong className="mono">{s.id}</strong>. Secretaría la revisará en un máximo de 48 horas hábiles y verás el resultado aquí.</p>
          </div>
        </div>
      )}

      <div className="detail-hero card no-print">
        <span className="avatar avatar-lg">{s.alumno.nombres[0]}{s.alumno.apellidos[0]}</span>
        <div className="detail-hero-main">
          <span className="mono small muted">{s.id} · enviada el {formatearFecha(s.fecha)}</span>
          <h1>{s.alumno.nombres} {s.alumno.apellidos}</h1>
          <p className="muted">{nivel.nombre} · {getGrado(s.gradoId).nombre}</p>
        </div>
        <StatusBadge estado={s.estado} />
      </div>

      {s.estado === 'observada' && (
        <section className="card alert-card warn mt no-print">
          <h3 className="h-icon"><Icono nombre="alerta" /> Tu solicitud tiene una observación</h3>
          <p>{s.observacion}</p>
          {vista === 'apoderado' && (
            <>
              {faltantes.map((r) => (
                <ZonaArchivo key={r} etiqueta={r} archivo={nuevosDocs[r]} onArchivo={(nombre) => setNuevosDocs({ ...nuevosDocs, [r]: nombre })} />
              ))}
              <button className="btn btn-primary mt" onClick={subsanar} disabled={!puedeSubsanar}>Enviar subsanación</button>
            </>
          )}
        </section>
      )}

      {s.estado === 'rechazada' && <div className="alert alert-error mt">Motivo del rechazo: {s.observacion}</div>}

      {s.estado === 'aprobada' && seccion && !pagado && (
        <PagoMatricula solicitud={s} nivel={nivel} seccion={seccion} soloLectura={vista !== 'apoderado'} />
      )}

      {s.estado === 'aprobada' && seccion && pagado && (
        <section className="constancia mt">
          <div className="constancia-head">
            <span className="brand-mark">LA</span>
            <div>
              <strong>{institucion.nombre}</strong>
              <small>{institucion.direccion}</small>
            </div>
            <span className="constancia-code mono">{s.id}</span>
          </div>
          <h2>Constancia de matrícula {institucion.periodo}</h2>
          <p>Se deja constancia de que el(la) estudiante:</p>
          <p className="constancia-nombre">{s.alumno.apellidos}, {s.alumno.nombres}</p>
          <dl className="constancia-datos">
            <div><dt>DNI</dt><dd>{s.alumno.dni}</dd></div>
            <div><dt>Nivel</dt><dd>{nivel.nombre}</dd></div>
            <div><dt>{nivel.etiquetaGrado}</dt><dd>{getGrado(s.gradoId).nombre}</dd></div>
            <div><dt>Sección</dt><dd>{seccion.nombre}</dd></div>
            <div><dt>Turno</dt><dd>{seccion.turno}</dd></div>
            <div><dt>Matrícula pagada</dt><dd>S/ {(s.pago.monto / 100).toFixed(2)}</dd></div>
            <div><dt>Comprobante</dt><dd className="mono">{s.pago.referencia || s.pago.cargoId}</dd></div>
          </dl>
          <p className="muted small">se encuentra matriculado(a) para el periodo académico {institucion.periodo}. Emitida el {formatearFecha(new Date().toISOString().slice(0, 10))}.</p>
          <div className="constancia-firma"><span />Secretaría académica</div>
          <button className="btn btn-primary no-print" onClick={() => window.print()}><Icono nombre="imprimir" tamano={18} /> Imprimir constancia</button>
        </section>
      )}

      <div className="detail-grid mt no-print">
        <div className="stack">
          <div className="grid-2">
            <section className="card">
              <h3>Datos del alumno</h3>
              <dl className="resumen">
                <div><dt>DNI</dt><dd>{s.alumno.dni}</dd></div>
                <div><dt>Nacimiento</dt><dd>{formatearFecha(s.alumno.fechaNacimiento)} ({calcularEdad(s.alumno.fechaNacimiento)} años)</dd></div>
                <div><dt>Sexo</dt><dd>{s.alumno.sexo === 'M' ? 'Masculino' : 'Femenino'}</dd></div>
                <div><dt>Dirección</dt><dd>{s.alumno.direccion}</dd></div>
              </dl>
            </section>
            <section className="card">
              <h3>{s.apoderado ? 'Apoderado' : 'Contacto'}</h3>
              {s.apoderado ? (
                <dl className="resumen">
                  <div><dt>Nombre</dt><dd>{s.apoderado.nombres}</dd></div>
                  <div><dt>Parentesco</dt><dd>{s.apoderado.parentesco}</dd></div>
                  <div><dt>Celular</dt><dd>{s.apoderado.telefono}</dd></div>
                  <div><dt>Correo</dt><dd>{s.apoderado.email}</dd></div>
                </dl>
              ) : <p className="muted">Postulante mayor de edad, no requiere apoderado.</p>}
            </section>
          </div>
          <section className="card">
            <h3>Documentos ({s.documentos.length}/{nivel.requisitos.length})</h3>
            <ul className="checklist">
              {nivel.requisitos.map((r) => <li key={r} className={s.documentos.includes(r) ? '' : 'missing'}>{r}</li>)}
            </ul>
          </section>
        </div>
        <section className="card">
          <h3>Seguimiento</h3>
          <Historial items={s.historial} />
        </section>
      </div>
    </>
  );
}
