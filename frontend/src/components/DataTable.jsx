import { useEffect, useMemo, useState } from 'react';
import Icono from './Icono';

// Tabla con orden por columna y paginación
// columnas: [{ key, titulo, render?(fila), valor?(fila), ordenable?, className? }]
export default function DataTable({ columnas, filas, porPagina = 10, vacio = 'No hay registros.', onFila, ordenInicial }) {
  const [orden, setOrden] = useState(ordenInicial || { key: null, dir: 'asc' });
  const [pagina, setPagina] = useState(1);

  useEffect(() => setPagina(1), [filas.length]);

  const ordenadas = useMemo(() => {
    if (!orden.key) return filas;
    const col = columnas.find((c) => c.key === orden.key);
    const val = col?.valor || ((f) => f[orden.key]);
    return [...filas].sort((a, b) => {
      const x = val(a); const y = val(b);
      const r = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'es');
      return orden.dir === 'asc' ? r : -r;
    });
  }, [filas, orden, columnas]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / porPagina));
  const visibles = ordenadas.slice((pagina - 1) * porPagina, pagina * porPagina);

  const ordenar = (key) => setOrden((o) => ({ key, dir: o.key === key && o.dir === 'asc' ? 'desc' : 'asc' }));

  return (
    <div className="datatable">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.key} className={c.className} aria-sort={orden.key === c.key ? (orden.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.ordenable === false ? c.titulo : (
                    <button className="th-sort" onClick={() => ordenar(c.key)}>
                      {c.titulo}
                      <span className={`sort-ind ${orden.key === c.key ? orden.dir : ''}`} aria-hidden="true" />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr key={f.id || i} className={onFila ? 'clickable' : ''} onClick={onFila ? () => onFila(f) : undefined}>
                {columnas.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(f) : f[c.key]}</td>)}
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={columnas.length} className="empty-row">{vacio}</td></tr>}
          </tbody>
        </table>
      </div>
      {ordenadas.length > porPagina && (
        <div className="pager">
          <span className="muted small">{(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, ordenadas.length)} de {ordenadas.length}</span>
          <div className="pager-btns">
            <button className="icon-btn-light" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)} aria-label="Página anterior"><Icono nombre="atras" tamano={16} /></button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`pager-num ${n === pagina ? 'active' : ''}`} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button className="icon-btn-light" disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)} aria-label="Página siguiente"><Icono nombre="flecha" tamano={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
