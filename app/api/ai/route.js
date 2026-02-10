import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  const { chatId } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // server only
  );

  const { data: msgData } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  const messages = (msgData || []).map(m => ({
    role: m.role,
    content: m.content
  }));

  const { data: trainData } = await supabase
    .from("training")
    .select("parsed_text")
    .order("created_at", { ascending: false })
    .limit(50);

  const trainingContext = (trainData || []).map(t => t.parsed_text).join("\n");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You are O_Tomeh AI. You only help with coding. Be concise, correct, and provide code examples."
      },
      {
        role: "system",
        content: `Extra training facts and QA:\n${trainingContext}`
      },
      ...messages
    ]
  });

  const text =
    response.output_text ||
    "No response text returned.";

  return Response.json({ text });
}
