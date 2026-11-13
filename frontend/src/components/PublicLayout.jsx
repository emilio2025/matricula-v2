import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth, rutaInicioPorRol } from '../context/AuthContext';
import Icono from './Icono';

export default function PublicLayout() {
  const [abierto, setAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { usuario } = useAuth();
  const { institucion } = useData();
  const { pathname } = useLocation();
  const sobreFoto = pathname === '/' && !scrolled;
  const cerrar = () => setAbierto(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); setAbierto(false); }, [pathname]);

  return (
    <div className="public">
      <header className={`navbar ${sobreFoto ? 'navbar-clear' : ''} ${pathname === '/' ? 'navbar-fixed' : ''}`}>
        <div className="container navbar-inner">
          <Link to="/" className="brand" onClick={cerrar}>
            <span className="brand-mark">LA</span>
            <span className="brand-text">
              <strong>{institucion.nombre}</strong>
              <small>Matrícula en línea {institucion.periodo}</small>
            </span>
          </Link>
          <button className="menu-toggle" onClick={() => setAbierto(!abierto)} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={abierto}>
            <Icono nombre={abierto ? 'cerrar' : 'menu'} />
          </button>
          <nav className={`nav-links ${abierto ? 'open' : ''}`}>
            <NavLink to="/" end onClick={cerrar}>Inicio</NavLink>
            <NavLink to="/oferta" onClick={cerrar}>Niveles</NavLink>
            <NavLink to="/requisitos" onClick={cerrar}>Requisitos</NavLink>
            <NavLink to="/vacantes" onClick={cerrar}>Vacantes</NavLink>
            <NavLink to="/preguntas" onClick={cerrar}>Preguntas</NavLink>
            {usuario ? (
              <Link to={rutaInicioPorRol(usuario.rol)} className="btn btn-gold btn-sm" onClick={cerrar}>Ir a mi panel</Link>
            ) : (
              <>
                <NavLink to="/login" onClick={cerrar}>Ingresar</NavLink>
                <Link to="/registro" className="btn btn-gold btn-sm" onClick={cerrar}>Matricularme</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-mark">LA</span>
              <span className="brand-text"><strong>{institucion.nombre}</strong><small>{institucion.lema}</small></span>
            </div>
          </div>
          <ul className="footer-contact">
            <li><Icono nombre="ubicacion" tamano={18} /> {institucion.direccion}</li>
            <li><Icono nombre="telefono" tamano={18} /> {institucion.telefono}</li>
            <li><Icono nombre="correo" tamano={18} /> {institucion.email}</li>
          </ul>
          <div className="footer-credit">
            <strong>Horario de atención</strong>
            <p>Lunes a viernes de 8:00 a. m. a 4:00 p. m.<br />Sábados de 8:00 a. m. a 12:00 m.</p>
          </div>
        </div>
        <div className="container footer-bottom">© {institucion.periodo} Sistema de Matrícula en Línea · Versión 1</div>
      </footer>
    </div>
  );
}
