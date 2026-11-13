const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let SECRETO = process.env.JWT_SECRET;
if (!SECRETO || SECRETO.length < 32) {
  SECRETO = crypto.randomBytes(48).toString('hex');
  console.warn('[aviso] JWT_SECRET no está en .env (mínimo 32 caracteres). Se usa una clave temporal: las sesiones se cierran al reiniciar.');
}

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol }, SECRETO, { expiresIn: '8h' });
}

// Exige un token válido: Authorization: Bearer <token>
function verificarToken(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  try {
    req.usuario = jwt.verify(token, SECRETO);
    next();
  } catch {
    res.status(401).json({ error: 'Tu sesión venció. Vuelve a iniciar sesión.' });
  }
}

// Solo deja pasar a los roles indicados
const permitir = (...roles) => (req, res, next) =>
  roles.includes(req.usuario?.rol) ? next() : res.status(403).json({ error: 'No tienes permiso para esta acción.' });

module.exports = { firmarToken, verificarToken, permitir };
