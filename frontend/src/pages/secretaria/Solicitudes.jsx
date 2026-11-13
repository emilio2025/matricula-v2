import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { niveles, getNivel, getGrado, formatearFecha, ESTADOS } from '../../data/catalogo';
import PageHeader from '../../components/PageHeader';
import StatusBadge, { PagoBadge } from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import Icono from '../../components/Icono';
import DataTable from '../../components/DataTable';
import { PersonaCelda, exportarCSV } from '../director/Dashboard';

export default function Solicitudes({ soloLectura = false }) {
  const { solicitudes, cargando } = useData();
  const { toast } = useUI();
  const navigate = useNavigate();
  const [estado, setEstado] = useState(soloLectura ? 'todos' : 'pendiente');
  const [nivelId, setNivelId] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return solicitudes.filter((s) =>
      (estado === 'todos' || s.estado === estado) &&
      (nivelId === 'todos' || s.nivelId === nivelId) &&
      (!q || `${s.id} ${s.alumno.nombres} ${s.alumno.apellidos} ${s.alumno.dni}`.toLowerCase().includes(q)),
    );
  }, [solicitudes, estado, nivelId, busqueda]);

  if (cargando) return <Loader />;

  const conteo = (e) => solicitudes.filter((s) => s.estado === e).length;
  const base = soloLectura ? '/director/solicitud' : '/secretaria/solicitud';

  const exportar = () => {
    exportarCSV('solicitudes.csv', filtradas.map((s) => ({
      Codigo: s.id, Fecha: formatearFecha(s.fecha), Alumno: `${s.alumno.apellidos}, ${s.alumno.nombres}`, DNI: s.alumno.dni,
      Nivel: getNivel(s.nivelId).nombre, Grado: getGrado(s.gradoId).nombre, Estado: ESTADOS[s.estado].texto,
      Apoderado: s.apoderado?.nombres || '—', Celular: s.apoderado?.telefono || '—',
    })));
    toast(`Se descargaron ${filtradas.length} solicitudes.`);
  };

  return (
    <>
      <PageHeader titulo="Solicitudes de matrícula" subtitulo={soloLectura ? 'Consulta de todas las solicitudes del periodo.' : 'Revisa, aprueba u observa las solicitudes recibidas.'}>
        <button className="btn btn-ghost" onClick={exportar} disabled={!filtradas.length}><Icono nombre="descargar" tamano={18} /> Exportar CSV</button>
      </PageHeader>

      <div className="estado-tabs" role="tablist">
        <button role="tab" aria-selected={estado === 'todos'} className={estado === 'todos' ? 'active' : ''} onClick={() => setEstado('todos')}>
          <span>Todas</span><strong>{solicitudes.length}</strong>
        </button>
        {Object.entries(ESTADOS).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={estado === k} className={`${estado === k ? 'active' : ''} t-${v.color}`} onClick={() => setEstado(k)}>
            <span>{v.texto}s</span><strong>{conteo(k)}</strong>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Icono nombre="buscar" tamano={18} />
            <input type="search" placeholder="Buscar por código, nombre o DNI" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar solicitudes" />
          </div>
          <select value={nivelId} onChange={(e) => setNivelId(e.target.value)} aria-label="Filtrar por nivel">
            <option value="todos">Todos los niveles</option>
            {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </div>
        <DataTable
          filas={filtradas}
          ordenInicial={{ key: 'fecha', dir: 'desc' }}
          onFila={(s) => navigate(`${base}/${s.id}`)}
          vacio="No hay solicitudes con esos filtros."
          columnas={[
            { key: 'alumno', titulo: 'Alumno', valor: (s) => `${s.alumno.apellidos} ${s.alumno.nombres}`, render: (s) => <PersonaCelda s={s} /> },
            { key: 'nivel', titulo: 'Nivel / grado', valor: (s) => `${s.nivelId}${s.gradoId}`, render: (s) => <span>{getNivel(s.nivelId).nombre}<small className="muted block">{getGrado(s.gradoId).nombre}</small></span> },
            { key: 'apoderado', titulo: 'Apoderado', valor: (s) => s.apoderado?.nombres || '', render: (s) => s.apoderado ? <span>{s.apoderado.nombres.split(' ').slice(0, 2).join(' ')}<small className="muted block">{s.apoderado.telefono}</small></span> : <span className="muted">No requiere</span> },
            { key: 'fecha', titulo: 'Recibida', valor: (s) => s.fecha + s.id, render: (s) => formatearFecha(s.fecha) },
            { key: 'docs', titulo: 'Docs.', valor: (s) => s.documentos.length / getNivel(s.nivelId).requisitos.length, render: (s) => { const t = getNivel(s.nivelId).requisitos.length; return <span className={s.documentos.length < t ? 'docs-warn' : 'docs-ok'}>{s.documentos.length}/{t}</span>; } },
            { key: 'estado', titulo: 'Estado', render: (s) => <><StatusBadge estado={s.estado} /><PagoBadge pago={s.pago} /></> },
            { key: 'accion', titulo: '', ordenable: false, className: 'col-accion', render: (s) => <span className="row-action">{soloLectura || s.estado === 'aprobada' ? 'Ver' : 'Revisar'} <Icono nombre="flecha" tamano={14} /></span> },
          ]}
        />
      </div>
    </>
  );
}
