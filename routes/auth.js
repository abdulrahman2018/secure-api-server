const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;

// In-memory user database
const users = [
  { id: 1, username: "admin", password: bcrypt.hashSync("admin123", 10), role: "admin" },
  { id: 2, username: "user", password: bcrypt.hashSync("user123", 10), role: "user" },
];

// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token });
});

module.exports = router;
