import { useState } from 'react';

// Imagen con respaldo: si la foto no carga (sin internet), queda un fondo de color
export default function Foto({ src, alt = '', className = '', ...props }) {
  const [error, setError] = useState(false);
  if (error || !src) return <div className={`foto-fallback ${className}`} role="img" aria-label={alt} />;
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setError(true)} {...props} />;
}
