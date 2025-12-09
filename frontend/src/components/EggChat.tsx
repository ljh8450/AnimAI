import React, { useState } from "react";

type EggChatProps = {
  user: {
    userId: number;
    email: string;
    nickname: string;
  };
};

type Speaker = "USER" | "EGG";

interface ChatMessage {
  id: number;
  speaker: Speaker;
  text: string;
}

type EggStatus = "egg" | "hatching" | "hatched";
type EggPersonality = "neutral" | "fire" | "water" | "forest" | "city";

interface EggMessageResponse {
  eggId: number;
  reply: string;
  status: EggStatus;
  progress: number;
  personality: EggPersonality;
}

/*
// 나중에 이미지 파일 추가하면 들어갈 부분 -> public 폴더에 이미지 저장하면 됨
const getEggImage = (status: EggStatus, personality: EggPersonality): string => {
  if (status !== "hatched") {
    if (status === "hatching") return "/egg/egg_hatching.gif";
    return "/egg/egg_default.png";
  }

  switch (personality) {
    case "fire":
      return "/egg/hatched_fire.png";
    case "water":
      return "/egg/hatched_water.png";
    case "forest":
      return "/egg/hatched_forest.png";
    case "city":
      return "/egg/hatched_city.png";
    default:
      return "/egg/egg_default.png";
  }
};
*/

export const EggChat: React.FC<EggChatProps> = ({ user }) => {
  const API = import.meta.env.VITE_API_URL;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      speaker: "EGG",
      text: "안녕! 나는 아직 껍질 속에 있는 알이야 🥚\n나와 이야기해 줄래?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [eggId, setEggId] = useState<number | null>(null);

  const addMessage = (speaker: Speaker, text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        speaker,
        text,
      },
    ]);
  };
  const [eggStatus, setEggStatus] = useState<EggStatus>("egg");
  const [eggProgress, setEggProgress] = useState<number>(0);
  const [eggPersonality, setEggPersonality] = useState<EggPersonality>("neutral");

  // 백엔드가 안 되거나 에러일 때 임시로 쓰는 가짜 답변
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput("");
    addMessage("USER", text);
    setLoading(true);

    try {
      // eggId가 아직 없으면 0 같은 placeholder 사용
      // (백엔드에서는 owner의 미부화 알을 찾아서 쓰기 때문에 크게 상관 없음)
      const targetEggId = eggId ?? 0;

      const res = await fetch(
        `${API}/api/eggs/${targetEggId}/messages?userId=${user.userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: text }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "알과 대화하는 중 오류가 발생했어");
      }

      const data: EggMessageResponse = await res.json();

      // 서버에서 실제 eggId 내려주면 상태에 저장
      if (!eggId) {
        setEggId(data.eggId);
      }

      // 🥚 새로 추가: 상태/진행도 저장
      setEggStatus(data.status);
      setEggProgress(data.progress);
      setEggPersonality(data.personality);

      addMessage("EGG", data.reply);

    } catch (err) {
      console.error(err);
      // 백엔드 장애 시에도 UX 깨지지 않게 프론트에서 가짜 답변
      const reply =
        fakeEggReply(text) +
        "\n(지금은 서버와 연결이 불안정해서, 임시로 내가 혼자 상상해서 대답했어 😅)";
      addMessage("EGG", reply);
    } finally {
      setLoading(false);
    }
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
      {/* ✅ 알 상태 표시 영역 */}
      <div
        style={{
          marginBottom: 8,
          padding: 8,
          borderRadius: 8,
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeeba",
          fontSize: 14,
        }}
      >
       <div style={{ marginBottom: 4 }}>
          {eggStatus === "egg" && "알이 조용히 잠들어 있어요... 🥚"}
          {eggStatus === "hatching" && "알이 살짝 흔들리고 있어요! 💫 곧 부화할지도 몰라요."}
          {eggStatus === "hatched" && "알이 완전히 부화했어요! 🎉 새로운 존재가 태어났어요."}
        </div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          {eggPersonality === "fire" && "이 알은 불 속성! 열정적이고 에너지가 넘치는 성격이에요 🔥"}
          {eggPersonality === "water" && "이 알은 물/바다 속성! 차분하고 감성적인 성격이에요 🌊"}
          {eggPersonality === "forest" && "이 알은 숲 속성! 포근하고 자연을 좋아하는 성격이에요 🌳"}
          {eggPersonality === "city" && "이 알은 도시/기계 속성! 똑똑하고 기술을 좋아하는 성격이에요 🤖"}
          {eggPersonality === "neutral" && "아직 어떤 속성인지 정해지지 않았어요. 계속 이야기해보자! ✨"}
        </div>

        <div
          style={{
            width: "100%",
            height: 8,
            borderRadius: 4,
            backgroundColor: "#eee",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${eggProgress}%`,
              height: "100%",
              backgroundColor:
                eggStatus === "hatched" ? "#4caf50" : eggStatus === "hatching" ? "#ff9800" : "#2196f3",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div style={{ textAlign: "right", fontSize: 12, marginTop: 2 }}>
          {eggProgress}% 부화 진행 중
        </div>
      </div>
      
      {/*
      //아래 부분(이모지 출력 대체 예정)
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <img
          src={getEggImage(eggStatus, eggPersonality)}
          style={{ width: 120, height: "auto" }}
          alt="egg"
        />
      </div>
      */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        {eggStatus === "hatched" ? (
          eggPersonality === "fire" ? (
            <div style={{ fontSize: 48 }}>🐉🔥</div>
          ) : eggPersonality === "water" ? (
            <div style={{ fontSize: 48 }}>🐟🌊</div>
          ) : eggPersonality === "forest" ? (
            <div style={{ fontSize: 48 }}>🦉🌳</div>
          ) : eggPersonality === "city" ? (
            <div style={{ fontSize: 48 }}>🤖🏙️</div>
          ) : (
            <div style={{ fontSize: 48 }}>🪄</div>
          )
        ) : eggStatus === "hatching" ? (
          <div style={{ fontSize: 48 }}>🥚💫</div>
        ) : (
          <div style={{ fontSize: 48 }}>🥚</div>
        )}
      </div>

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
          placeholder=
            {eggStatus !== "hatched"
              ? "알에게 말을 걸어보자.."
              : "나의 펫에게 말을 걸어보세요!"}
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
