
require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const authRoutes  = require("./routes/auth");
const roomRoutes  = require("./routes/rooms");

function createApp() {
  const app = express();

  app.use(cors({ origin: "*", methods: ["GET", 
    "POST", 
    "DELETE", 
    "PUT"] } //for frontend to make api request CORS is necessary.
  )
);
  app.use(express.json());

  
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth",  authRoutes);
  app.use("/api/rooms", roomRoutes);

  //error 404 is shown if routes dont match.
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  return app;
}

module.exports = createApp;