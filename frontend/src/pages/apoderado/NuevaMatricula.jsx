import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { niveles, getNivel, getGrado, gradosDeNivel, calcularEdad, institucion } from '../../data/catalogo';
import PageHeader from '../../components/PageHeader';
import Icono from '../../components/Icono';
import ZonaArchivo from '../../components/ZonaArchivo';
import { useUI } from '../../context/UIContext';

const PASOS = ['Nivel y grado', 'Datos del alumno', 'Apoderado', 'Documentos', 'Confirmar'];

export default function NuevaMatricula() {
  const { usuario } = useAuth();
  const { crearSolicitud, secciones, vacantesLibres, nivelCfg } = useData();
  const { toast } = useUI();
  const navigate = useNavigate();

  const [paso, setPaso] = useState(0);
  const [errores, setErrores] = useState({});
  const [nivelId, setNivelId] = useState('');
  const [gradoId, setGradoId] = useState('');
  const [alumno, setAlumno] = useState({ dni: '', nombres: '', apellidos: '', fechaNacimiento: '', sexo: '', direccion: '' });
  const [apoderado, setApoderado] = useState({ dni: usuario.dni || '', nombres: usuario.nombre, parentesco: '', telefono: '', email: usuario.email });
  const [documentos, setDocumentos] = useState({});
  const [acepta, setAcepta] = useState(false);

  const nivel = nivelId ? nivelCfg(nivelId) : null;
  const pasosActivos = useMemo(() => PASOS.filter((p) => p !== "Apoderado" || !nivel || nivel.requiereApoderado), [nivelId]);
  const pasoActual = pasosActivos[paso];

  // Al cambiar de nivel se reinicia el grado y los documentos
  useEffect(() => {
    setGradoId('');
    setDocumentos({});
  }, [nivelId]);

  // Si es instituto, el alumno suele ser el propio usuario: precargamos sus datos
  useEffect(() => {
    if (nivel && !nivel.requiereApoderado && !alumno.dni) {
      const [nombres, ...resto] = usuario.nombre.split(' ');
      setAlumno((a) => ({ ...a, dni: usuario.dni || '', nombres, apellidos: resto.join(' ') }));
    }
  }, [nivelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [paso]);

  const vacantesGrado = (gId) =>
    secciones.filter((s) => s.gradoId === gId).reduce((acc, s) => acc + vacantesLibres(s), 0);

  const validar = () => {
    const e = {};
    if (pasoActual === 'Nivel y grado') {
      if (!nivelId) e.nivel = 'Selecciona un nivel.';
      if (!gradoId) e.grado = 'Selecciona el grado o programa.';
      else if (vacantesGrado(gradoId) === 0) e.grado = 'Este grado ya no tiene vacantes.';
    }
    if (pasoActual === 'Datos del alumno') {
      if (!/^\d{8}$/.test(alumno.dni)) e.dni = 'El DNI debe tener 8 dígitos.';
      if (!alumno.nombres.trim()) e.nombres = 'Obligatorio.';
      if (!alumno.apellidos.trim()) e.apellidos = 'Obligatorio.';
      if (!alumno.sexo) e.sexo = 'Selecciona una opción.';
      if (!alumno.direccion.trim()) e.direccion = 'Obligatorio.';
      if (!alumno.fechaNacimiento) e.fechaNacimiento = 'Obligatorio.';
      else {
        const edad = calcularEdad(alumno.fechaNacimiento);
        if (edad < nivel.edadMin || edad > nivel.edadMax) {
          e.fechaNacimiento = `Para ${nivel.nombre} la edad debe estar entre ${nivel.edadMin} y ${nivel.edadMax >= 99 ? 'más' : nivel.edadMax} años (al 31/03). Edad calculada: ${edad}.`;
        }
      }
    }
    if (pasoActual === 'Apoderado') {
      if (!/^\d{8}$/.test(apoderado.dni)) e.apDni = 'El DNI debe tener 8 dígitos.';
      if (apoderado.dni === alumno.dni) e.apDni = 'El DNI del apoderado no puede ser el del alumno.';
      if (!apoderado.nombres.trim()) e.apNombres = 'Obligatorio.';
      if (!apoderado.parentesco) e.parentesco = 'Selecciona el parentesco.';
      if (!/^9\d{8}$/.test(apoderado.telefono)) e.telefono = 'Celular de 9 dígitos que empiece con 9.';
      if (!/^\S+@\S+\.\S+$/.test(apoderado.email)) e.apEmail = 'Correo no válido.';
    }
    if (pasoActual === 'Documentos') {
      const faltan = nivel.requisitos.filter((r) => !documentos[r]);
      if (faltan.length) e.documentos = `Faltan ${faltan.length} documento(s).`;
    }
    if (pasoActual === 'Confirmar' && !acepta) e.acepta = 'Debes aceptar la declaración jurada.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const siguiente = () => validar() && setPaso((p) => Math.min(p + 1, pasosActivos.length - 1));
  const anterior = () => { setErrores({}); setPaso((p) => Math.max(p - 1, 0)); };

  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!validar() || enviando) return;
    setEnviando(true);
    let nueva;
    try {
      nueva = await crearSolicitud({
      nivelId,
      gradoId,
      alumno,
      apoderado: nivel.requiereApoderado ? apoderado : null,
      documentos: Object.keys(documentos),
    });
    } catch (e) {
      setEnviando(false);
      return toast(e.message, 'error');
    }
    toast(`Solicitud ${nueva.id} enviada.`);
    navigate(`/portal/solicitud/${nueva.id}`, { state: { recienCreada: true } });
  };

  const input = (obj, setObj, campo, label, errKey = campo, props = {}) => (
    <label className={`field ${errores[errKey] ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input value={obj[campo]} onChange={(e) => setObj({ ...obj, [campo]: (props.inputMode === 'numeric' ? e.target.value.replace(/\D/g, '').slice(0, props.maxLength || 20) : e.target.value) })} {...props} />
      {errores[errKey] && <small className="error">{errores[errKey]}</small>}
    </label>
  );

  return (
    <>
      <PageHeader titulo="Nueva solicitud de matrícula" subtitulo={`Periodo ${institucion.periodo}`} />

      <ol className="stepper">
        {pasosActivos.map((p, i) => (
          <li key={p} className={i === paso ? 'active' : i < paso ? 'done' : ''}>
            <span>{i < paso ? '✓' : i + 1}</span>
            <small>{p}</small>
          </li>
        ))}
      </ol>

      <div className="wizard">
      <div className="card form-card">
        {pasoActual === 'Nivel y grado' && (
          <>
            <h2>¿A qué nivel postula?</h2>
            <div className="grid-4 select-cards">
              {niveles.map((n) => (
                <button type="button" key={n.id} className={`select-card ${nivelId === n.id ? 'selected' : ''}`} onClick={() => setNivelId(n.id)}>
                  <span className="nivel-tile-icon"><Icono nombre={n.icono} tamano={22} /></span>
                  <strong>{n.nombre}</strong>
                  <small className="muted">{n.edadMax >= 99 ? `+${n.edadMin} años` : `${n.edadMin}–${n.edadMax} años`}</small>
                </button>
              ))}
            </div>
            {errores.nivel && <small className="error">{errores.nivel}</small>}

            {nivel && (
              <label className={`field mt ${errores.grado ? 'has-error' : ''}`}>
                <span>{nivel.etiquetaGrado}</span>
                <select value={gradoId} onChange={(e) => setGradoId(e.target.value)}>
                  <option value="">— Selecciona —</option>
                  {gradosDeNivel(nivelId).map((g) => {
                    const v = vacantesGrado(g.id);
                    return <option key={g.id} value={g.id} disabled={v === 0}>{g.nombre} ({v === 0 ? 'sin vacantes' : `${v} vacantes`})</option>;
                  })}
                </select>
                {errores.grado && <small className="error">{errores.grado}</small>}
              </label>
            )}
          </>
        )}

        {pasoActual === 'Datos del alumno' && (
          <>
            <h2>Datos del {nivel.requiereApoderado ? 'alumno' : 'postulante'}</h2>
            <div className="grid-2">
              {input(alumno, setAlumno, 'dni', 'DNI', 'dni', { inputMode: 'numeric', maxLength: 8 })}
              {input(alumno, setAlumno, 'fechaNacimiento', 'Fecha de nacimiento', 'fechaNacimiento', { type: 'date' })}
              {input(alumno, setAlumno, 'nombres', 'Nombres')}
              {input(alumno, setAlumno, 'apellidos', 'Apellidos')}
              <label className={`field ${errores.sexo ? 'has-error' : ''}`}>
                <span>Sexo</span>
                <select value={alumno.sexo} onChange={(e) => setAlumno({ ...alumno, sexo: e.target.value })}>
                  <option value="">— Selecciona —</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
                {errores.sexo && <small className="error">{errores.sexo}</small>}
              </label>
              {input(alumno, setAlumno, 'direccion', 'Dirección')}
            </div>
          </>
        )}

        {pasoActual === 'Apoderado' && (
          <>
            <h2>Datos del apoderado</h2>
            <p className="muted small">Precargamos los datos de tu cuenta. Cámbialos si el apoderado es otra persona.</p>
            <div className="grid-2">
              {input(apoderado, setApoderado, 'dni', 'DNI', 'apDni', { inputMode: 'numeric', maxLength: 8 })}
              {input(apoderado, setApoderado, 'nombres', 'Nombres y apellidos', 'apNombres')}
              <label className={`field ${errores.parentesco ? 'has-error' : ''}`}>
                <span>Parentesco</span>
                <select value={apoderado.parentesco} onChange={(e) => setApoderado({ ...apoderado, parentesco: e.target.value })}>
                  <option value="">— Selecciona —</option>
                  {['Madre', 'Padre', 'Abuelo(a)', 'Tío(a)', 'Hermano(a)', 'Tutor legal'].map((p) => <option key={p}>{p}</option>)}
                </select>
                {errores.parentesco && <small className="error">{errores.parentesco}</small>}
              </label>
              {input(apoderado, setApoderado, 'telefono', 'Celular', 'telefono', { inputMode: 'numeric', maxLength: 9 })}
              {input(apoderado, setApoderado, 'email', 'Correo', 'apEmail', { type: 'email' })}
            </div>
          </>
        )}

        {pasoActual === 'Documentos' && (
          <>
            <h2>Documentos requeridos – {nivel.nombre}</h2>
            <p className="muted small">PDF o imagen. En esta versión el archivo no se sube al servidor, solo se registra el nombre.</p>
            <div className="stack-sm">
              {nivel.requisitos.map((r) => (
                <ZonaArchivo key={r} etiqueta={r} archivo={documentos[r]} onArchivo={(nombre) => setDocumentos({ ...documentos, [r]: nombre })} />
              ))}
            </div>
            {errores.documentos && <small className="error">{errores.documentos}</small>}
          </>
        )}

        {pasoActual === 'Confirmar' && (
          <>
            <h2>Revisa y confirma</h2>
            <dl className="resumen">
              <div><dt>Nivel</dt><dd>{nivel.nombre}</dd></div>
              <div><dt>{nivel.etiquetaGrado}</dt><dd>{getGrado(gradoId).nombre}</dd></div>
              <div><dt>Alumno</dt><dd>{alumno.nombres} {alumno.apellidos} · DNI {alumno.dni}</dd></div>
              <div><dt>Edad (al 31/03)</dt><dd>{calcularEdad(alumno.fechaNacimiento)} años</dd></div>
              {nivel.requiereApoderado && <div><dt>Apoderado</dt><dd>{apoderado.nombres} ({apoderado.parentesco}) · {apoderado.telefono}</dd></div>}
              <div><dt>Documentos</dt><dd>{Object.keys(documentos).length} de {nivel.requisitos.length}</dd></div>
              <div><dt>Matrícula a pagar</dt><dd>S/ {nivel.costoMatricula}</dd></div>
            </dl>
            <label className={`check ${errores.acepta ? 'has-error' : ''}`}>
              <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
              Declaro bajo juramento que los datos y documentos presentados son verdaderos.
            </label>
            {errores.acepta && <small className="error">{errores.acepta}</small>}
          </>
        )}

        <div className="form-actions">
          {paso > 0 && <button type="button" className="btn btn-ghost" onClick={anterior}>← Anterior</button>}
          {paso < pasosActivos.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={siguiente}>Siguiente →</button>
          ) : (
            <button type="button" className="btn btn-accent" onClick={enviar} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
          )}
        </div>
      </div>
        <aside className="card wizard-resumen">
          <h3>Resumen</h3>
          <dl className="resumen">
            <div><dt>Nivel</dt><dd>{nivel?.nombre || '—'}</dd></div>
            <div><dt>{nivel?.etiquetaGrado || 'Grado'}</dt><dd>{gradoId ? getGrado(gradoId).nombre : '—'}</dd></div>
            <div><dt>Alumno</dt><dd>{alumno.nombres ? `${alumno.nombres} ${alumno.apellidos}` : '—'}</dd></div>
            {nivel?.requiereApoderado && <div><dt>Apoderado</dt><dd>{apoderado.nombres || '—'}</dd></div>}
            <div><dt>Documentos</dt><dd>{nivel ? `${Object.keys(documentos).length}/${nivel.requisitos.length}` : '—'}</dd></div>
          </dl>
          {nivel && (
            <div className="resumen-costo">
              <span>Matrícula</span><strong>S/ {nivel.costoMatricula}</strong>
              <small>Pensión mensual S/ {nivel.pension}</small>
            </div>
          )}
          <p className="muted small"><Icono nombre="escudo" tamano={14} /> Tus datos solo los ve secretaría.</p>
        </aside>
      </div>
    </>
  );
}
