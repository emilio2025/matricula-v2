import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { niveles, grados, getNivel, getGrado, formatearFecha, ESTADOS } from '../../data/catalogo';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import Icono from '../../components/Icono';
import LineaTiempo from '../../components/charts/LineaTiempo';
import BarrasH from '../../components/charts/BarrasH';
import MapaOcupacion from '../../components/charts/MapaOcupacion';
import DataTable from '../../components/DataTable';

const RANGOS = [
  { id: 7, texto: 'Últimos 7 días' },
  { id: 30, texto: 'Últimos 30 días' },
  { id: 0, texto: 'Todo el periodo' },
];
const COLOR_ESTADO = { pendiente: '#c9950f', observada: 'var(--orange)', aprobada: 'var(--green)', rechazada: 'var(--red)' };

const sumarDias = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export function exportarCSV(nombre, filas) {
  const cab = Object.keys(filas[0] || {});
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [cab.map(esc).join(';'), ...filas.map((f) => cab.map((k) => esc(f[k])).join(';'))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const { solicitudes, secciones, cargando, institucion, nivelCfg } = useData();
  const [pagos, setPagos] = useState(null);
  useEffect(() => { api('/pagos').then((d) => setPagos(d.resumen)).catch(() => setPagos(null)); }, []);
  const { toast } = useUI();
  const navigate = useNavigate();
  const [rango, setRango] = useState(30);

  const hoy = new Date().toISOString().slice(0, 10);
  const desde = rango ? sumarDias(hoy, -(rango - 1)) : solicitudes.reduce((m, s) => (s.fecha < m ? s.fecha : m), hoy);
  const enRango = useMemo(() => solicitudes.filter((s) => s.fecha >= desde && s.fecha <= hoy), [solicitudes, desde, hoy]);
  const previas = useMemo(() => (rango ? solicitudes.filter((s) => s.fecha >= sumarDias(desde, -rango) && s.fecha < desde) : []), [solicitudes, desde, rango]);

  const serie = useMemo(() => {
    const dias = [];
    for (let f = desde; f <= hoy; f = sumarDias(f, 1)) dias.push({ fecha: f, valor: enRango.filter((s) => s.fecha === f).length });
    return dias;
  }, [enRango, desde, hoy]);

  if (cargando) return <Loader />;

  const nivelDeSeccion = (s) => grados.find((g) => g.id === s.gradoId).nivelId;
  const porNivel = niveles.map((n) => {
    const secs = secciones.filter((s) => nivelDeSeccion(s) === n.id);
    const capacidad = secs.reduce((a, s) => a + s.capacidad, 0);
    const matriculados = secs.reduce((a, s) => a + s.matriculados, 0);
    return { id: n.id, etiqueta: n.nombre, valor: matriculados, max: capacidad, texto: `${matriculados}/${capacidad}`, matriculados, capacidad };
  });
  const totalCap = porNivel.reduce((a, n) => a + n.capacidad, 0);
  const totalMat = porNivel.reduce((a, n) => a + n.matriculados, 0);
  const aprobadas = enRango.filter((s) => s.estado === 'aprobada').length;
  const porRevisar = solicitudes.filter((s) => s.estado === 'pendiente' || s.estado === 'observada').length;
  const ingreso = porNivel.reduce((a, n) => a + n.matriculados * nivelCfg(n.id).costoMatricula, 0);
  const delta = rango && previas.length ? Math.round(((enRango.length - previas.length) / previas.length) * 100) : null;

  const estados = Object.entries(ESTADOS).map(([k, v]) => ({ id: k, etiqueta: v.texto, valor: enRango.filter((s) => s.estado === k).length, color: COLOR_ESTADO[k] }));

  const mapa = niveles.map((n) => ({
    nivel: n.nombre,
    celdas: grados.filter((g) => g.nivelId === n.id).map((g) => {
      const secs = secciones.filter((s) => s.gradoId === g.id);
      return {
        id: g.id, etiqueta: `${n.nombre} – ${g.nombre}`,
        corto: n.id === 'inicial' ? g.nombre : g.nombre.split(' ')[0],
        ocupados: secs.reduce((a, s) => a + s.matriculados, 0), capacidad: secs.reduce((a, s) => a + s.capacidad, 0),
      };
    }),
  }));

  const exportar = () => {
    exportarCSV(`solicitudes-${desde}-a-${hoy}.csv`, enRango.map((s) => ({
      Codigo: s.id, Fecha: formatearFecha(s.fecha), Alumno: `${s.alumno.apellidos}, ${s.alumno.nombres}`, DNI: s.alumno.dni,
      Nivel: getNivel(s.nivelId).nombre, Grado: getGrado(s.gradoId).nombre, Estado: ESTADOS[s.estado].texto,
    })));
    toast(`Se descargó el reporte con ${enRango.length} solicitudes.`);
  };

  return (
    <>
      <PageHeader titulo="Dashboard de matrícula" subtitulo={`Periodo ${institucion.periodo} · actualizado al ${formatearFecha(hoy)}`}>
        <button className="btn btn-ghost" onClick={exportar}><Icono nombre="descargar" tamano={18} /> Exportar CSV</button>
      </PageHeader>

      <div className="filter-row" role="group" aria-label="Rango de fechas">
        {RANGOS.map((r) => (
          <button key={r.id} className={`seg ${rango === r.id ? 'active' : ''}`} onClick={() => setRango(r.id)}>{r.texto}</button>
        ))}
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label"><Icono nombre="bandeja" tamano={16} /> Solicitudes recibidas</span>
          <strong>{enRango.length}</strong>
          <small>{delta == null ? `desde el ${formatearFecha(desde)}` : <span className={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} % vs. periodo anterior</span>}</small>
        </div>
        <div className="kpi">
          <span className="kpi-label"><Icono nombre="check" tamano={16} /> Aprobadas en el rango</span>
          <strong>{aprobadas}</strong>
          <small>{enRango.length ? Math.round((aprobadas / enRango.length) * 100) : 0} % de las recibidas</small>
        </div>
        <div className="kpi">
          <span className="kpi-label"><Icono nombre="reloj" tamano={16} /> Por revisar</span>
          <strong>{porRevisar}</strong>
          <small>pendientes y observadas</small>
        </div>
        <div className="kpi">
          <span className="kpi-label"><Icono nombre="escuela" tamano={16} /> Ocupación global</span>
          <strong>{Math.round((totalMat / totalCap) * 100)} %</strong>
          <small>{totalMat} de {totalCap} vacantes · S/ {ingreso.toLocaleString('es-PE')} estimado en matrículas</small>
        </div>
      </div>

      {pagos && (
        <section className="card mt pagos-resumen">
          <h3><Icono nombre="billetera" tamano={18} /> Pagos de matrícula</h3>
          <div className="pagos-resumen-grid">
            <div><strong>S/ {(pagos.recaudado / 100).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong><small>recaudado</small></div>
            <div><strong>{pagos.enLinea}</strong><small>pagados en línea</small></div>
            <div><strong>{pagos.pagados - pagos.enLinea}</strong><small>pagados en caja</small></div>
            <div><strong>{pagos.pendientes}</strong><small>pendientes de pago</small></div>
            <div><strong>{pagos.porConfirmar}</strong><small>por confirmar</small></div>
          </div>
        </section>
      )}

      <div className="dash-grid mt">
        <section className="card dash-wide">
          <div className="card-head"><h3>Solicitudes recibidas por día</h3><span className="muted small">{RANGOS.find((r) => r.id === rango).texto}</span></div>
          <LineaTiempo datos={serie} />
        </section>
        <section className="card">
          <div className="card-head"><h3>Estado de las solicitudes</h3></div>
          <BarrasH items={estados} />
          <p className="muted small mt">Del rango seleccionado. Haz clic en <Link to="/director/solicitudes">Solicitudes</Link> para ver el detalle.</p>
        </section>
      </div>

      <div className="dash-grid dash-grid-rev mt">
        <section className="card">
          <div className="card-head"><h3>Ocupación por nivel</h3></div>
          <BarrasH items={porNivel} />
        </section>
        <section className="card dash-wide">
          <div className="card-head"><h3>Mapa de ocupación por grado</h3><Link to="/director/nominas" className="small">Ver nóminas</Link></div>
          <MapaOcupacion filas={mapa} />
        </section>
      </div>

      <section className="card mt">
        <div className="card-head"><h3>Últimas solicitudes</h3><Link to="/director/solicitudes" className="small">Ver todas</Link></div>
        <DataTable
          porPagina={6}
          filas={[...enRango].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))}
          onFila={(s) => navigate(`/director/solicitud/${s.id}`)}
          columnas={[
            { key: 'alumno', titulo: 'Alumno', valor: (s) => s.alumno.apellidos, render: (s) => <PersonaCelda s={s} /> },
            { key: 'nivel', titulo: 'Nivel / grado', valor: (s) => s.nivelId, render: (s) => `${getNivel(s.nivelId).nombre} · ${getGrado(s.gradoId).nombre}` },
            { key: 'fecha', titulo: 'Fecha', render: (s) => formatearFecha(s.fecha) },
            { key: 'estado', titulo: 'Estado', render: (s) => <StatusBadge estado={s.estado} /> },
          ]}
        />
      </section>
    </>
  );
}

export function PersonaCelda({ s }) {
  const ini = `${s.alumno.nombres[0]}${s.alumno.apellidos[0]}`;
  return (
    <span className="cell-person">
      <span className="avatar">{ini}</span>
      <span><strong>{s.alumno.nombres} {s.alumno.apellidos}</strong><small>{s.id} · DNI {s.alumno.dni}</small></span>
    </span>
  );
}
