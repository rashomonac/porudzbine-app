require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CORS i Middleware
app.use(cors());
app.use(express.json());

// 2. Cloudinary Konfiguracija
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 3. Cloudinary Storage (Umesto lokalnog foldera)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'porudzbine_fajlovi', // Folder unutar Cloudinary-ja
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});
const upload = multer({ storage });

/* ===== ADD ===== */
app.post("/porudzbine", upload.array("slike", 4), async (req, res) => {
  try {
    const { proizvod, komentar, pismo, stil, rok, cena } = req.body;
    
    // Cloudinary vraća direktan link u 'path' svojstvu
    const slikeUrls = req.files?.map(f => f.path).join(",") || "";

    await pool.query(
      `INSERT INTO porudzbine (proizvod, komentar, pismo, stil, rok, cena, slike)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [proizvod, komentar, pismo, stil, rok, cena || null, slikeUrls]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("ADD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===== LIST ===== */
app.get("/porudzbine", async (_, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM porudzbine ORDER BY id DESC");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===== UPDATE (Samo status i podaci) ===== */
app.put("/porudzbine/:id", async (req, res) => {
  try {
    const { status, proizvod, komentar, rok, cena } = req.body;
    await pool.query(
      `UPDATE porudzbine SET 
        status = COALESCE($1, status),
        proizvod = COALESCE($2, proizvod),
        komentar = COALESCE($3, komentar),
        rok = COALESCE($4, rok),
        cena = COALESCE($5, cena)
      WHERE id = $6`,
      [status, proizvod, komentar, rok, cena, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===== DELETE ===== */
app.delete("/porudzbine/:id", async (req, res) => {
  try {
    // Ovde brišemo samo iz baze radi jednostavnosti
    await pool.query("DELETE FROM porudzbine WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server spreman na portu ${PORT}`));