"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Stars from "../../components/Stars";
import { supabase } from "../../lib/supabaseClient";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. Now login.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/chat");
      }
    } catch (err) {
      setMsg(err.message || "Error");
    }
  }

  return (
    <div style={{ height: "100vh", position: "relative", overflow: "hidden" }}>
      <Stars />
      <div style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        height: "100%",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <form onSubmit={handleSubmit} style={{
          width: 360,
          background: "rgba(0,0,0,0.6)",
          color: "white",
          padding: 24,
          borderRadius: 16,
          backdropFilter: "blur(6px)"
        }}>
          <h2 style={{ marginTop: 0 }}>O_Tomeh AI</h2>

          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button type="button" onClick={() => setMode("login")}
              style={btn(mode === "login")}>Login</button>
            <button type="button" onClick={() => setMode("signup")}
              style={btn(mode === "signup")}>Sign up</button>
          </div>

          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            style={input} type="email" required />

          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)}
            style={input} type="password" required />

          <button type="submit" style={{
            width: "100%",
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: "bold"
          }}>
            {mode === "signup" ? "Create account" : "Login"}
          </button>

          {msg && <p style={{ color: "#ffd27d" }}>{msg}</p>}
        </form>
      </div>
    </div>
  );
}

function btn(active) {
  return {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    background: active ? "white" : "transparent",
    color: active ? "black" : "white",
    cursor: "pointer",
    fontWeight: "bold"
  };
}
const input = {
  width: "100%",
  padding: 10,
  marginTop: 6,
  marginBottom: 12,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  outline: "none"
};
