const express = require("express");
const db = require("./db");

const app = express();
const port = process.env.API_PORT || 3000;

app.use(express.json());

app.get("/status", (req, res) => res.json({ status: "OK" }));

app.get("/items", async (req, res) => {
  try {
    const result = await db.query("SELECT id, name, description FROM items ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.status(200).json({ status: "healthy" });
  } catch {
    res.status(500).json({ status: "db_error" });
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
