require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

/* ===== TEST DB CONNECTION ===== */
pool.query("select 1")
  .then(() => console.log("✅ Supabase connected"))
  .catch(e => console.error("❌ DB error:", e.message));

/* ===== CREATE TABLE IF NOT EXISTS ===== */
pool.query(`
CREATE TABLE IF NOT EXISTS porudzbine (
 id SERIAL PRIMARY KEY,
 proizvod TEXT,
 komentar TEXT,
 pismo TEXT,
 stil TEXT,
 rok TEXT,
 cena NUMERIC,
 status TEXT DEFAULT 'Novo',
 slike TEXT,
 created_at TIMESTAMP DEFAULT now()
)
`);

/* ===== MULTER ===== */
const storage = multer.diskStorage({
 destination: (_, __, cb) => cb(null, "uploads"),
 filename: (_, file, cb) =>
   cb(null, Date.now() + "_" + Math.random() + path.extname(file.originalname))
});

const upload = multer({ storage });

/* ===== ADD ===== */
app.post("/porudzbine", upload.array("slike", 4), async (req, res) => {
 try {
   const { proizvod, komentar, pismo, stil, rok, cena } = req.body;
   const slike = req.files.map(f => f.filename).join(",");

   await pool.query(
     `INSERT INTO porudzbine
     (proizvod, komentar, pismo, stil, rok, cena, slike)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
     [proizvod, komentar, pismo, stil, rok, cena, slike]
   );

   res.json({ ok: true });
 } catch (err) {
   res.status(500).json({ error: err.message });
 }
});

/* ===== LIST ===== */
app.get("/porudzbine", async (_, res) => {
 try {
   const { rows } = await pool.query(
     "SELECT * FROM porudzbine ORDER BY id DESC"
   );
   res.json(rows);
 } catch (e) {
   res.status(500).json(e.message);
 }
});

/* ===== UPDATE ===== */
app.put("/porudzbine/:id", upload.array("slike", 4), async (req, res) => {
 try {
   const { proizvod, komentar, rok, cena, status } = req.body;

   const { rows } = await pool.query(
     "SELECT * FROM porudzbine WHERE id=$1",
     [req.params.id]
   );

   if (!rows[0]) return res.status(404).json({ error: "Ne postoji" });

   let noveSlike = rows[0].slike;

   if (req.files.length) {
     rows[0].slike?.split(",").forEach(f => {
       const p = path.join(__dirname, "uploads", f);
       if (fs.existsSync(p)) fs.unlinkSync(p);
     });

     noveSlike = req.files.map(f => f.filename).join(",");
   }

   await pool.query(
     `
     UPDATE porudzbine SET
       proizvod = COALESCE($1, proizvod),
       komentar = COALESCE($2, komentar),
       rok = COALESCE($3, rok),
       cena = COALESCE($4, cena),
       status = COALESCE($5, status),
       slike = COALESCE($6, slike)
     WHERE id = $7
     `,
     [proizvod, komentar, rok, cena, status, noveSlike, req.params.id]
   );

   res.json({ ok: true });
 } catch (err) {
   res.status(500).json(err.message);
 }
});

/* ===== DELETE ===== */
app.delete("/porudzbine/:id", async (req, res) => {
 try {
   const { rows } = await pool.query(
     "SELECT slike FROM porudzbine WHERE id=$1",
     [req.params.id]
   );

   rows[0]?.slike?.split(",").forEach(f => {
     const p = path.join(__dirname, "uploads", f);
     if (fs.existsSync(p)) fs.unlinkSync(p);
   });

   await pool.query("DELETE FROM porudzbine WHERE id=$1", [req.params.id]);

   res.json({ ok: true });
 } catch (err) {
   res.status(500).json(err.message);
 }
});

/* ===== START ===== */
app.listen(PORT, () =>
 console.log(`🚀 Server running on port ${PORT}`)
);
