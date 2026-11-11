// Small helpers used by every route file.

// Make an error that carries an HTTP status code: throw httpError(404, "Not found")
export const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

// Express 4 does not catch errors from async routes. This wrapper does.
export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Make user text safe to use inside a RegExp search
export const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
