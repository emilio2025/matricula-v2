import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Foto from '../../components/Foto';
import { fotos } from '../../data/imagenes';
import { useAuth } from '../../context/AuthContext';

const vacio = { nombre: '', dni: '', email: '', password: '', confirmar: '' };

export function validarRegistro(f) {
  const e = {};
  if (f.nombre.trim().length < 5) e.nombre = 'Ingresa tus nombres y apellidos.';
  if (!/^\d{8}$/.test(f.dni)) e.dni = 'El DNI debe tener 8 dígitos.';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Correo no válido.';
  if (f.password.length < 6) e.password = 'Mínimo 6 caracteres.';
  if (f.confirmar !== f.password) e.confirmar = 'Las contraseñas no coinciden.';
  return e;
}

export default function Registro() {
  const { registrar } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    const errs = validarRegistro(form);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    const r = await registrar(form);
    if (!r.ok) return setErrorGeneral(r.error);
    navigate('/portal/nueva');
  };

  const campo = (nombre, label, props = {}) => (
    <label className={`field ${errores[nombre] ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input value={form[nombre]} onChange={(e) => cambiar(nombre)({ target: { value: (props.inputMode === 'numeric' ? e.target.value.replace(/\D/g, '').slice(0, props.maxLength || 20) : e.target.value) } })} {...props} />
      {errores[nombre] && <small className="error">{errores[nombre]}</small>}
    </label>
  );

  return (
    <section className="auth-split">
      <div className="auth-photo">
        <Foto src={fotos.registro} alt="" />
        <p>El primer paso hacia tu próxima graduación.</p>
      </div>
      <div className="auth-side">
      <form className="card auth-card" onSubmit={enviar} noValidate>
        <h1>Crear cuenta</h1>
        <p className="muted">Padre, madre, apoderado o postulante al instituto.</p>
        {errorGeneral && <div className="alert alert-error">{errorGeneral}</div>}
        {campo('nombre', 'Nombres y apellidos')}
        {campo('dni', 'DNI', { inputMode: 'numeric', maxLength: 8 })}
        {campo('email', 'Correo electrónico', { type: 'email' })}
        <div className="grid-2">
          {campo('password', 'Contraseña', { type: 'password' })}
          {campo('confirmar', 'Confirmar contraseña', { type: 'password' })}
        </div>
        <button className="btn btn-primary btn-block">Crear cuenta y continuar</button>
        <p className="small center">¿Ya tienes cuenta? <Link to="/login">Ingresa</Link></p>
      </form>
      </div>
    </section>
  );
}
