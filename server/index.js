// server/index.js
// Member 3 (Backend) - Updated Day 5
// Purpose: Start the server and connect all routes

var dotenv = require("dotenv");
dotenv.config();

var express = require("express");
var app = express();

var PORT = process.env.PORT || 3001;

// Allow server to read JSON data from frontend
app.use(express.json());

// Health check route (Day 2)
app.get("/health", function (req, res) {
  res.json({ status: "Server is running", port: PORT });
});

// Connect the heal-ui route (Day 5)
var healRoute = require("./routes/healRoute");
app.use("/api", healRoute);

// Start the server
app.listen(PORT, function () {
  console.log("AuraGen Backend running on port:", PORT);
});