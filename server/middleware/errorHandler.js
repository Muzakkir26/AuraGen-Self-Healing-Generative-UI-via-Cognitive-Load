// Catches any unhandled error and returns a clean JSON response
function errorHandler(err, req, res, next) {
  console.error("[Server Error]", err.message);

  res.status(500).json({
    success: false,
    score: 0,
    triggerAI: false,
    stuckField: "",
    savedValue: "",
    error: "Something went wrong on the server. Please try again."
  });
}

module.exports = errorHandler;
