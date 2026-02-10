"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function ChatPage() {
  const router = useRouter();

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = useMemo(() => user?.email === ADMIN_EMAIL, [user, ADMIN_EMAIL]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return router.push("/auth");
      setUser(data.user);
    })();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    loadChats();
  }, [user]);

  async function loadChats() {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error) {
      setChats(data || []);
      if (!activeChatId && data?.[0]?.id) setActiveChatId(data[0].id);
    }
  }

  useEffect(() => {
    if (!activeChatId) return;
    loadMessages(activeChatId);
  }, [activeChatId]);

  async function loadMessages(chatId) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (!error) setMessages(data || []);
  }

  async function newChat() {
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title: "New chat" })
      .select()
      .single();

    if (!error) {
      setChats([data, ...chats]);
      setActiveChatId(data.id);
      setMessages([]);
    }
  }

  async function renameChat(chatId, title) {
    await supabase.from("chats").update({ title }).eq("id", chatId);
    setChats(chats.map(c => (c.id === chatId ? { ...c, title } : c)));
  }

  async function send() {
    if (!text.trim() || !activeChatId) return;
    setLoading(true);

    // store user message
    const userMsg = { chat_id: activeChatId, role: "user", content: text.trim() };
    await supabase.from("messages").insert(userMsg);

    setMessages([...messages, { ...userMsg, id: crypto.randomUUID() }]);
    setText("");

    // call your AI endpoint
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: activeChatId })
    });

    const out = await res.json();

    const assistantMsg = { chat_id: activeChatId, role: "assistant", content: out.text || "Error." };
    await supabase.from("messages").insert(assistantMsg);

    setMessages(m => [...m, { ...assistantMsg, id: crypto.randomUUID() }]);

    // update chat timestamp
    await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", activeChatId);

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100vh", fontFamily: "Arial" }}>
      <aside style={{ borderRight: "1px solid #eee", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button onClick={newChat}>+ New</button>
          <button onClick={logout}>Logout</button>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Chats</h3>
          {isAdmin && (
            <button onClick={() => router.push("/train")} style={{ fontWeight: "bold" }}>
              Train
            </button>
          )}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {chats.map(c => (
            <div key={c.id} style={{
              border: activeChatId === c.id ? "2px solid #000" : "1px solid #ddd",
              padding: 10,
              borderRadius: 10,
              cursor: "pointer"
            }}>
              <div onClick={() => setActiveChatId(c.id)} style={{ fontWeight: "bold" }}>
                {c.title}
              </div>
              <input
                defaultValue={c.title}
                onBlur={(e) => renameChat(c.id, e.target.value)}
                style={{ width: "100%", marginTop: 6 }}
              />
            </div>
          ))}
        </div>
      </aside>

      <main style={{ padding: 12, display: "grid", gridTemplateRows: "1fr auto", gap: 10 }}>
        <div style={{ overflow: "auto", border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          {messages.map((m, idx) => (
            <div key={m.id || idx} style={{ marginBottom: 10 }}>
              <b>{m.role === "user" ? "You" : "O_Tomeh"}:</b> {m.content}
            </div>
          ))}
          {loading && <div><b>O_Tomeh:</b> ...</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type…"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button onClick={send} disabled={loading}>Send</button>
        </div>
      </main>
    </div>
  );
}
