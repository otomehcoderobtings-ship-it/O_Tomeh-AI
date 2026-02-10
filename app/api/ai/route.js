import { createClient } from "@supabase/supabase-js";

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(query, text) {
  // simple keyword overlap scoring
  const q = new Set(normalize(query).split(" ").filter(Boolean));
  const t = new Set(normalize(text).split(" ").filter(Boolean));
  if (q.size === 0 || t.size === 0) return 0;
  let hit = 0;
  for (const w of q) if (t.has(w)) hit++;
  return hit / Math.sqrt(q.size * t.size);
}

function parseTraining(parsedText) {
  // Returns { facts:[], qas:[{q,a}] }
  const lines = (parsedText || "").split("\n").map(l => l.trim()).filter(Boolean);
  const facts = [];
  const qas = [];
  let pendingQ = null;

  for (const line of lines) {
    if (line.toUpperCase().startsWith("F:")) {
      facts.push(line.slice(2).trim());
      pendingQ = null;
    } else if (line.toUpperCase().startsWith("Q:")) {
      pendingQ = line.slice(2).trim();
    } else if (line.toUpperCase().startsWith("A:") && pendingQ) {
      qas.push({ q: pendingQ, a: line.slice(2).trim() });
      pendingQ = null;
    }
  }
  return { facts, qas };
}

export async function POST(req) {
  const { chatId } = await req.json();

  // Server-side Supabase client (service role key is required to read data in API route reliably)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get last user message
  const { data: msgData, error: msgErr } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (msgErr) return Response.json({ text: `DB error: ${msgErr.message}` });

  const messages = msgData || [];
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  const query = lastUser?.content || "";

  // Pull training (latest 200)
  const { data: trainData, error: trainErr } = await supabase
    .from("training")
    .select("parsed_text, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (trainErr) return Response.json({ text: `Training DB error: ${trainErr.message}` });

  const allFacts = [];
  const allQAs = [];

  for (const row of trainData || []) {
    const { facts, qas } = parseTraining(row.parsed_text);
    allFacts.push(...facts);
    allQAs.push(...qas);
  }

  // 1) Try best QA match
  let bestQA = null;
  let bestQAScore = 0;

  for (const qa of allQAs) {
    const s = scoreMatch(query, qa.q);
    if (s > bestQAScore) {
      bestQAScore = s;
      bestQA = qa;
    }
  }

  // 2) If no good QA, return top facts relevant
  const factScores = allFacts
    .map(f => ({ f, s: scoreMatch(query, f) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .filter(x => x.s > 0.12);

  // Build response
  let text = "";

  if (bestQA && bestQAScore > 0.18) {
    text =
      `${bestQA.a}\n\n` +
      `If you want, ask with more detail and I’ll search the training again.`;
  } else if (factScores.length) {
    text =
      `I don't have a direct Q/A for that yet, but here are the most relevant facts I was trained on:\n\n` +
      factScores.map((x, i) => `${i + 1}) ${x.f}`).join("\n") +
      `\n\nTrain me with a Q/A like:\nQ: ${query}\nA: ...`;
  } else {
    text =
      `I don't know that yet (no matching training found).\n\n` +
      `To teach me, go to Train and add:\n` +
      `Q: ${query}\nA: ...\n\n` +
      `Or add a fact starting with F:.`;
  }

  return Response.json({ text });
}

