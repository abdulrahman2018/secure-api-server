require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');

const SECRET_KEY = process.env.SECRET_KEY || 'your_jwt_secret';
const PORT = process.env.PORT || 6000;
const dbPath = process.env.DB_PATH || './db/database.sqlite';
const excelFilePath = process.env.EXCEL_FILE_PATH || './data.xlsx';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const initDatabase = () => {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("Error connecting to SQLite:", err.message);
    } else {
      console.log("Connected to SQLite database.");
    }
  });

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT,
        value REAL
      )
    `);

    const hashedPasswordAdmin = bcrypt.hashSync("admin123", 10);
    const hashedPasswordUser = bcrypt.hashSync("user123", 10);
    db.run(
      `INSERT OR IGNORE INTO users (username, password, role) VALUES
      ('admin', ?, 'admin'),
      ('user', ?, 'user')`,
      [hashedPasswordAdmin, hashedPasswordUser]
    );
  });

  db.close();
};

// Import Excel Data into SQLite
const importExcelToSQLite = () => {
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run("DROP TABLE IF EXISTS data");
    db.run(`
      CREATE TABLE data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT,
        value REAL
      )
    `);

    const stmt = db.prepare("INSERT INTO data (label, value) VALUES (?, ?)");
    data.forEach((row) => {
      stmt.run(row.Label, row.Value);
    });
    stmt.finalize();
    console.log("Excel data imported into SQLite.");
  });

  db.close();
};

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.user = user;
    next();
  });
};

// Routes: Authentication
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const db = new sqlite3.Database(dbPath);

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user) return res.status(401).json({ message: "Invalid credentials" });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });

  db.close();
});

// Routes: Data Access
app.get("/data", authenticateToken, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  db.all("SELECT * FROM data", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error fetching data" });
    res.json(rows);
  });
  db.close();
});

// Initialize Database and Import Data
initDatabase();
importExcelToSQLite();

// Start the Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
