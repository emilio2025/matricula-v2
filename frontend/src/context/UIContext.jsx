import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icono from '../components/Icono';

const UIContext = createContext(null);

// Avisos flotantes (toasts) y ventana de confirmación, disponibles en toda la app
export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialogo, setDialogo] = useState(null);
  const resolver = useRef(null);

  const toast = useCallback((mensaje, tipo = 'exito') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, mensaje, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const confirmar = useCallback((opciones) => {
    setDialogo(opciones);
    return new Promise((res) => { resolver.current = res; });
  }, []);

  const cerrar = (valor) => {
    resolver.current?.(valor);
    setDialogo(null);
  };

  useEffect(() => {
    if (!dialogo) return;
    const onKey = (e) => e.key === 'Escape' && cerrar(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogo]);

  return (
    <UIContext.Provider value={{ toast, confirmar }}>
      {children}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`}>
            <Icono nombre={t.tipo === 'error' ? 'alerta' : 'check'} tamano={18} />
            <span>{t.mensaje}</span>
          </div>
        ))}
      </div>

      {dialogo && (
        <div className="modal-backdrop" onMouseDown={() => cerrar(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" onMouseDown={(e) => e.stopPropagation()}>
            <span className={`modal-icon ${dialogo.peligro ? 'danger' : ''}`}>
              <Icono nombre={dialogo.peligro ? 'alerta' : 'check'} tamano={22} />
            </span>
            <h3 id="modal-titulo">{dialogo.titulo}</h3>
            <p className="muted">{dialogo.mensaje}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => cerrar(false)}>Cancelar</button>
              <button className={`btn ${dialogo.peligro ? 'btn-danger' : 'btn-primary'}`} onClick={() => cerrar(true)} autoFocus>
                {dialogo.confirmar || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
