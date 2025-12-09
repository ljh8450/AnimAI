import { useEffect, useState } from "react";
import LoginForm from "./components/LoginForm";
import { EggChat } from "./components/EggChat";

type UserInfo = {
  userId: number;
  email: string;
  nickname: string;
};

function App() {
  const [user, setUser] = useState<UserInfo | null>(null);

  // 새로고침해도 로그인 유지
  useEffect(() => {
    const stored = localStorage.getItem("animai_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // 파싱 실패하면 무시
      }
    }
  }, []);

  if (!user) {
    return (
      <LoginForm
        onLoginSuccess={(u) => {
          setUser(u);
          localStorage.setItem("animai_user", JSON.stringify(u));
        }}
      />
    );
  }

  return <EggChat user={user} />;
}

export default App;
