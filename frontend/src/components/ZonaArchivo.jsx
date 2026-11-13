import { useRef, useState } from 'react';
import Icono from './Icono';

// Zona para arrastrar o elegir un archivo (en la V1 solo se guarda el nombre)
export default function ZonaArchivo({ etiqueta, archivo, onArchivo }) {
  const ref = useRef(null);
  const [sobre, setSobre] = useState(false);
  const tomar = (f) => f && onArchivo(f.name);

  return (
    <div
      className={`dropzone ${archivo ? 'ok' : ''} ${sobre ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => { e.preventDefault(); setSobre(false); tomar(e.dataTransfer.files[0]); }}
    >
      <span className="dropzone-icon"><Icono nombre={archivo ? 'check' : 'subir'} tamano={20} /></span>
      <span className="dropzone-text">
        <strong>{etiqueta}</strong>
        <small>{archivo || 'Arrastra el archivo aquí o elígelo · PDF o imagen'}</small>
      </span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => ref.current.click()}>{archivo ? 'Cambiar' : 'Elegir archivo'}</button>
      <input ref={ref} type="file" accept=".pdf,image/*" hidden onChange={(e) => tomar(e.target.files[0])} />
    </div>
  );
}
