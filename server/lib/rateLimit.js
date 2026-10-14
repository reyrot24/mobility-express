/**
 * Limite semplice in memoria per IP. Sufficiente per una singola istanza;
 * con più istanze usare uno store condiviso (es. Redis).
 */
export function rateLimit({ windowMs, max }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) if (entry.reset <= now) hits.delete(ip);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip);
    if (!entry || entry.reset <= now) {
      hits.set(req.ip, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res
        .status(429)
        .json({ message: "Troppe richieste. Riprova tra qualche minuto." });
    }
    next();
  };
}
