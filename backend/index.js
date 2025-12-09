import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

// DB 설정이 있는지 확인 (배포에서 DB 없으면 false)
const hasDbConfig =
  !!process.env.DB_HOST &&
  !!process.env.DB_USER &&
  !!process.env.DB_PASSWORD &&
  !!process.env.DB_NAME;

let pool = null;

if (hasDbConfig) {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log("✅ MySQL pool created");
} else {
  console.log("⚠️ DB 설정이 없어, 로그인은 임시(가짜) 모드로 동작합니다.");
}


const app = express();

// CORS 허용
const allowedOrigins = [
  "http://localhost:5173",
  "https://animai-tolx.onrender.com",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(bodyParser.json());

// 헬스 체크용
app.get("/", (req, res) => {
  res.send("AnimAI backend is alive");
});

// 테스트용 로그인 API (DB 없이 동작)
app.post("/api/login", async (req, res) => {
  const { email, password, nickname } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email, password는 필수입니다." });
  }

  // 1) DB 설정이 없으면: 가짜 로그인 (배포용 안전모드)
  if (!hasDbConfig || !pool) {
    console.log("⚠️ DB 없음 - 임시 로그인 모드");
    return res.json({
      userId: 1,
      email,
      nickname: nickname || "TestUser",
    });
  }

  // 2) DB 설정이 있으면: 진짜 MySQL 로그인
  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      "SELECT id, email, nickname, password_hash FROM users WHERE email = ?",
      [email]
    );

    // 유저 없음 → 회원가입
    if (Array.isArray(rows) && rows.length === 0) {
      if (!nickname) {
        return res
          .status(400)
          .json({ message: "첫 로그인(회원가입)에는 nickname도 필요합니다." });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await conn.query(
        "INSERT INTO users (email, nickname, password_hash) VALUES (?, ?, ?)",
        [email, nickname, passwordHash]
      );

      return res.json({
        userId: result.insertId,
        email,
        nickname,
      });
    }

    // 유저 있음 → 비번 체크
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
    }

    return res.json({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });
  } catch (err) {
    console.error("로그인 중 DB 에러:", err);
    return res.status(500).json({ message: "서버 에러" });
  } finally {
    if (conn) conn.release();
  }
});


// 테스트용 알 채팅 API
app.post("/api/eggs/:eggId/messages", (req, res) => {
  const eggId = Number(req.params.eggId);
  const userId = Number(req.query.userId);
  const { message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ message: "userId, message 필요" });
  }

  return res.json({
    eggId: eggId || 1,
    reply: `(${eggId || 1}번 알) "${message}" 잘 들었어! (테스트 모드)`,
    status: "egg",
    progress: 10,
    personality: "neutral",
  });
});

// PORT는 Render에서 주는 값 사용
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Backend 서버 실행중: http://localhost:${port}`);
});
