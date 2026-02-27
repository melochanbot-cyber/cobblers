import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Council, CouncilConfig } from "./council.js";
import { DEFAULT_MODELS } from "./openrouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createServer(port = 3000) {
  const app = express();
  
  app.use(express.json());
  app.use(express.static(join(__dirname, "..", "public")));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", models: DEFAULT_MODELS });
  });

  // Deliberation endpoint (non-streaming)
  app.post("/api/deliberate", async (req, res) => {
    try {
      const { question, agents = 3, rounds = 2, models = DEFAULT_MODELS } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      const council = new Council({ agents, rounds, models });
      const result = await council.deliberate(question);
      
      res.json(result);
    } catch (error) {
      console.error("Deliberation error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Streaming deliberation endpoint
  app.post("/api/deliberate/stream", async (req, res) => {
    try {
      const { question, agents = 3, rounds = 2, models = DEFAULT_MODELS } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const config: CouncilConfig = {
        agents,
        rounds,
        models,
        stream: true,
        onToken: (token) => {
          res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
        },
        onRoundStart: (round, persona) => {
          res.write(`data: ${JSON.stringify({ type: "round", round, persona: persona.name })}\n\n`);
        }
      };

      const council = new Council(config);
      const result = await council.deliberate(question);
      
      res.write(`data: ${JSON.stringify({ type: "done", result })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Streaming error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", error: String(error) })}\n\n`);
      res.end();
    }
  });

  // Code review endpoint
  app.post("/api/review", async (req, res) => {
    try {
      const { filePath, fileContent, agents = 3, rounds = 2, models = DEFAULT_MODELS } = req.body;
      
      if (!fileContent) {
        return res.status(400).json({ error: "File content is required" });
      }

      const council = new Council({ agents, rounds, models });
      const result = await council.review(filePath || "code", fileContent);
      
      res.json(result);
    } catch (error) {
      console.error("Review error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Decision endpoint
  app.post("/api/decide", async (req, res) => {
    try {
      const { options, agents = 3, rounds = 2, models = DEFAULT_MODELS } = req.body;
      
      if (!options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: "At least 2 options are required" });
      }

      const council = new Council({ agents, rounds, models });
      const result = await council.decide(options);
      
      res.json(result);
    } catch (error) {
      console.error("Decision error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  return app.listen(port, () => {
    console.log(`🪑 Cobblers server running at http://localhost:${port}`);
    console.log(`   Open in browser to use the web interface`);
  });
}
