const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node tools/import-state.js <path-to-json>");
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), inputPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
} catch (err) {
  console.error("Invalid JSON file.");
  process.exit(1);
}

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "rms.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id = 1), json TEXT NOT NULL, updated_at TEXT NOT NULL)"
  );
  const updated = new Date().toISOString();
  db.run(
    "INSERT OR REPLACE INTO app_state (id, json, updated_at) VALUES (1, ?, ?)",
    [JSON.stringify(payload), updated],
    (err) => {
      if (err) {
        console.error("Failed to write state:", err.message);
        process.exitCode = 1;
      } else {
        console.log("State imported into SQLite.");
      }
      db.close();
    }
  );
});
