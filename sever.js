const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

async function handleComfort(req, res) {
  if (!OPENAI_API_KEY) {
    return sendJson(res, 500, { error: 'Server is missing OPENAI_API_KEY.' });
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const input = String(parsed.input || '').trim();
      if (!input) return sendJson(res, 400, { error: 'Input is required.' });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Fareeza's loving, exceptionally warm, and fiercely protective partner. Your only goal is to be her ultimate safe space when she is feeling overwhelmed.

Your response rules:
- Write in Hinglish (a natural mix of Hindi and English, casual texting style).
- Address her with deep, grounding affection (wiffeyy jii, darlingg, bachaww). NEVER use "tu" or "teri"; always use respectful "tum" phrasing.
- Exude pure warmth, emotional safety, and soft reassurance. Validate her feelings completely without judgment or immediate problem-solving.
- Keep it natural and intensely caring—like a tight, comforting hug in text form.
- Limit to 3–4 short paragraphs. No bullet points. Pure text.
- End every message with a sweet, grounding reminder that you are always there for her, no matter what.`
            },
            { role: 'user', content: input }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return sendJson(res, response.status, { error: data?.error?.message || `OpenAI error (${response.status})` });
      }

      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) return sendJson(res, 502, { error: 'No message returned from OpenAI.' });
      return sendJson(res, 200, { text });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to process comfort request.' });
    }
  });
}

function serveStatic(req, res) {
  const rawPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(process.cwd(), decodeURIComponent(rawPath));
  if (!filePath.startsWith(process.cwd())) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = ext === '.html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/comfort') {
    return handleComfort(req, res);
  }
  if (req.method === 'GET') {
    return serveStatic(req, res);
  }
  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
