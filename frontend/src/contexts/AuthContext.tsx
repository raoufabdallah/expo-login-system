// frontend/src/contexts/AuthContext.tsx
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { getBaseURL } from "../constants/api";

type AuthState = "loading" | "authed" | "guest";

type AuthContextType = {
  authState: AuthState;
  login: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    fetch(`${getBaseURL()}/me`, { credentials: "include" })
      .then((res) => setAuthState(res.ok ? "authed" : "guest"))
      .catch(() => setAuthState("guest"));
  }, []);

  const login = () => setAuthState("authed");

  const logout = async () => {
    try {
      await fetch(`${getBaseURL()}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setAuthState("guest");
    }
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// THIS IS THE IMPORTANT EXPORT
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
