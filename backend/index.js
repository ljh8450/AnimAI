import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import OpenAI from "openai";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;
const app = express();

/* -----------------------------------------
   1) CORS 설정
----------------------------------------- */

const allowedOrigins = [
  "http://localhost:5173",              // 로컬 개발용
  "https://animai-tolx.onrender.com",   // Render 프론트 도메인
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(bodyParser.json());

/* -----------------------------------------
   2) PostgreSQL Pool 설정
----------------------------------------- */

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL 이 설정돼 있지 않습니다. DB 연결이 동작하지 않을 수 있습니다.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false }, // 클라우드(예: Render)의 경우 SSL 필요
});

/* -----------------------------------------
   3) Personality 분석 함수 (그대로 사용)
----------------------------------------- */

function detectPersonality(messages) {
  const scores = { fire: 0, water: 0, forest: 0, city: 0 };

  for (const text of messages) {
    const lower = text.toLowerCase();

    if (text.includes("불") || lower.includes("fire") || lower.includes("flame")) scores.fire += 2;
    if (text.includes("용") || lower.includes("dragon")) scores.fire += 1;

    if (text.includes("바다") || text.includes("물") || lower.includes("sea") || lower.includes("ocean")) scores.water += 2;
    if (text.includes("파도") || lower.includes("wave")) scores.water += 1;

    if (text.includes("숲") || text.includes("나무") || text.includes("꽃") || lower.includes("forest")) scores.forest += 2;
    if (text.includes("동물") || lower.includes("animal")) scores.forest += 1;

    if (text.includes("도시") || text.includes("빌딩") || lower.includes("city")) scores.city += 2;
    if (text.includes("로봇") || lower.includes("robot") || lower.includes("tech")) scores.city += 2;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [type, score] = sorted[0];
  return score === 0 ? "neutral" : type;
}

/* -----------------------------------------
   4) OpenAI 설정
----------------------------------------- */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEggReplyFromAI({ userId, eggId, message, personality }) {
  const personalityDesc =
    personality === "fire"
      ? "불 속성, 열정적이고 에너지가 넘치는 성격"
      : personality === "water"
      ? "물/바다 속성, 차분하고 감성적인 성격"
      : personality === "forest"
      ? "숲 속성, 자연 친화적이고 따뜻한 성격"
      : personality === "city"
      ? "도시/기계 속성, 지적이고 논리적인 성격"
      : "아직 성격이 정해지지 않은 중립적인 알";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `너는 ${personalityDesc}을 가진 귀여운 알 캐릭터야. 부화 전/후 관계없이 상냥하고 짧게 답해.`,
      },
      { role: "user", content: message },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "음... 잘 모르겠지만 고마워! 😊"
  );
}

/* -----------------------------------------
   5) 로그인 API (PostgreSQL 버전)
----------------------------------------- */

app.post("/api/login", async (req, res) => {
  const { email, password, nickname } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email과 password는 필수입니다." });
  }

  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      "SELECT id, email, nickname, password_hash FROM users WHERE email = $1",
      [email]
    );
    const rows = result.rows;

    // 회원가입
    if (rows.length === 0) {
      if (!nickname) {
        return res
          .status(400)
          .json({ message: "회원가입에는 nickname도 필요합니다." });
      }

      const pwHash = await bcrypt.hash(password, 10);
      const insertResult = await client.query(
        "INSERT INTO users (email, nickname, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [email, nickname, pwHash]
      );

      const insertId = insertResult.rows[0].id;

      return res.json({
        userId: insertId,
        email,
        nickname,
      });
    }

    // 로그인
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ message: "비밀번호 틀림" });
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
    if (client) client.release();
  }
});

/* -----------------------------------------
   6) 알과 채팅 (PostgreSQL 버전)
----------------------------------------- */

app.post("/api/eggs/:eggId/messages", async (req, res) => {
  let eggId = Number(req.params.eggId);
  const userId = Number(req.query.userId);
  const { message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ message: "userId와 message 필요" });
  }

  let client;
  try {
    client = await pool.connect();

    // 1) eggId가 없으면 유저의 알 찾기/생성
    if (!eggId || eggId === 0) {
      const eggResult = await client.query(
        "SELECT id FROM eggs WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      const eggRows = eggResult.rows;

      if (eggRows.length > 0) {
        eggId = eggRows[0].id;
      } else {
        const insertEggResult = await client.query(
          "INSERT INTO eggs (user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        eggId = insertEggResult.rows[0].id;
      }
    }

    // 2) 유저 메시지 저장
    await client.query(
      "INSERT INTO messages (user_id, egg_id, role, text) VALUES ($1, $2, 'USER', $3)",
      [userId, eggId, message]
    );

    // 3) 총 메시지 수로 상태/진행도 결정
    const countResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM messages WHERE egg_id = $1",
      [eggId]
    );
    const total = countResult.rows[0].count;

    let newStatus = "egg";
    let newProgress = 0;

    if (total >= 30) {
      newStatus = "hatched";
      newProgress = 100;
    } else if (total >= 20) {
      newStatus = "hatching";
      newProgress = 70;
    } else if (total >= 10) {
      newStatus = "egg";
      newProgress = 40;
    } else {
      newProgress = 10;
    }

    // 4) personality 계산
    const userMsgsResult = await client.query(
      "SELECT text FROM messages WHERE egg_id = $1 AND role = 'USER' ORDER BY created_at DESC LIMIT 50",
      [eggId]
    );
    const texts = userMsgsResult.rows.map((m) => m.text);
    const personality = detectPersonality(texts);

    await client.query(
      "UPDATE eggs SET status = $1, progress = $2, personality = $3 WHERE id = $4",
      [newStatus, newProgress, personality, eggId]
    );

    // 5) AI 답장
    const aiReply = await getEggReplyFromAI({
      userId,
      eggId,
      message,
      personality,
    });

    await client.query(
      "INSERT INTO messages (user_id, egg_id, role, text) VALUES ($1, $2, 'EGG', $3)",
      [userId, eggId, aiReply]
    );

    return res.json({
      eggId,
      reply: aiReply,
      status: newStatus,
      progress: newProgress,
      personality,
    });
  } catch (err) {
    console.error("eggs/messages 처리 중 에러:", err);
    return res.status(500).json({ message: "서버 에러" });
  } finally {
    if (client) client.release();
  }
});

/* -----------------------------------------
   7) 대화 기록 조회 (PostgreSQL 버전)
----------------------------------------- */

app.get("/api/eggs/:eggId/messages", async (req, res) => {
  const eggId = Number(req.params.eggId);
  const userId = Number(req.query.userId);

  if (!eggId || !userId) {
    return res.status(400).json({ message: "userId, eggId 필요" });
  }

  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      "SELECT id, role, text, created_at FROM messages WHERE user_id = $1 AND egg_id = $2 ORDER BY created_at ASC",
      [userId, eggId]
    );

    const rows = result.rows;

    return res.json(
      rows.map((r) => ({
        id: r.id,
        speaker: r.role === "USER" ? "USER" : "EGG",
        text: r.text,
        createdAt: r.created_at,
      }))
    );
  } catch (err) {
    console.error("메시지 조회 중 에러:", err);
    return res.status(500).json({ message: "서버 에러" });
  } finally {
    if (client) client.release();
  }
});

/* -----------------------------------------
   8) 부화 상태 조회 (PostgreSQL 버전)
----------------------------------------- */

app.get("/api/eggs/:eggId/status", async (req, res) => {
  const eggId = Number(req.params.eggId);
  const userId = Number(req.query.userId);

  if (!eggId || !userId) {
    return res.status(400).json({ message: "eggId, userId 필요" });
  }

  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      "SELECT status, progress, personality FROM eggs WHERE id = $1 AND user_id = $2",
      [eggId, userId]
    );
    const rows = result.rows;

    if (rows.length === 0) {
      return res.status(404).json({ message: "알이 없음" });
    }

    return res.json({
      eggId,
      status: rows[0].status,
      progress: rows[0].progress,
      personality: rows[0].personality,
    });
  } catch (err) {
    console.error("알 상태 조회 중 에러:", err);
    return res.status(500).json({ message: "서버 에러" });
  } finally {
    if (client) client.release();
  }
});

/* -----------------------------------------
   9) 서버 시작
----------------------------------------- */

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
