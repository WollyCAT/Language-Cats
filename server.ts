import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Grammar Check
  app.post("/api/check-grammar", async (req, res) => {
    try {
      const { text, provider, model, apiKey, language } = req.body;
      let finalApiKey = apiKey;
      if (!finalApiKey && provider === "google" && process.env.GEMINI_API_KEY) {
        finalApiKey = process.env.GEMINI_API_KEY;
      }

      if (!finalApiKey) {
        return res.status(400).json({ error: "API key is required." });
      }

      const systemPrompt = `You are an expert grammar checker. The user provides a text in ${language}.
Your task is to identify grammatical errors, typos, wrong tenses, and inappropriate word combinations.
Return ONLY a JSON object with this exact structure:
{
  "errors": [
    {
      "originalText": "the exact wrong part/phrase in the user's text",
      "suggestedChange": "the corrected text",
      "reason": "brief reason for the change"
    }
  ]
}
If there are no errors, return { "errors": [] }. Ensure originalText matches the user's text exactly to allow highlighting.`;

      let resultJson = "";

      if (provider === "google") {
        const ai = new GoogleGenAI({ apiKey: finalApiKey });
        const response = await ai.models.generateContent({
          model: model || "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text }] }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });
        resultJson = response.text || '{"errors":[]}';
      } else if (provider === "openai") {
        const ai = new OpenAI({ apiKey: finalApiKey });
        const response = await ai.chat.completions.create({
          model: model || "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });
        resultJson = response.choices[0].message.content || '{"errors":[]}';
      } else if (provider === "anthropic") {
        const ai = new Anthropic({ apiKey: finalApiKey });
        const response = await ai.messages.create({
          model: model || "claude-3-5-sonnet-20241022",
          system: systemPrompt,
          messages: [{ role: "user", content: text }],
          max_tokens: 1024,
          temperature: 0.2,
        });
        const textContent = response.content.find(c => c.type === 'text');
        resultJson = textContent && 'text' in textContent ? textContent.text : '{"errors":[]}';
      }

      try {
        // Strip markdown if anthropic wrapped it in ```json
        const cleanJson = resultJson.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        res.json(parsed);
      } catch (e) {
        res.status(500).json({ error: "Failed to parse API response as JSON.", details: resultJson });
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to process request." });
    }
  });

  // API Route for Tone Revision
  app.post("/api/revise-tone", async (req, res) => {
    try {
      const { text, provider, model, apiKey, language, tone } = req.body;
      let finalApiKey = apiKey;
      if (!finalApiKey && provider === "google" && process.env.GEMINI_API_KEY) {
        finalApiKey = process.env.GEMINI_API_KEY;
      }

      if (!finalApiKey) {
        return res.status(400).json({ error: "API key is required." });
      }

      const systemPrompt = `Rewrite the following text in ${language} to sound more ${tone}. Maintain the original meaning but apply the requested tone perfectly. Reply ONLY with the revised text, no explanations.`;

      let revisedText = "";

      if (provider === "google") {
        const ai = new GoogleGenAI({ apiKey: finalApiKey });
        const response = await ai.models.generateContent({
          model: model || "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text }] }],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          },
        });
        revisedText = response.text || "";
      } else if (provider === "openai") {
        const ai = new OpenAI({ apiKey: finalApiKey });
        const response = await ai.chat.completions.create({
          model: model || "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
          ],
          temperature: 0.7,
        });
        revisedText = response.choices[0].message.content || "";
      } else if (provider === "anthropic") {
        const ai = new Anthropic({ apiKey: finalApiKey });
        const response = await ai.messages.create({
          model: model || "claude-3-5-sonnet-20241022",
          system: systemPrompt,
          messages: [{ role: "user", content: text }],
          max_tokens: 1024,
          temperature: 0.7,
        });
        const textContent = response.content.find(c => c.type === 'text');
        revisedText = textContent && 'text' in textContent ? textContent.text : '';
      }

      res.json({ revisedText });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to process request." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Provide a fallback for React Router using * or *all depending on express version
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
