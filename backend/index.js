import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

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
app.post("/api/login", (req, res) => {
  const { email, nickname } = req.body;
  if (!email) {
    return res.status(400).json({ message: "email 필요" });
  }

  // 가짜 유저 정보 리턴
  return res.json({
    userId: 1,
    email,
    nickname: nickname || "TestUser",
  });
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
