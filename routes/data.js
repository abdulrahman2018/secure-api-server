const express = require("express");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;
const dbPath = "./db/database.sqlite";

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.user = user;
    next();
  });
};

// Get data for dashboard
router.get("/", authenticateToken, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  db.all("SELECT * FROM data", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching data" });
    }
    res.json(rows);
  });
  db.close();
});

module.exports = router;
