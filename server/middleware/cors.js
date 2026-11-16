// Lets the Next.js app (a different origin in development) call the API from the browser.
// Allowed origins come from CORS_ORIGIN (comma-separated); default http://localhost:3000.

function cors(req, res, next) {
  var allowed = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(function (s) { return s.trim(); });
  var origin = req.headers.origin;
  if (origin && allowed.indexOf(origin) !== -1) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

module.exports = cors;
