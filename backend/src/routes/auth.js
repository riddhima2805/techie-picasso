
const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const db      = require("../db");

const router = express.Router();
const SALT_ROUNDS = 12;
const TOKEN_TTL   = "7d";

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are mandatory" });
  }
  if (password.length < 10) {
    return res.status(400).json({ 
      error: "Password must be at least 10 characters" 
    });
  }
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username.trim(), email.toLowerCase().trim(), hash]
    );
    const user  = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
    return 
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username or email already taken" });
    }
    console.error("[register]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  try {
    const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    const user = rows[0];
    if (!user) 
      return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) 
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id,
       username: user.username }, 

       process.env.JWT_SECRET, { expiresIn: TOKEN_TTL }
      );
    return res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;