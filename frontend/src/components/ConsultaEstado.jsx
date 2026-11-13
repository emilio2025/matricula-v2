import { useState } from 'react';
import { api } from '../api';
import { ESTADOS_PAGO } from '../data/catalogo';
import { getNivel, getGrado } from '../data/catalogo';
import StatusBadge from './StatusBadge';
import Icono from './Icono';

// Consulta pública del estado de una solicitud por código o DNI del alumno
export default function ConsultaEstado() {
  const [buscando, setBuscando] = useState(false);
  const [valor, setValor] = useState('');
  const [resultado, setResultado] = useState(null);

  const consultar = async (e) => {
    e.preventDefault();
    const q = valor.trim().toUpperCase();
    if (!q) return setResultado({ error: 'Escribe el código de solicitud o el DNI del alumno.' });
    setBuscando(true);
    try { setResultado({ s: await api(`/solicitudes/consulta?q=${encodeURIComponent(q)}`) }); }
    catch (er) { setResultado({ error: er.message }); }
    finally { setBuscando(false); }
  };

  const s = resultado?.s;
  const seccion = s?.seccion;

  return (
    <form className="consulta" onSubmit={consultar}>
      <h2>Consulta tu matrícula</h2>
      <p>Con el código de solicitud o el DNI del alumno.</p>
      <div className="consulta-input">
        <Icono nombre="buscar" tamano={18} />
        <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="MAT-2027-0001 o 78945612" aria-label="Código o DNI" />
        <button className="btn btn-primary btn-sm" disabled={buscando}>{buscando ? 'Buscando…' : 'Consultar'}</button>
      </div>
      {resultado?.error && <p className="consulta-error">{resultado.error}</p>}
      {s && (
        <div className="consulta-result">
          <div className="consulta-result-top">
            <strong>{s.alumno.nombres} {s.alumno.apellidos}</strong>
            <StatusBadge estado={s.estado} />
          </div>
          <span>{getNivel(s.nivelId).nombre} · {getGrado(s.gradoId).nombre}</span>
          {seccion && <span>Sección {seccion.nombre}, turno {seccion.turno.toLowerCase()}</span>}
          {s.pagoEstado && <span>Pago de matrícula: <strong>{ESTADOS_PAGO[s.pagoEstado]?.texto || s.pagoEstado}</strong></span>}
          {s.estado === 'observada' && <span className="consulta-obs">{s.observacion}</span>}
        </div>
      )}
      <p className="consulta-hint">Prueba con <button type="button" className="linkish" onClick={() => setValor('MAT-2027-0001')}>MAT-2027-0001</button> o <button type="button" className="linkish" onClick={() => setValor('91234567')}>91234567</button></p>
    </form>
  );
}
