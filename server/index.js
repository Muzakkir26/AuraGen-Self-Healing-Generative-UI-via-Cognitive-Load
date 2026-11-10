// server/index.js
// Purpose: Start the backend server

// Load secret values from .env file
const dotenv = require("dotenv");
dotenv.config();

// Import express to create the server
const express = require("express");
const app = express();

// Read the PORT number from .env (or use 3001 as backup)
const PORT = process.env.PORT || 3001;

// Allow server to read JSON data from frontend
app.use(express.json());

// Health check route - to test if server is alive
app.get("/health", function (req, res) {
  res.json({
    status: "Server is running",
    port: PORT
  });
});

// Start the server
app.listen(PORT, function () {
  console.log("AuraGen Backend is running on port:", PORT);
});