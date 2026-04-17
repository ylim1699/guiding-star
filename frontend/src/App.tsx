import './App.css'
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage  from "./pages/LoginPage";
import SeniorPage from "./pages/SeniorPage";
import HelperPage from "./pages/HelperPage";

export default function App() {
  const [user, setUser]       = useState<{ phoneNumber: string | null } | null>(null);
  const [session, setSession] = useState<{ room_url: string; room_name: string } | null>(null);

  async function handleLogin(firebaseUser: { phoneNumber: string | null }) {
    setUser(firebaseUser);
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/create-room`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: firebaseUser.phoneNumber
        })
      }
    );
    const data = await res.json();
    setSession(data);
  }

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
            ? <SeniorPage session={session} />
            : <Navigate to="/" />
        } />
        <Route path="/helper" element={
          <HelperPage />
        } />
      </Routes>
    </BrowserRouter>
  );
}
