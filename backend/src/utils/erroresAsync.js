// Express 4 no captura los errores de funciones async: si una consulta a MySQL falla,
// la promesa rechazada se envía al manejador de errores (mensaje genérico al cliente).
const Layer = require('express/lib/router/layer');

const original = Layer.prototype.handle_request;
Layer.prototype.handle_request = function manejar(req, res, next) {
  const fn = this.handle;
  if (fn.length > 3) return original.call(this, req, res, next); // middleware de errores
  try {
    const r = fn(req, res, next);
    if (r && typeof r.catch === 'function') r.catch(next);
  } catch (e) {
    next(e);
  }
};
