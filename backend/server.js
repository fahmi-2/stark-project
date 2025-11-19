import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://localhost:3002" }));
app.use(express.json());

let conversationHistory = [];

// ===== Gemini Chat Endpoint =====
app.post("/api/chat", async (req, res) => {
  try {
    const API_KEY = process.env.GEMINI_API_KEY;

    const userMessage = req.body.messages?.at(-1)?.content;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }],
        }),
      }
    );

    const json = await geminiRes.json();
    const answer =
      json.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Maaf, tidak ada jawaban dari Gemini.";

    return res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini error" });
  }
});

// ===== Proxy untuk frontend React =====
app.post("/proxy/gemini/chat", async (req, res) => {
  try {
    const resp = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: req.body.messages.at(-1).content }),
    });

    const data = await resp.json();
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error" });
  }
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});