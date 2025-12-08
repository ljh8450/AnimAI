import React, { useState } from "react";

type Speaker = "USER" | "EGG";

interface ChatMessage {
  id: number;
  speaker: Speaker;
  text: string;
}

export const EggChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      speaker: "EGG",
      text: "안녕! 나는 아직 껍질 속에 있는 알이야 🥚\n나와 이야기해 줄래?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(2);

  const addMessage = (speaker: Speaker, text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: nextId,
        speaker,
        text,
      },
    ]);
    setNextId((id) => id + 1);
  };

  const fakeEggReply = (userText: string): string => {
    const lower = userText.toLowerCase();

    if (lower.includes("숲") || lower.includes("forest")) {
      return "숲 이야기 너무 좋아 🌲 나도 나중에 숲에서 태어날까?";
    }
    if (lower.includes("바다") || lower.includes("ocean") || lower.includes("sea")) {
      return "바다 냄새가 나는 것 같아 🌊 파도랑 친구가 될지도 몰라.";
    }
    if (lower.includes("불") || lower.includes("fire")) {
      return "따뜻한 불꽃이 느껴져 🔥 혹시 나 불 속성일까?";
    }

    return `방금 말해준 "${userText}" 잘 기억해 둘게! 내가 어떤 모습이 될지 점점 궁금해져 🥚`;
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput("");
    addMessage("USER", text);
    setLoading(true);

    // 지금은 백엔드 대신 프론트에서만 가짜 답변
    setTimeout(() => {
      const reply = fakeEggReply(text);
      addMessage("EGG", reply);
      setLoading(false);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1>AI 알 키우기 🥚</h1>
      <p style={{ color: "#666", marginBottom: 12 }}>
        알에게 말을 걸어보면, 알이 네 말을 듣고 어떤 모습이 될지 상상해!
      </p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 8,
          height: 400,
          overflowY: "auto",
          marginBottom: 8,
          backgroundColor: "#fafafa",
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              textAlign: m.speaker === "USER" ? "right" : "left",
              margin: "4px 0",
            }}
          >
            <div
                style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 16,
                    backgroundColor: m.speaker === "USER" ? "#3a8bbb" : "#ffffff",
                    color: m.speaker === "USER" ? "white" : "#333",
                    whiteSpace: "pre-wrap",
                }}
            >
            {m.text}
            </div>
          </div>
        ))}

        {loading && <div style={{ marginTop: 4 }}>알이 생각 중... 💭</div>}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="알에게 말 걸어보자..."
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: "0 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            backgroundColor: loading ? "#aaa" : "#4caf50",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          보내기
        </button>
      </div>
    </div>
  );
};
