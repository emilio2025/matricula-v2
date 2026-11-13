import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { getNivel, getGrado } from '../data/catalogo';
import Icono from './Icono';

const menus = {
  apoderado: [
    { grupo: 'Matrícula', items: [
      { to: '/portal', texto: 'Mis solicitudes', icono: 'lista', end: true },
      { to: '/portal/nueva', texto: 'Nueva matrícula', icono: 'mas' },
    ] },
    { grupo: 'Cuenta', items: [{ to: '/portal/perfil', texto: 'Mi perfil', icono: 'usuario' }] },
  ],
  secretaria: [
    { grupo: 'Gestión', items: [
      { to: '/secretaria', texto: 'Solicitudes', icono: 'bandeja', end: true, contador: true },
      { to: '/secretaria/vacantes', texto: 'Secciones y vacantes', icono: 'escuela' },
      { to: '/secretaria/nominas', texto: 'Nóminas por sección', icono: 'usuarios' },
    ] },
    { grupo: 'Cuenta', items: [{ to: '/secretaria/perfil', texto: 'Mi perfil', icono: 'usuario' }] },
  ],
  director: [
    { grupo: 'Dirección', items: [
      { to: '/director', texto: 'Dashboard', icono: 'grafico', end: true },
      { to: '/director/solicitudes', texto: 'Solicitudes', icono: 'lista' },
      { to: '/director/nominas', texto: 'Nóminas por sección', icono: 'usuarios' },
      { to: '/director/configuracion', texto: 'Configuración', icono: 'ajustes' },
    ] },
    { grupo: 'Cuenta', items: [{ to: '/director/perfil', texto: 'Mi perfil', icono: 'usuario' }] },
  ],
};

const nombreRol = { apoderado: 'Apoderado / Alumno', secretaria: 'Secretaría académica', director: 'Dirección' };

const migas = {
  portal: 'Mis solicitudes', nueva: 'Nueva matrícula', solicitud: 'Detalle', perfil: 'Mi perfil',
  secretaria: 'Solicitudes', vacantes: 'Secciones y vacantes', nominas: 'Nóminas por sección',
  director: 'Dashboard', solicitudes: 'Solicitudes', configuracion: 'Configuración',
};

function useClickFuera(ref, cerrar) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && cerrar();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cerrar]);
}

function notificacionesPara(usuario, solicitudes, secciones) {
  if (usuario.rol === 'apoderado') {
    return solicitudes
      .filter((s) => s.usuarioId === usuario.id && s.estado !== 'pendiente')
      .map((s) => ({
        id: s.id, to: `/portal/solicitud/${s.id}`, tipo: s.estado,
        titulo: s.estado === 'aprobada' ? (s.pago?.estado === 'pagado' ? `Matrícula pagada: ${s.alumno.nombres}` : `Aprobada, falta pagar: ${s.alumno.nombres}`) : s.estado === 'observada' ? `Solicitud observada: ${s.alumno.nombres}` : `Solicitud rechazada: ${s.alumno.nombres}`,
        detalle: s.estado === 'aprobada' ? (s.pago?.estado === 'pagado' ? 'Ya puedes imprimir la constancia.' : 'Paga la matrícula en línea para obtener tu constancia.') : s.observacion,
      }));
  }
  if (usuario.rol === 'secretaria') {
    return solicitudes.filter((s) => s.estado === 'pendiente').slice(0, 6).map((s) => ({
      id: s.id, to: `/secretaria/solicitud/${s.id}`, tipo: 'pendiente',
      titulo: `Nueva solicitud: ${s.alumno.nombres} ${s.alumno.apellidos.split(' ')[0]}`,
      detalle: `${getNivel(s.nivelId).nombre} · ${getGrado(s.gradoId).nombre}`,
    }));
  }
  return secciones
    .filter((s) => s.matriculados / s.capacidad >= 0.9)
    .slice(0, 6)
    .map((s) => ({
      id: s.id, to: '/director/nominas', tipo: 'observada',
      titulo: `${getGrado(s.gradoId).nombre} "${s.nombre}" casi llena`,
      detalle: `${s.matriculados} de ${s.capacidad} vacantes ocupadas · turno ${s.turno.toLowerCase()}`,
    }));
}

export default function PanelLayout() {
  const { usuario, logout } = useAuth();
  const { solicitudes, secciones, institucion } = useData();
  const { confirmar } = useUI();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [panel, setPanel] = useState(null); // 'notif' | 'user' | null
  const refNotif = useRef(null);
  const refUser = useRef(null);
  useClickFuera(refNotif, () => panel === 'notif' && setPanel(null));
  useClickFuera(refUser, () => panel === 'user' && setPanel(null));

  useEffect(() => { setAbierto(false); setPanel(null); window.scrollTo(0, 0); }, [pathname]);

  const salir = async () => {
    const ok = await confirmar({ titulo: '¿Cerrar sesión?', mensaje: 'Volverás al portal público.', confirmar: 'Cerrar sesión' });
    if (ok) { logout(); navigate('/'); }
  };

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').length;
  const notifs = notificacionesPara(usuario, solicitudes, secciones);
  const partes = pathname.split('/').filter(Boolean);
  const base = `/${partes[0]}`;
  const iniciales = usuario.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <div className="panel">
      <aside className={`sidebar ${abierto ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">LA</span>
          <div>
            <strong>{institucion.nombre.replace('Institución Educativa ', 'I.E. ')}</strong>
            <small>Matrícula {institucion.periodo}</small>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menú del panel">
          {menus[usuario.rol].map((g) => (
            <div key={g.grupo} className="sidebar-group">
              <span className="sidebar-group-title">{g.grupo}</span>
              {g.items.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.end}>
                  <Icono nombre={m.icono} tamano={18} />
                  <span>{m.texto}</span>
                  {m.contador && pendientes > 0 && <span className="nav-count">{pendientes}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <Link to="/" className="sidebar-public"><Icono nombre="globo" tamano={18} /> Ver portal público</Link>
      </aside>
      {abierto && <div className="backdrop" onClick={() => setAbierto(false)} />}

      <div className="panel-main">
        <header className="topbar">
          <button className="topbar-icon panel-toggle" onClick={() => setAbierto(true)} aria-label="Abrir menú"><Icono nombre="menu" /></button>

          <nav className="breadcrumb" aria-label="Ruta">
            <span className="crumb-role">{nombreRol[usuario.rol]}</span>
            {partes.map((p, i) => {
              const label = migas[p] || (p.startsWith('MAT-') ? p : null);
              if (!label) return null;
              const to = '/' + partes.slice(0, i + 1).join('/');
              const last = i === partes.length - 1;
              return (
                <span key={to} className="crumb">
                  <Icono nombre="flecha" tamano={12} />
                  {last ? <span aria-current="page">{label}</span> : <Link to={p === 'solicitud' ? base : to}>{label}</Link>}
                </span>
              );
            })}
          </nav>

          <div className="topbar-actions">
            <div className="dropdown" ref={refNotif}>
              <button className="topbar-icon" onClick={() => setPanel(panel === 'notif' ? null : 'notif')} aria-label={`Notificaciones (${notifs.length})`} aria-expanded={panel === 'notif'}>
                <Icono nombre="campana" />
                {notifs.length > 0 && <span className="dot">{notifs.length}</span>}
              </button>
              {panel === 'notif' && (
                <div className="dropdown-menu notif-menu">
                  <div className="dropdown-head">Notificaciones</div>
                  {notifs.length === 0 && <p className="dropdown-empty">No tienes notificaciones nuevas.</p>}
                  {notifs.map((n) => (
                    <Link key={n.id} to={n.to} className="notif-item">
                      <span className={`notif-dot dot-${n.tipo}`} />
                      <span><strong>{n.titulo}</strong><small>{n.detalle}</small></span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="dropdown" ref={refUser}>
              <button className="user-chip" onClick={() => setPanel(panel === 'user' ? null : 'user')} aria-expanded={panel === 'user'}>
                <span className="avatar">{iniciales}</span>
                <span className="user-chip-text"><strong>{usuario.nombre.split(' ').slice(0, 2).join(' ')}</strong><small>{nombreRol[usuario.rol]}</small></span>
                <Icono nombre="chevron" tamano={16} />
              </button>
              {panel === 'user' && (
                <div className="dropdown-menu user-menu">
                  <div className="dropdown-head">{usuario.email}</div>
                  <Link to={`${base}/perfil`} className="dropdown-item"><Icono nombre="usuario" tamano={16} /> Mi perfil</Link>
                  <Link to="/" className="dropdown-item"><Icono nombre="globo" tamano={16} /> Portal público</Link>
                  <button className="dropdown-item danger" onClick={salir}><Icono nombre="salir" tamano={16} /> Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="panel-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
