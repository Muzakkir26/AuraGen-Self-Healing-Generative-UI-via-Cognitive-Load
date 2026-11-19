var dotenv = require("dotenv");
dotenv.config();

var express = require("express");
var app = express();

var PORT = process.env.PORT || 3001;

// Parse incoming JSON requests
app.use(express.json());

// Allow the Next.js dev server to call the API from the browser
var cors = require("./middleware/cors");
app.use(cors);

// Request logger middleware
var requestLogger = require("./middleware/logger");
app.use(requestLogger);

// Health check
app.get("/health", function (req, res) {
  res.json({ status: "Server is running", port: PORT });
});

// Telemetry route
var telemetryRoute = require("./routes/healRoute");
app.use("/api", telemetryRoute);

// AI generation route (Member-01): stuck field -> validated, compiled component
var generateRoute = require("./routes/generateRoute");
app.use("/api", generateRoute);

// End-to-end trigger: score the telemetry and, at score >= threshold, generate a wizard (Member-01)
var healUiRoute = require("./routes/healUiRoute");
app.use("/api", healUiRoute);

// Global error handler - must be after all routes
var errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// Start server
app.listen(PORT, function () {
  console.log("AuraGen Backend running on port:", PORT);
});
