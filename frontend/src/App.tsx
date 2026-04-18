import './App.css'
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import LoginPage  from "./pages/LoginPage";
import SeniorPage from "./pages/SeniorPage";
import HelperPage from "./pages/HelperPage";

export default function App() {
  const [user,    setUser]    = useState<{ phoneNumber: string | null } | null>(null);
  const [session, setSession] = useState<{ room_url: string; room_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if Firebase already has a logged-in user (persisted in localStorage)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({ phoneNumber: firebaseUser.phoneNumber });
        await createRoom(firebaseUser.phoneNumber);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function createRoom(phone: string | null) {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      setSession(data);
    } catch {
      // If room creation fails, still show the app — session will be null
    }
  }

  async function handleLogin(firebaseUser: { phoneNumber: string | null }) {
    setUser(firebaseUser);
    await createRoom(firebaseUser.phoneNumber);
  }

  async function handleLogout() {
    await signOut(auth);
    setUser(null);
    setSession(null);
  }

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#faf8ff",
      fontFamily: "'Public Sans', sans-serif", color: "#6b6d88", fontSize: "16px",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "2.5px solid rgba(29,78,216,0.15)",
        borderTopColor: "#1D4ED8",
        animation: "spin 1s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          user && session
            ? <Navigate to="/senior" />
            : <LoginPage onLogin={handleLogin} />
        } />
        <Route path="/senior" element={
          session
            ? <SeniorPage session={session} onLogout={handleLogout} />
            : <Navigate to="/" />
        } />
        <Route path="/helper" element={<HelperPage />} />
      </Routes>
    </BrowserRouter>
  );
}
