import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import PageHeader from '../../components/PageHeader';
import Icono from '../../components/Icono';

const nombreRol = { apoderado: 'Apoderado / Alumno', secretaria: 'Secretaría académica', director: 'Dirección' };

export default function Perfil() {
  const { usuario, actualizarPerfil, cambiarPassword } = useAuth();
  const { solicitudes } = useData();
  const { toast } = useUI();
  const [datos, setDatos] = useState({ nombre: usuario.nombre, email: usuario.email, telefono: usuario.telefono || '' });
  const [pass, setPass] = useState({ actual: '', nueva: '', repetir: '' });
  const [err, setErr] = useState({});
  const [notif, setNotif] = useState({ correo: true, whatsapp: false });

  const mias = solicitudes.filter((s) => s.usuarioId === usuario.id);

  const guardarDatos = async (e) => {
    e.preventDefault();
    const er = {};
    if (datos.nombre.trim().length < 5) er.nombre = 'Escribe tus nombres y apellidos.';
    if (!/^\S+@\S+\.\S+$/.test(datos.email)) er.email = 'Correo no válido.';
    if (datos.telefono && !/^9\d{8}$/.test(datos.telefono)) er.telefono = 'Celular de 9 dígitos que empiece con 9.';
    setErr(er);
    if (Object.keys(er).length) return;
    try { await actualizarPerfil(datos); toast('Datos actualizados.'); }
    catch (e2) { toast(e2.message, 'error'); }
  };

  const cambiarPass = async (e) => {
    e.preventDefault();
    const er = {};
    if (!pass.actual) er.actual = 'Escribe tu contraseña actual.';
    if (pass.nueva.length < 6) er.nueva = 'Mínimo 6 caracteres.';
    if (pass.repetir !== pass.nueva) er.repetir = 'No coincide con la nueva contraseña.';
    setErr(er);
    if (Object.keys(er).length) return;
    try {
      await cambiarPassword(pass.actual, pass.nueva);
      setPass({ actual: '', nueva: '', repetir: '' });
      toast('Contraseña actualizada.');
    } catch (e2) {
      if (e2.datos?.campo) setErr({ [e2.datos.campo]: e2.message });
      else toast(e2.message, 'error');
    }
  };

  const input = (obj, set, k, label, props = {}) => (
    <label className={`field ${err[k] ? 'has-error' : ''}`}><span>{label}</span>
      <input value={obj[k]} onChange={(e) => set({ ...obj, [k]: (props.inputMode === 'numeric' ? e.target.value.replace(/\D/g, '').slice(0, props.maxLength || 20) : e.target.value) })} {...props} />
      {err[k] && <small className="error">{err[k]}</small>}
    </label>
  );

  return (
    <>
      <PageHeader titulo="Mi perfil" subtitulo="Tus datos de acceso y preferencias." />
      <div className="perfil-grid">
        <section className="card perfil-card">
          <span className="avatar avatar-xl">{usuario.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
          <h2>{usuario.nombre}</h2>
          <span className="badge badge-blue">{nombreRol[usuario.rol]}</span>
          <dl className="resumen mt">
            <div><dt>DNI</dt><dd>{usuario.dni}</dd></div>
            <div><dt>Correo</dt><dd>{usuario.email}</dd></div>
            {usuario.rol === 'apoderado' && <div><dt>Solicitudes</dt><dd>{mias.length}</dd></div>}
          </dl>
        </section>

        <div className="stack">
          <form className="card" onSubmit={guardarDatos} noValidate>
            <h3 className="h-icon"><Icono nombre="usuario" /> Datos personales</h3>
            {input(datos, setDatos, 'nombre', 'Nombres y apellidos')}
            <div className="grid-2">
              {input(datos, setDatos, 'email', 'Correo', { type: 'email' })}
              {input(datos, setDatos, 'telefono', 'Celular', { inputMode: 'numeric', maxLength: 9, placeholder: '9XXXXXXXX' })}
            </div>
            <button className="btn btn-primary">Guardar datos</button>
          </form>

          <form className="card" onSubmit={cambiarPass} noValidate>
            <h3 className="h-icon"><Icono nombre="escudo" /> Cambiar contraseña</h3>
            {input(pass, setPass, 'actual', 'Contraseña actual', { type: 'password', autoComplete: 'current-password' })}
            <div className="grid-2">
              {input(pass, setPass, 'nueva', 'Nueva contraseña', { type: 'password', autoComplete: 'new-password' })}
              {input(pass, setPass, 'repetir', 'Repetir nueva contraseña', { type: 'password', autoComplete: 'new-password' })}
            </div>
            <button className="btn btn-primary">Actualizar contraseña</button>
          </form>

          <section className="card">
            <h3 className="h-icon"><Icono nombre="campana" /> Avisos</h3>
            <label className="switch-row">
              <span><strong>Correo electrónico</strong><small>Cuando cambie el estado de una solicitud.</small></span>
              <input type="checkbox" className="switch" checked={notif.correo} onChange={(e) => { setNotif({ ...notif, correo: e.target.checked }); toast(e.target.checked ? 'Avisos por correo activados.' : 'Avisos por correo desactivados.', 'info'); }} />
            </label>
            <label className="switch-row">
              <span><strong>WhatsApp</strong><small>Recordatorios de pagos y documentos.</small></span>
              <input type="checkbox" className="switch" checked={notif.whatsapp} onChange={(e) => { setNotif({ ...notif, whatsapp: e.target.checked }); toast(e.target.checked ? 'Avisos por WhatsApp activados.' : 'Avisos por WhatsApp desactivados.', 'info'); }} />
            </label>
          </section>
        </div>
      </div>
    </>
  );
}
