require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50kb" }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Shared: build Claude prompt ───────────────────────────────────────────
function buildPrompt(code, language, context = "") {
  return `You are a senior software engineer doing a thorough code review.
${context ? `Context: ${context}` : ""}

Analyze the following ${language} code and return ONLY valid JSON — no markdown fences, no explanation outside the JSON.

Code:
\`\`\`${language}
${code}
\`\`\`

Return exactly this JSON structure:
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "categories": {
    "bugs":        [{ "message": "...", "line": <number|null>, "severity": "high|medium|low", "fix": "..." }],
    "security":    [{ "message": "...", "line": <number|null>, "severity": "high|medium|low", "fix": "..." }],
    "performance": [{ "message": "...", "line": <number|null>, "severity": "high|medium|low", "fix": "..." }],
    "readability": [{ "message": "...", "line": <number|null>, "severity": "high|medium|low", "fix": "..." }],
    "suggestions": [{ "message": "...", "line": <number|null>, "severity": "high|medium|low", "fix": "..." }]
  }
}

Rules:
- Only include real issues you find. Empty arrays are fine.
- Keep messages concise and actionable.
- "fix" should be a short code snippet or clear one-line instruction.`;
}

// ─── Route 1: Review pasted code ───────────────────────────────────────────
app.post("/api/review/code", async (req, res) => {
  const { code, language } = req.body;
  if (!code || !language) return res.status(400).json({ error: "code and language are required" });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: buildPrompt(code, language) }],
    });

    const raw = message.content[0].text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Claude API error", details: err.message });
  }
});

// ─── Route 2: Review GitHub PR ─────────────────────────────────────────────
// Accepts: { prUrl: "https://github.com/owner/repo/pull/123", githubToken: "optional" }
app.post("/api/review/pr", async (req, res) => {
  const { prUrl, githubToken } = req.body;
  if (!prUrl) return res.status(400).json({ error: "prUrl is required" });

  // Parse GitHub PR URL
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return res.status(400).json({ error: "Invalid GitHub PR URL. Expected: https://github.com/owner/repo/pull/123" });

  const [, owner, repo, pullNumber] = match;
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CodeReviewAI",
    ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
  };

  try {
    // Fetch PR metadata
    const prRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, { headers });
    const pr = prRes.data;

    // Fetch PR diff
    const diffRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`, { headers });
    const files = diffRes.data;

    if (!files.length) return res.status(400).json({ error: "No changed files found in this PR" });

    // Build a combined diff string (limit to 6000 chars to stay within token budget)
    let combinedDiff = files
      .map((f) => `### ${f.filename} (+${f.additions} -${f.deletions})\n${f.patch || "(binary or no patch)"}`)
      .join("\n\n");

    if (combinedDiff.length > 6000) combinedDiff = combinedDiff.slice(0, 6000) + "\n\n[...truncated for length]";

    const context = `GitHub PR #${pullNumber} — "${pr.title}" by ${pr.user.login}. Files changed: ${files.length}.`;
    const language = detectLanguage(files);

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: buildPrompt(combinedDiff, language, context) }],
    });

    const raw = message.content[0].text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const review = JSON.parse(raw);

    // Attach PR metadata to response
    res.json({
      ...review,
      pr: {
        title: pr.title,
        author: pr.user.login,
        filesChanged: files.length,
        additions: pr.additions,
        deletions: pr.deletions,
        url: pr.html_url,
      },
    });
  } catch (err) {
    if (err.response?.status === 404) return res.status(404).json({ error: "PR not found. Check the URL and make sure the repo is public (or provide a GitHub token)." });
    if (err.response?.status === 403) return res.status(403).json({ error: "GitHub rate limit hit. Add a GitHub token in settings to increase the limit." });
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch PR", details: err.message });
  }
});

// ─── Route 3: Health check ─────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// ─── Helpers ───────────────────────────────────────────────────────────────
function detectLanguage(files) {
  const ext = files[0]?.filename?.split(".").pop()?.toLowerCase();
  const map = { js: "JavaScript", ts: "TypeScript", jsx: "JavaScript", tsx: "TypeScript", py: "Python", rb: "Ruby", java: "Java", go: "Go", rs: "Rust", cpp: "C++", cs: "C#", php: "PHP", swift: "Swift" };
  return map[ext] || "Code";
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
