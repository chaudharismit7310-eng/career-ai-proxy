const http = require("http");
const https = require("https");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  if (req.method === "POST" && req.url === "/chat") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      let parsed;
      try { parsed = JSON.parse(body); }
      catch(e) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid JSON" })); return; }

      // Convert messages to Gemini format
      const contents = parsed.messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }))

      const payload = JSON.stringify({
        system_instruction: {
          parts: [{ text: "You are an expert AI Career Mentor with 15+ years of experience in career coaching, HR, and talent development. Give specific, actionable career advice. Be warm, practical and direct. Keep responses to 2-4 paragraphs." }]
        },
        contents: contents
      });

      const path = `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const options = {
        hostname: "generativelanguage.googleapis.com",
        path: path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = "";
        apiRes.on("data", (chunk) => { data += chunk; });
        apiRes.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ text }));
          } catch(e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Parse error" }));
          }
        });
      });

      apiReq.on("error", (e) => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      });
      apiReq.write(payload);
      apiReq.end();
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
