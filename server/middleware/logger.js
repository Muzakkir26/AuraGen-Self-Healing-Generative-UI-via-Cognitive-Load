// Logs incoming HTTP requests with timing and status while protecting sensitive data
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Hook into response finish event to calculate duration and status
  res.on("finish", function () {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });

  next();
}

module.exports = requestLogger;
