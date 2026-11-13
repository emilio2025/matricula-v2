import { useState } from 'react';
import { PREGUNTAS_FRECUENTES } from '../../data/catalogo';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import Icono from '../../components/Icono';

export default function PreguntasFrecuentes() {
  const { institucion } = useData();
  const { toast } = useUI();
  const [form, setForm] = useState({ nombre: '', celular: '', mensaje: '' });
  const [errores, setErrores] = useState({});

  const enviar = (e) => {
    e.preventDefault();
    const er = {};
    if (form.nombre.trim().length < 3) er.nombre = 'Escribe tu nombre.';
    if (!/^9\d{8}$/.test(form.celular)) er.celular = 'Celular de 9 dígitos que empiece con 9.';
    if (form.mensaje.trim().length < 10) er.mensaje = 'Cuéntanos tu consulta (mínimo 10 caracteres).';
    setErrores(er);
    if (Object.keys(er).length) return;
    toast('Consulta enviada. Secretaría te llamará en horario de atención.');
    setForm({ nombre: '', celular: '', mensaje: '' });
  };

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Preguntas frecuentes</h1>
          <p>Si tu duda no está aquí, escríbenos y te llamamos.</p>
        </div>
      </section>
      <section className="section container faq-page">
        <div className="faq-list">
          {PREGUNTAS_FRECUENTES.map((f, i) => (
            <details key={f.p} className="faq" open={i === 0}>
              <summary>{f.p}<Icono nombre="chevron" tamano={18} /></summary>
              <p>{f.r}</p>
            </details>
          ))}
        </div>

        <aside className="card contacto">
          <h3>Escríbenos</h3>
          <ul className="contacto-datos">
            <li><Icono nombre="telefono" tamano={18} /> {institucion.telefono}</li>
            <li><Icono nombre="correo" tamano={18} /> {institucion.email}</li>
            <li><Icono nombre="ubicacion" tamano={18} /> {institucion.direccion}</li>
            <li><Icono nombre="reloj" tamano={18} /> Lun–Vie 8:00 a. m. – 4:00 p. m.</li>
          </ul>
          <form onSubmit={enviar} noValidate>
            <label className={`field ${errores.nombre ? 'has-error' : ''}`}><span>Nombre</span>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              {errores.nombre && <small className="error">{errores.nombre}</small>}
            </label>
            <label className={`field ${errores.celular ? 'has-error' : ''}`}><span>Celular</span>
              <input inputMode="numeric" maxLength={9} value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} />
              {errores.celular && <small className="error">{errores.celular}</small>}
            </label>
            <label className={`field ${errores.mensaje ? 'has-error' : ''}`}><span>Consulta</span>
              <textarea rows="3" value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} />
              {errores.mensaje && <small className="error">{errores.mensaje}</small>}
            </label>
            <button className="btn btn-primary btn-block">Enviar consulta</button>
          </form>
        </aside>
      </section>
    </>
  );
}
