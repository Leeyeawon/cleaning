const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use("/employee", express.static(path.join(__dirname, "employee")));
app.use("/admin", express.static(path.join(__dirname, "admin")));
app.use("/public", express.static(path.join(__dirname, "public")));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// 직원 출근 기록 저장
app.post("/api/attendance/check-in", async (req, res) => {
  const { userId, latitude, longitude } = req.body;

  await db.query(
    `INSERT INTO attendance 
    (user_id, type, latitude, longitude, created_at)
    VALUES (?, 'check_in', ?, ?, NOW())`,
    [userId, latitude, longitude]
  );

  res.json({ success: true });
});

// 직원 본인 기록 조회
app.get("/api/attendance/:userId", async (req, res) => {
  const [rows] = await db.query(
    "SELECT * FROM attendance WHERE user_id = ? ORDER BY created_at DESC",
    [req.params.userId]
  );

  res.json(rows);
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});