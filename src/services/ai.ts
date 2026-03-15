import { GoogleGenAI } from "@google/genai";

export type LLMProvider = "deepseek" | "gemini" | "doubao";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callLLM(provider: LLMProvider, messages: ChatMessage[], model?: string) {
  if (provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const geminiModel = ai.models.generateContent({
      model: model || "gemini-3-flash-preview",
      contents: messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      })),
    });
    const response = await geminiModel;
    return response.text;
  }

  // For DeepSeek and others, we use our backend proxy
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, messages, model }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "AI 调用失败");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
