import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/* -----------------------------------------
   Personality 분석 함수
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
   OpenAI 설정
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

  return completion.choices[0]?.message?.content?.trim() ?? "음... 잘 모르겠지만 고마워! 😊";
}

/* -----------------------------------------
   로그인 API
----------------------------------------- */

app.post("/api/login", async (req, res) => {
  const { email, password, nickname } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "email과 password는 필수입니다." });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT id, email, nickname, password_hash FROM users WHERE email = ?",
      [email]
    );

    // 회원가입
    if (rows.length === 0) {
      if (!nickname)
        return res.status(400).json({ message: "회원가입에는 nickname도 필요합니다." });

      const pwHash = await bcrypt.hash(password, 10);
      const [result] = await conn.query(
        "INSERT INTO users (email, nickname, password_hash) VALUES (?, ?, ?)",
        [email, nickname, pwHash]
      );

      conn.release();
      return res.json({
        userId: result.insertId,
        email,
        nickname,
      });
    }

    // 로그인
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    conn.release();

    if (!ok) return res.status(401).json({ message: "비밀번호 틀림" });

    return res.json({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });
  } catch (err) {
    conn.release();
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
});

/* -----------------------------------------
   알과 채팅
----------------------------------------- */

app.post("/api/eggs/:eggId/messages", async (req, res) => {
  let eggId = Number(req.params.eggId);
  const userId = Number(req.query.userId);
  const { message } = req.body;

  if (!userId || !message)
    return res.status(400).json({ message: "userId와 message 필요" });

  const conn = await pool.getConnection();

  try {
    // 1) eggId가 없으면 유저의 알 찾기/생성
    if (!eggId || eggId === 0) {
      const [eggRows] = await conn.query(
        "SELECT id FROM eggs WHERE user_id = ? LIMIT 1",
        [userId]
      );

      if (eggRows.length > 0) eggId = eggRows[0].id;
      else {
        const [result] = await conn.query(
          "INSERT INTO eggs (user_id) VALUES (?)",
          [userId]
        );
        eggId = result.insertId;
      }
    }

    // 2) 유저 메시지 저장
    await conn.query(
      "INSERT INTO messages (user_id, egg_id, role, text) VALUES (?, ?, 'USER', ?)",
      [userId, eggId, message]
    );

    // 3) 총 메시지 수로 상태/진행도 결정
    const [[{ count: total }]] = await conn.query(
      "SELECT COUNT(*) AS count FROM messages WHERE egg_id = ?",
      [eggId]
    );

    let newStatus = "egg";
    let newProgress = 0;

    if (total >= 30) (newStatus = "hatched"), (newProgress = 100);
    else if (total >= 20) (newStatus = "hatching"), (newProgress = 70);
    else if (total >= 10) (newStatus = "egg"), (newProgress = 40);
    else newProgress = 10;

    // 4) personality 계산
    const [userMsgs] = await conn.query(
      "SELECT text FROM messages WHERE egg_id = ? AND role='USER' ORDER BY created_at DESC LIMIT 50",
      [eggId]
    );
    const texts = userMsgs.map((m) => m.text);
    const personality = detectPersonality(texts);

    await conn.query(
      "UPDATE eggs SET status=?, progress=?, personality=? WHERE id=?",
      [newStatus, newProgress, personality, eggId]
    );

    // 5) AI 답장
    const aiReply = await getEggReplyFromAI({
      userId,
      eggId,
      message,
      personality,
    });

    await conn.query(
      "INSERT INTO messages (user_id, egg_id, role, text) VALUES (?, ?, 'EGG', ?)",
      [userId, eggId, aiReply]
    );

    conn.release();

    return res.json({
      eggId,
      reply: aiReply,
      status: newStatus,
      progress: newProgress,
      personality,
    });
  } catch (err) {
    conn.release();
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
});

/* -----------------------------------------
   대화 기록 조회
----------------------------------------- */

app.get("/api/eggs/:eggId/messages", async (req, res) => {
  const eggId = Number(req.params.eggId);
  const userId = Number(req.query.userId);

  if (!eggId || !userId)
    return res.status(400).json({ message: "userId, eggId 필요" });

  const conn = await pool.getConnection();
  const [rows] = await conn.query(
    "SELECT id, role, text, created_at FROM messages WHERE user_id = ? AND egg_id = ? ORDER BY created_at ASC",
    [userId, eggId]
  );
  conn.release();

  return res.json(
    rows.map((r) => ({
      id: r.id,
      speaker: r.role === "USER" ? "USER" : "EGG",
      text: r.text,
      createdAt: r.created_at,
    }))
  );
});

/* -----------------------------------------
   부화 상태 조회
----------------------------------------- */

app.get("/api/eggs/:eggId/status", async (req, res) => {
  const eggId = Number(req.params.eggId);
  const userId = Number(req.query.userId);

  if (!eggId || !userId)
    return res.status(400).json({ message: "eggId, userId 필요" });

  const conn = await pool.getConnection();
  const [rows] = await conn.query(
    "SELECT status, progress, personality FROM eggs WHERE id = ? AND user_id = ?",
    [eggId, userId]
  );
  conn.release();

  if (rows.length === 0)
    return res.status(404).json({ message: "알이 없음" });

  return res.json({
    eggId,
    status: rows[0].status,
    progress: rows[0].progress,
    personality: rows[0].personality,
  });
});

/* -----------------------------------------
   서버 시작
----------------------------------------- */

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Backend running at http://localhost:${port}`));
