import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { niveles, formatearFecha, PREGUNTAS_FRECUENTES } from '../../data/catalogo';
import { fotos, fotoNivel } from '../../data/imagenes';
import { useData } from '../../context/DataContext';
import Foto from '../../components/Foto';
import Icono from '../../components/Icono';
import ConsultaEstado from '../../components/ConsultaEstado';

export default function Inicio() {
  const { secciones, institucion, nivelCfg } = useData();
  const totalVacantes = secciones.reduce((acc, s) => acc + Math.max(0, s.capacidad - s.matriculados), 0);

  useEffect(() => {
    document.title = `Matrícula ${institucion.periodo} | ${institucion.nombre}`;
  }, []);

  return (
    <>
      <section className="hero">
        <Foto src={fotos.portada} alt="Profesora con sus alumnos en el aula" className="hero-bg" fetchpriority="high" loading="eager" />
        <div className="hero-shade" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker">Inscripciones abiertas hasta el {formatearFecha(institucion.fechaFinMatricula)}</p>
            <h1>Matrícula {institucion.periodo}</h1>
            <p className="hero-lead">
              Inicial, primaria, secundaria e instituto. Llena la solicitud, adjunta los documentos y recibe tu sección sin hacer colas.
            </p>
            <div className="hero-actions">
              <Link to="/registro" className="btn btn-gold btn-lg">Iniciar mi matrícula</Link>
              <Link to="/requisitos" className="btn btn-glass btn-lg">Ver requisitos</Link>
            </div>
          </div>
          <ConsultaEstado />
        </div>
      </section>

      <section className="datebar">
        <div className="container datebar-grid">
          <div><span>Inicio de inscripciones</span><strong>{formatearFecha(institucion.fechaInicioMatricula)}</strong></div>
          <div><span>Cierre de inscripciones</span><strong>{formatearFecha(institucion.fechaFinMatricula)}</strong></div>
          <div><span>Inicio de clases</span><strong>16/03/{institucion.periodo}</strong></div>
          <div><span>Vacantes libres hoy</span><strong>{secciones.length ? totalVacantes : '—'}</strong></div>
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>Elige el nivel</h2>
          <Link to="/oferta" className="link-more">Ver costos y grados <Icono nombre="flecha" tamano={16} /></Link>
        </div>
        <div className="niveles-grid">
          {niveles.map((n) => (
            <Link to={`/oferta#${n.id}`} key={n.id} className="nivel-tile">
              <Foto src={fotoNivel[n.id]} alt={n.nombre} className="nivel-tile-img" />
              <div className="nivel-tile-body">
                <span className="nivel-tile-icon"><Icono nombre={n.icono} tamano={22} /></span>
                <h3>{n.nombre}</h3>
                <p>{n.edadMax >= 99 ? `Desde ${n.edadMin} años` : `De ${n.edadMin} a ${n.edadMax} años`} · Matrícula S/ {nivelCfg(n.id).costoMatricula}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section pasos-section">
        <div className="container pasos-grid">
          <div className="pasos-foto">
            <Foto src={fotos.estudiante} alt="Estudiante con su libro" />
          </div>
          <div>
            <h2>Así te matriculas</h2>
            <ol className="pasos">
              <li><strong>Crea tu cuenta</strong><p>Con tu DNI y un correo. Si el alumno es menor, la cuenta es del apoderado.</p></li>
              <li><strong>Llena la solicitud</strong><p>Elige nivel y grado y registra los datos del alumno.</p></li>
              <li><strong>Adjunta los documentos</strong><p>Cada nivel pide los suyos; los ves antes de empezar.</p></li>
              <li><strong>Recibe tu sección</strong><p>Secretaría revisa en 48 horas y te asigna grado, sección y turno.</p></li>
            </ol>
            <Link to="/registro" className="btn btn-primary">Crear mi cuenta</Link>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>Nuestro local</h2>
        </div>
        <div className="mosaico">
          <figure className="mosaico-a"><Foto src={fotos.edificio} alt="Pabellón principal" /><figcaption>Pabellón principal</figcaption></figure>
          <figure className="mosaico-b"><Foto src={fotos.losa} alt="Patio y áreas verdes" /><figcaption>Patio y áreas verdes</figcaption></figure>
          <figure className="mosaico-c"><Foto src={fotos.aula} alt="Aula" /><figcaption>Aulas iluminadas</figcaption></figure>
          <figure className="mosaico-d"><Foto src={fotos.biblioteca} alt="Biblioteca" /><figcaption>Biblioteca</figcaption></figure>
        </div>
      </section>

      <section className="section faq-home">
        <div className="container faq-grid">
          <div>
            <h2>Preguntas frecuentes</h2>
            <p className="muted">Lo que más nos consultan los padres de familia durante la matrícula.</p>
            <Link to="/preguntas" className="btn btn-ghost">Ver todas las preguntas</Link>
          </div>
          <div className="faq-list">
            {PREGUNTAS_FRECUENTES.slice(0, 3).map((f) => (
              <details key={f.p} className="faq">
                <summary>{f.p}<Icono nombre="chevron" tamano={18} /></summary>
                <p>{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <Foto src={fotos.graduacion} alt="" className="cta-bg" />
        <div className="cta-shade" />
        <div className="container cta-inner">
          <h2>Separa la vacante antes de que se complete la sección</h2>
          <Link to="/vacantes" className="btn btn-gold btn-lg">Ver vacantes por grado</Link>
        </div>
      </section>
    </>
  );
}
