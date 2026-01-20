const path = require("path");
const fs = require("fs");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "rms.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id = 1), json TEXT NOT NULL, updated_at TEXT NOT NULL)"
  );
});

app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/state", (req, res) => {
  db.get("SELECT json, updated_at FROM app_state WHERE id = 1", (err, row) => {
    if (err) {
      res.status(500).json({ error: "db_read_failed" });
      return;
    }
    if (!row) {
      res.status(204).end();
      return;
    }
    try {
      res.json({ state: JSON.parse(row.json), updatedAt: row.updated_at });
    } catch {
      res.status(500).json({ error: "db_parse_failed" });
    }
  });
});

app.post("/api/state", (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }
  const payload = JSON.stringify(req.body);
  const updated = new Date().toISOString();
  db.run(
    "INSERT OR REPLACE INTO app_state (id, json, updated_at) VALUES (1, ?, ?)",
    [payload, updated],
    (err) => {
      if (err) {
        res.status(500).json({ error: "db_write_failed" });
        return;
      }
      res.json({ ok: true });
    }
  );
});

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`RMS server listening on http://localhost:${port}`);
});
