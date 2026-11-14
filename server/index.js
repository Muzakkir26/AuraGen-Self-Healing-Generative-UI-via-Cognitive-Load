var dotenv = require("dotenv");
dotenv.config();

var express = require("express");
var app = express();

var PORT = process.env.PORT || 3001;

// Parse incoming JSON requests
app.use(express.json());

// Health check
app.get("/health", function (req, res) {
  res.json({ status: "Server is running", port: PORT });
});

// Telemetry route
var telemetryRoute = require("./routes/healRoute");
app.use("/api", telemetryRoute);

// Global error handler - must be after all routes
var errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// Start server
app.listen(PORT, function () {
  console.log("AuraGen Backend running on port:", PORT);
});
