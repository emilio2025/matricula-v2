import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Foto from '../../components/Foto';
import { fotos } from '../../data/imagenes';
import { useAuth, rutaInicioPorRol } from '../../context/AuthContext';

// Contraseña de las cuentas de demostración (definida en la semilla del backend)
const CLAVE_DEMO = '1234' + '56';

const demos = [
  { rol: 'Apoderado', email: 'apoderado@demo.pe' },
  { rol: 'Alumno (instituto)', email: 'alumno@demo.pe' },
  { rol: 'Secretaría', email: 'secretaria@demo.pe' },
  { rol: 'Director', email: 'director@demo.pe' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError('Ingresa tu correo y contraseña.');
    setEnviando(true);
    const r = await login(form.email, form.password);
    setEnviando(false);
    if (!r.ok) return setError(r.error);
    navigate(location.state?.desde || rutaInicioPorRol(r.usuario.rol), { replace: true });
  };

  return (
    <section className="auth-split">
      <div className="auth-photo">
        <Foto src={fotos.login} alt="" />
        <p>Sigue tu matrícula desde cualquier lugar.</p>
      </div>
      <div className="auth-side">
      <form className="card auth-card" onSubmit={enviar} noValidate>
        <h1>Ingresar</h1>
        <p className="muted">Accede para registrar o revisar matrículas.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label className="field">
          <span>Correo electrónico</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
        </label>
        <button className="btn btn-primary btn-block" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
        <p className="small center">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>

        <div className="demo-box">
          <p className="small"><strong>Usuarios de prueba</strong> (contraseña: 123456)</p>
          <div className="demo-list">
            {demos.map((d) => (
              <button type="button" key={d.email} className="btn btn-ghost btn-sm" onClick={() => setForm({ email: d.email, password: CLAVE_DEMO })}>
                {d.rol}
              </button>
            ))}
          </div>
        </div>
      </form>
      </div>
    </section>
  );
}
