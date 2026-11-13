// Bloques grises animados mientras "cargan" los datos
export function Skeleton({ alto = 16, ancho = '100%', radio = 8 }) {
  return <span className="skeleton" style={{ height: alto, width: ancho, borderRadius: radio }} />;
}

export function SkeletonPanel({ filas = 5 }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Cargando">
      <div className="kpis">
        {[1, 2, 3, 4].map((i) => <div key={i} className="kpi"><Skeleton alto={12} ancho="60%" /><Skeleton alto={30} ancho="45%" /><Skeleton alto={10} ancho="70%" /></div>)}
      </div>
      <div className="card stack">
        {Array.from({ length: filas }).map((_, i) => <Skeleton key={i} alto={18} />)}
      </div>
    </div>
  );
}
