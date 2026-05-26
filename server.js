const http = require("http");
const https = require("https");

const API_KEY = process.env.ANTHROPIC_API_KEY;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  if (req.method === "POST" && req.url === "/chat") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      console.log("Received request:", body.substring(0, 100));
      
      let parsed;
      try { parsed = JSON.parse(body); } 
      catch(e) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid JSON" })); return; }

      const payload = JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: "You are an expert AI Career Mentor with 15+ years of experience. Give specific, actionable career advice. Be warm, practical and direct. Keep responses to 2-4 paragraphs.",
        messages: parsed.messages,
      });

      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(payload),
        },
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = "";
        apiRes.on("data", (chunk) => { data += chunk; });
        apiRes.on("end", () => {
          console.log("Anthropic response status:", apiRes.statusCode);
          console.log("Anthropic response:", data.substring(0, 200));
          res.writeHead(apiRes.statusCode, { "Content-Type": "application/json" });
          res.end(data);
        });
      });

      apiReq.on("error", (e) => { 
        console.error("API request error:", e.message);
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
