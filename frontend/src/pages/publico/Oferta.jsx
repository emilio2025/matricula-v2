import { Link } from 'react-router-dom';
import { niveles, gradosDeNivel } from '../../data/catalogo';
import { fotoNivel } from '../../data/imagenes';
import Foto from '../../components/Foto';
import Icono from '../../components/Icono';
import SimuladorCostos from '../../components/SimuladorCostos';
import { useData } from '../../context/DataContext';

export default function Oferta() {
  const { nivelCfg } = useData();
  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Niveles y programas</h1>
          <p>Grados, edades y costos del periodo académico.</p>
        </div>
      </section>
      <section className="section container stack-lg">
        {niveles.map((n, i) => (
          <article key={n.id} id={n.id} className={`oferta ${i % 2 ? 'oferta-rev' : ''}`}>
            <Foto src={fotoNivel[n.id]} alt={n.nombre} className="oferta-img" />
            <div className="oferta-body">
              <span className="nivel-tile-icon"><Icono nombre={n.icono} tamano={22} /></span>
              <h2>{n.nombre}</h2>
              <p className="muted">{n.descripcion}</p>
              <div className="chips">
                {gradosDeNivel(n.id).map((g) => <span key={g.id} className="chip">{g.nombre}</span>)}
              </div>
              <dl className="oferta-datos">
                <div><dt>Matrícula</dt><dd>S/ {nivelCfg(n.id).costoMatricula}</dd></div>
                <div><dt>Pensión</dt><dd>S/ {nivelCfg(n.id).pension}<small>/mes</small></dd></div>
                <div><dt>Edad</dt><dd>{n.edadMax >= 99 ? `+${n.edadMin}` : `${n.edadMin}–${n.edadMax}`}<small> años</small></dd></div>
              </dl>
              <p className="small muted">{n.requiereApoderado ? 'El trámite lo hace el padre, la madre o el apoderado.' : 'El trámite lo hace el mismo postulante.'}</p>
            </div>
          </article>
        ))}
        <SimuladorCostos />
        <div className="center">
          <Link to="/registro" className="btn btn-primary btn-lg">Iniciar mi matrícula</Link>
        </div>
      </section>
    </>
  );
}
