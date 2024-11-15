const XLSX = require("xlsx");
const sqlite3 = require("sqlite3").verbose();

const importExcelToSQLite = (excelFilePath, dbPath) => {
  try {
    console.log("Reading Excel file...");
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("Parsed Excel data:", data);

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        return console.error("Database connection error:", err.message);
      }
      console.log("Connected to SQLite database.");
    });

    db.serialize(() => {
      console.log("Creating table...");
      db.run("DROP TABLE IF EXISTS data");
      db.run(`
        CREATE TABLE data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT,
          value REAL
        )
      `);

      console.log("Inserting data...");
      const stmt = db.prepare("INSERT INTO data (label, value) VALUES (?, ?)");
      data.forEach((row) => {
        stmt.run(row.Label, row.Value, (err) => {
          if (err) console.error("Insert error:", err.message);
        });
      });
      stmt.finalize();
      console.log("Data insertion complete.");
    });

    db.close(() => {
      console.log("Database connection closed.");
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// File paths
const excelFilePath = "./data.xlsx"; // Update this path
const dbPath = "./db/database.sqlite"; // Update this path

importExcelToSQLite(excelFilePath, dbPath);
