// agent/src/agent/eggReply.ts

export async function generateEggReply(
  messages: { speaker: string; message: string }[]
): Promise<string> {
  // 마지막 USER 메시지
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.speaker === "USER");

  const base =
    "나는 아직 껍질 속에 있는 알이야 🥚\n너와 이야기하면서 어떤 모습으로 태어날지 정해지고 있어!";

  if (!lastUserMessage) {
    return base;
  }

  const text = lastUserMessage.message.toLowerCase();

  if (text.includes("숲") || text.includes("forest")) {
    return "숲 속 향기가 느껴져… 나, 초록빛이 많은 곳에 태어날지도 몰라 🌲";
  }

  if (text.includes("바다") || text.includes("sea") || text.includes("ocean")) {
    return "차가운 파도 소리가 들려… 물과 어울리는 모습이 될까? 🌊";
  }

  if (text.includes("불") || text.includes("fire")) {
    return "따뜻한 열기가 느껴져... 혹시 불꽃을 다루는 친구가 될지도? 🔥";
  }

  return `${base}\n\n방금 말한 '${lastUserMessage.message}'도 잘 기억해 둘게!`;
}
