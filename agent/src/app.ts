// agent/src/app.ts
import express from "express";
import cors from "cors";
import { generateEggReply } from "./agent/eggReply";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/agent/egg-reply", async (req, res) => {
  try {
    const { messages } = req.body as {
      messages: { speaker: string; message: string }[];
    };

    const reply = await generateEggReply(messages);
    return res.json({ reply });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ reply: "알이 잠깐 졸고 있어... zZ" });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Agent server running on port ${PORT}`);
});
