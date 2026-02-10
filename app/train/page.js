"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function TrainPage() {
  const router = useRouter();
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const [user, setUser] = useState(null);
  const [factLine, setFactLine] = useState("F: ");
  const [qaBlock, setQaBlock] = useState("QA:\nQ: \nA: ");
  const [wholeText, setWholeText] = useState("");
  const [organized, setOrganized] = useState("");

  const isAdmin = useMemo(() => user?.email === ADMIN_EMAIL, [user, ADMIN_EMAIL]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return router.push("/auth");
      setUser(data.user);
    })();
  }, [router]);

  useEffect(() => {
    if (user && !isAdmin) router.push("/chat");
  }, [user, isAdmin, router]);

  function organizeText(text) {
    // VERY simple parser:
    // - lines that start with Q: and A: become QA entries
    // - everything else becomes F:
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const out = [];
    let pendingQ = null;

    for (const line of lines) {
      if (line.toUpperCase().startsWith("Q:")) {
        pendingQ = line.slice(2).trim();
      } else if (line.toUpperCase().startsWith("A:") && pendingQ) {
        out.push(`Q: ${pendingQ}`);
        out.push(`A: ${line.slice(2).trim()}`);
        pendingQ = null;
      } else if (line.toUpperCase().startsWith("F:")) {
        out.push(`F: ${line.slice(2).trim()}`);
      } else {
        out.push(`F: ${line}`);
      }
    }
    return out.join("\n");
  }

  async function saveTraining(text) {
    // store in DB (admin user only)
    const parsed = organizeText(text);

    const { error } = await supabase.from("training").insert({
      admin_user_id: user.id,
      raw_text: text,
      parsed_text: parsed
    });

    if (!error) {
      setOrganized(parsed);
      alert("Saved training ✅");
    } else {
      alert(error.message);
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Train (Admin)</h2>
        <button onClick={() => router.push("/chat")}>Back</button>
      </div>

      <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
        <div style={box}>
          <h3>Enter one Fact</h3>
          <textarea value={factLine} onChange={(e) => setFactLine(e.target.value)} style={ta} rows={2} />
          <button onClick={() => saveTraining(factLine)}>Save</button>
        </div>

        <div style={box}>
          <h3>Enter QA</h3>
          <textarea value={qaBlock} onChange={(e) => setQaBlock(e.target.value)} style={ta} rows={5} />
          <button onClick={() => saveTraining(qaBlock)}>Save</button>
        </div>

        <div style={box}>
          <h3>Paste whole text (auto-organize)</h3>
          <textarea value={wholeText} onChange={(e) => setWholeText(e.target.value)} style={ta} rows={10} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setOrganized(organizeText(wholeText))}>Organize (Preview)</button>
            <button onClick={() => saveTraining(wholeText)} style={{ fontWeight: "bold" }}>Save to DB</button>
          </div>
        </div>

        <div style={box}>
          <h3>Organized output</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{organized}</pre>
        </div>
      </div>
    </div>
  );
}

const box = { border: "1px solid #ddd", borderRadius: 12, padding: 12 };
const ta = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" };
