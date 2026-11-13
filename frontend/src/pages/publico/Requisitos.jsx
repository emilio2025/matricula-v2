import { useState } from 'react';
import { Link } from 'react-router-dom';
import { niveles } from '../../data/catalogo';
import Icono from '../../components/Icono';

export default function Requisitos() {
  const [activo, setActivo] = useState(niveles[0].id);
  const nivel = niveles.find((n) => n.id === activo);

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Requisitos de matrícula</h1>
          <p>Ten los documentos escaneados o en foto antes de empezar.</p>
        </div>
      </section>
      <section className="section container narrow">
        <div className="tabs" role="tablist">
          {niveles.map((n) => (
            <button key={n.id} role="tab" aria-selected={activo === n.id} className={activo === n.id ? 'active' : ''} onClick={() => setActivo(n.id)}>
              <Icono nombre={n.icono} tamano={16} /> {n.nombre}
            </button>
          ))}
        </div>
        <div className="card">
          <h3>{nivel.nombre}: {nivel.requisitos.length} documentos</h3>
          <ul className="checklist">
            {nivel.requisitos.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p className="muted small">
            {nivel.requiereApoderado
              ? 'El trámite lo realiza el padre, madre o apoderado del alumno.'
              : 'El trámite lo realiza el mismo postulante (desde 16 años).'}
          </p>
          <Link to="/registro" className="btn btn-primary mt">Tengo todo, quiero matricularme</Link>
        </div>
      </section>
    </>
  );
}
