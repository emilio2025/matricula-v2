import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { getNivel, getGrado, formatearFecha, calcularEdad } from '../../data/catalogo';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import Icono from '../../components/Icono';
import Historial from '../../components/Historial';

export default function RevisarSolicitud() {
  const { id } = useParams();
  const { solicitudes, secciones, cargando, aprobarSolicitud, observarSolicitud, vacantesLibres } = useData();
  const { toast, confirmar } = useUI();
  const [accion, setAccion] = useState('');
  const [seccionId, setSeccionId] = useState('');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');

  if (cargando) return <Loader />;
  const s = solicitudes.find((x) => x.id === id);
  if (!s) return <div className="card empty"><h3>No encontramos la solicitud {id}</h3><Link to="/secretaria" className="btn btn-primary">Volver a solicitudes</Link></div>;

  const nivel = getNivel(s.nivelId);
  const seccionesGrado = secciones.filter((x) => x.gradoId === s.gradoId);
  const faltantes = nivel.requisitos.filter((r) => !s.documentos.includes(r));
  const edad = calcularEdad(s.alumno.fechaNacimiento);
  const edadOk = edad >= nivel.edadMin && edad <= nivel.edadMax;
  const seccionAsignada = secciones.find((x) => x.id === s.seccionId);
  const checks = [
    { ok: edadOk, texto: `Edad: ${edad} años`, detalle: `Rango ${nivel.edadMin}–${nivel.edadMax >= 99 ? 'más' : nivel.edadMax} años` },
    { ok: !faltantes.length, texto: `Documentos: ${s.documentos.length} de ${nivel.requisitos.length}`, detalle: faltantes.length ? `Falta: ${faltantes.join(', ')}` : 'Completos' },
    ...(nivel.requiereApoderado ? [{ ok: !!s.apoderado, texto: 'Apoderado registrado', detalle: s.apoderado ? `${s.apoderado.parentesco}: ${s.apoderado.nombres}` : 'Sin datos' }] : []),
  ];

  const elegir = (a) => {
    setAccion(a); setError(''); setSeccionId('');
    setTexto(a === 'observar' && faltantes.length ? `Falta adjuntar: ${faltantes.join(', ')}.` : a === 'rechazar' && !edadOk ? 'La edad del alumno no corresponde al grado solicitado.' : '');
  };

  const confirmarAccion = async () => {
    setError('');
    if (accion === 'aprobar') {
      if (!seccionId) return setError('Selecciona una sección.');
      const sec = secciones.find((x) => x.id === seccionId);
      const ok = await confirmar({ titulo: 'Aprobar matrícula', mensaje: `${s.alumno.nombres} ${s.alumno.apellidos} quedará matriculado(a) en ${getGrado(s.gradoId).nombre} "${sec.nombre}", turno ${sec.turno.toLowerCase()}.`, confirmar: 'Aprobar' });
      if (!ok) return;
      try { await aprobarSolicitud(s.id, seccionId); } catch (e) { return setError(e.message); }
      toast(`Matrícula aprobada: sección ${sec.nombre}, turno ${sec.turno.toLowerCase()}.`);
    } else {
      if (texto.trim().length < 10) return setError('Describe el motivo (mínimo 10 caracteres).');
      const rech = accion === 'rechazar';
      const ok = await confirmar({ titulo: rech ? 'Rechazar solicitud' : 'Observar solicitud', mensaje: rech ? 'El apoderado verá el motivo y no podrá subsanar esta solicitud.' : 'El apoderado verá la observación y podrá adjuntar lo que falta.', confirmar: rech ? 'Rechazar' : 'Enviar observación', peligro: rech });
      if (!ok) return;
      try { await observarSolicitud(s.id, texto.trim(), rech); } catch (e) { return setError(e.message); }
      toast(rech ? 'Solicitud rechazada.' : 'Observación enviada al apoderado.', rech ? 'error' : 'info');
    }
    setAccion(''); setTexto(''); setSeccionId('');
  };

  return (
    <>
      <Link to="/secretaria" className="back"><Icono nombre="atras" tamano={16} /> Volver a solicitudes</Link>

      <div className="detail-hero card">
        <span className="avatar avatar-lg">{s.alumno.nombres[0]}{s.alumno.apellidos[0]}</span>
        <div className="detail-hero-main">
          <span className="mono small muted">{s.id} · recibida el {formatearFecha(s.fecha)}</span>
          <h1>{s.alumno.nombres} {s.alumno.apellidos}</h1>
          <p className="muted">{nivel.nombre} · {getGrado(s.gradoId).nombre}{seccionAsignada && ` · Sección ${seccionAsignada.nombre} (${seccionAsignada.turno.toLowerCase()})`}</p>
        </div>
        <StatusBadge estado={s.estado} />
      </div>

      <div className="review-grid mt">
        <div className="stack">
          <section className="card">
            <h3>Verificación automática</h3>
            <ul className="verif">
              {checks.map((c) => (
                <li key={c.texto} className={c.ok ? 'ok' : 'bad'}>
                  <span className="verif-icon"><Icono nombre={c.ok ? 'check' : 'alerta'} tamano={16} /></span>
                  <span><strong>{c.texto}</strong><small>{c.detalle}</small></span>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid-2">
            <section className="card">
              <h3>Alumno</h3>
              <dl className="resumen">
                <div><dt>DNI</dt><dd>{s.alumno.dni}</dd></div>
                <div><dt>Nacimiento</dt><dd>{formatearFecha(s.alumno.fechaNacimiento)}</dd></div>
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
                  <div><dt>Celular</dt><dd><a href={`tel:${s.apoderado.telefono}`}>{s.apoderado.telefono}</a></dd></div>
                  <div><dt>Correo</dt><dd>{s.apoderado.email}</dd></div>
                </dl>
              ) : <p className="muted">Postulante mayor de edad, no requiere apoderado.</p>}
            </section>
          </div>

          <section className="card">
            <h3>Documentos adjuntos</h3>
            <ul className="doc-grid">
              {nivel.requisitos.map((r) => {
                const ok = s.documentos.includes(r);
                return (
                  <li key={r} className={ok ? 'ok' : 'missing'}>
                    <Icono nombre="documento" tamano={20} />
                    <span><strong>{r}</strong><small>{ok ? 'Adjuntado · PDF' : 'No adjuntado'}</small></span>
                    {ok && <button className="icon-btn-light" onClick={() => toast('La vista previa del archivo estará disponible en la V3.', 'info')} aria-label={`Ver ${r}`}><Icono nombre="ojo" tamano={16} /></button>}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card">
            <h3>Historial</h3>
            <Historial items={s.historial} />
          </section>
        </div>

        <aside className="card action-panel">
          <h3>Decisión</h3>
          {s.observacion && <p className={`alert ${s.estado === 'rechazada' ? 'alert-error' : 'alert-warn'} small`}>{s.observacion}</p>}

          <div className="decision">
            <button className={`decision-btn ok ${accion === 'aprobar' ? 'active' : ''}`} onClick={() => elegir('aprobar')}>
              <Icono nombre="check" tamano={18} /><span><strong>{s.estado === 'aprobada' ? 'Cambiar sección' : 'Aprobar'}</strong><small>Asignar sección y turno</small></span>
            </button>
            <button className={`decision-btn warn ${accion === 'observar' ? 'active' : ''}`} onClick={() => elegir('observar')}>
              <Icono nombre="alerta" tamano={18} /><span><strong>Observar</strong><small>Pedir que corrija o adjunte</small></span>
            </button>
            <button className={`decision-btn bad ${accion === 'rechazar' ? 'active' : ''}`} onClick={() => elegir('rechazar')}>
              <Icono nombre="cerrar" tamano={18} /><span><strong>Rechazar</strong><small>No cumple los requisitos</small></span>
            </button>
          </div>

          {accion === 'aprobar' && (
            <div className="radio-list">
              {seccionesGrado.map((sec) => {
                const libres = vacantesLibres(sec);
                const pct = Math.round((sec.matriculados / sec.capacidad) * 100);
                const off = libres === 0 && sec.id !== s.seccionId;
                return (
                  <label key={sec.id} className={`radio ${off ? 'disabled' : ''} ${seccionId === sec.id ? 'checked' : ''}`}>
                    <input type="radio" name="sec" value={sec.id} disabled={off} checked={seccionId === sec.id} onChange={() => setSeccionId(sec.id)} />
                    <span className="radio-main"><strong>Sección {sec.nombre} · {sec.turno}</strong><small>{libres} vacantes libres</small></span>
                    <span className="mini-bar"><span style={{ width: `${pct}%` }} className={pct >= 100 ? 'full' : pct >= 85 ? 'high' : ''} /></span>
                  </label>
                );
              })}
            </div>
          )}
          {(accion === 'observar' || accion === 'rechazar') && (
            <label className="field">
              <span>{accion === 'observar' ? 'Observación para el apoderado' : 'Motivo del rechazo'}</span>
              <textarea rows="4" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </label>
          )}
          {error && <small className="error">{error}</small>}
          {accion && <button className={`btn btn-block mt ${accion === 'rechazar' ? 'btn-danger' : 'btn-primary'}`} onClick={confirmarAccion}>Confirmar</button>}
          {!accion && <p className="muted small">Elige una acción para continuar.</p>}
        </aside>
      </div>
    </>
  );
}
