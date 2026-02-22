
import { useState, useRef, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES = ["JavaScript","TypeScript","Python","Java","Ruby","Go","Rust","C++","C#","PHP","Swift","SQL","Other"];

const CATEGORIES = {
  bugs:        { label: "Bugs",        icon: "🐛", color: "#f87171" },
  security:    { label: "Security",    icon: "🔒", color: "#fb923c" },
  performance: { label: "Performance", icon: "⚡", color: "#facc15" },
  readability: { label: "Readability", icon: "📖", color: "#60a5fa" },
  suggestions: { label: "Suggestions", icon: "💡", color: "#4ade80" },
};

const SEV_COLOR = { high: "#f87171", medium: "#facc15", low: "#4ade80" };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 80) return "#4ade80";
  if (s >= 60) return "#facc15";
  return "#f87171";
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 36, c = 2 * Math.PI * r;
  const fill = (score / 100) * c;
  return (
    <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="48" cy="48" r={r} fill="none" stroke="#1e2535" strokeWidth="8" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={scoreColor(score)} strokeWidth="8"
        strokeDasharray={`${fill} ${c}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x="48" y="48" textAnchor="middle" dominantBaseline="central"
        style={{ fill: scoreColor(score), fontSize: 20, fontWeight: 800, fontFamily: "inherit", transform: "rotate(90deg)", transformOrigin: "48px 48px" }}>
        {score}
      </text>
    </svg>
  );
}

function IssueCard({ issue }) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORIES[issue.category];
  return (
    <div onClick={() => setOpen(!open)} style={{ border: `1px solid ${cat.color}30`, borderLeft: `3px solid ${cat.color}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8, background: "#0b0d14", cursor: "pointer", transition: "background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.background = "#0f1220"}
      onMouseLeave={e => e.currentTarget.style.background = "#0b0d14"}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: cat.color + "20", color: cat.color }}>{cat.icon} {cat.label}</span>
        {issue.line && <span style={{ fontSize: 11, color: "#475580" }}>Line {issue.line}</span>}
        {issue.severity && <span style={{ fontSize: 11, marginLeft: "auto", color: SEV_COLOR[issue.severity], background: SEV_COLOR[issue.severity] + "18", padding: "2px 7px", borderRadius: 4 }}>{issue.severity}</span>}
        <span style={{ color: "#475580", fontSize: 12, marginLeft: issue.severity ? 4 : "auto" }}>{open ? "▲" : "▼"}</span>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#c4cde0", lineHeight: 1.6 }}>{issue.message}</p>
      {open && issue.fix && (
        <div style={{ marginTop: 10, background: "#081408", border: "1px solid #1a3020", borderRadius: 6, padding: "10px 12px" }}>
          <p style={{ fontSize: 11, color: "#4ade80", margin: "0 0 6px", letterSpacing: 0.5 }}>💡 SUGGESTED FIX</p>
          <pre style={{ fontSize: 12, color: "#86efac", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>{issue.fix}</pre>
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ review, loading, error }) {
  const [activeTab, setActiveTab] = useState("all");

  const allIssues = review
    ? Object.entries(review.categories || {}).flatMap(([cat, items]) => (items || []).map(i => ({ ...i, category: cat })))
    : [];

  const filtered = activeTab === "all" ? allIssues : allIssues.filter(i => i.category === activeTab);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 44, height: 44, border: "3px solid #1e2535", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#475580", fontSize: 14 }}>Claude is reviewing your code...</p>
    </div>
  );

  if (error) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <p style={{ color: "#f87171", fontSize: 14, textAlign: "center", maxWidth: 320 }}>{error}</p>
    </div>
  );

  if (!review) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#2a3050" }}>
      <div style={{ fontSize: 52 }}>🔍</div>
      <p style={{ fontSize: 14 }}>Results will appear here</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 300, marginTop: 8 }}>
        {Object.values(CATEGORIES).map(c => (
          <span key={c.label} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${c.color}30`, color: c.color + "99" }}>
            {c.icon} {c.label}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      {/* Score + Summary */}
      <div style={{ background: "#0b0d14", border: "1px solid #1e2535", borderRadius: 12, padding: 20, marginBottom: 16, display: "flex", gap: 20, alignItems: "center" }}>
        <ScoreRing score={review.score} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: "#475580", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>Overall Quality</p>
          <p style={{ fontSize: 13, color: "#94a3c0", lineHeight: 1.7, margin: 0 }}>{review.summary}</p>
          {review.pr && (
            <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#60a5fa" }}>📁 {review.pr.filesChanged} files</span>
              <span style={{ fontSize: 11, color: "#4ade80" }}>+{review.pr.additions}</span>
              <span style={{ fontSize: 11, color: "#f87171" }}>-{review.pr.deletions}</span>
              <a href={review.pr.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#a78bfa", textDecoration: "none" }}>View on GitHub ↗</a>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[["all", "All", allIssues.length, "#60a5fa"], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.label, (review.categories?.[k] || []).length, v.color])].map(([key, label, count, color]) => {
          if (key !== "all" && count === 0) return null;
          const active = activeTab === key;
          return (
            <button key={key} onClick={() => setActiveTab(key)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${active ? color : "#1e2535"}`, background: active ? color + "20" : "transparent", color: active ? color : "#475580", cursor: "pointer", fontSize: 12, fontFamily: "inherit", transition: "all 0.15s" }}>
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Issues */}
      {filtered.length === 0
        ? <div style={{ textAlign: "center", color: "#2a3050", padding: 32, fontSize: 13 }}>No issues in this category 🎉</div>
        : filtered.map((issue, i) => <IssueCard key={i} issue={issue} />)
      }
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("paste");          // "paste" | "pr"
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [prUrl, setPrUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem("cr_history") || "[]")); } catch {}
  }, []);

  const saveHistory = (entry) => {
    const updated = [entry, ...history.slice(0, 14)];
    setHistory(updated);
    localStorage.setItem("cr_history", JSON.stringify(updated));
  };

  const handleReview = async () => {
    setLoading(true); setError(null); setReview(null);
    try {
      let endpoint, body;
      if (mode === "paste") {
        if (!code.trim()) { setError("Please paste some code first."); setLoading(false); return; }
        endpoint = "/api/review/code";
        body = { code, language };
      } else {
        if (!prUrl.trim()) { setError("Please enter a GitHub PR URL."); setLoading(false); return; }
        endpoint = "/api/review/pr";
        body = { prUrl, githubToken: githubToken || undefined };
      }

      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      setReview(data);
      saveHistory({ mode, label: mode === "paste" ? `${language} — ${code.slice(0, 60)}...` : prUrl, review: data, timestamp: Date.now() });
    } catch (err) {
      setError(err.message || "Could not connect to backend. Make sure the server is running on port 3001.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = mode === "paste" ? code.trim().length > 0 : prUrl.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080a10", color: "#d4daf0", fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace", display: "flex", flexDirection: "column" }}>
      {/* ── HEADER ── */}
      <header style={{ borderBottom: "1px solid #1a1f30", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080a10", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, #60a5fa, #a78bfa)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚙</div>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.5px" }}>
            CodeReview<span style={{ color: "#60a5fa" }}>AI</span>
          </span>
          <span style={{ fontSize: 11, color: "#3a4560", marginLeft: 4, border: "1px solid #1a2535", padding: "2px 7px", borderRadius: 4 }}>powered by Claude</span>
        </div>
        <button onClick={() => setShowHistory(!showHistory)}
          style={{ background: showHistory ? "#1a1f30" : "transparent", border: "1px solid #1a1f30", color: "#5a6585", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
          📋 History ({history.length})
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── HISTORY SIDEBAR ── */}
        {showHistory && (
          <div style={{ width: 260, borderRight: "1px solid #1a1f30", background: "#080a10", overflowY: "auto", padding: 14, flexShrink: 0 }}>
            <p style={{ fontSize: 11, color: "#3a4560", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Recent Reviews</p>
            {history.length === 0 && <p style={{ color: "#2a3050", fontSize: 12 }}>No reviews yet.</p>}
            {history.map((h, i) => (
              <div key={i} onClick={() => { setReview(h.review); setShowHistory(false); }}
                style={{ padding: "10px 11px", borderRadius: 7, border: "1px solid #1a1f30", marginBottom: 7, cursor: "pointer", background: "#0b0d14" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#2a3550"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1f30"}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: h.mode === "pr" ? "#a78bfa" : "#60a5fa", textTransform: "uppercase" }}>{h.mode === "pr" ? "PR" : "Code"}</span>
                  <span style={{ fontSize: 10, color: "#3a4560" }}>{timeAgo(h.timestamp)}</span>
                </div>
                <div style={{ fontSize: 11, color: "#5a6585", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{h.label}</div>
                <span style={{ fontSize: 11, color: scoreColor(h.review.score) }}>Score: {h.review.score}/100</span>
              </div>
            ))}
          </div>
        )}

        {/* ── LEFT PANEL: INPUT ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #1a1f30", minWidth: 0 }}>
          {/* Mode Toggle */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #1a1f30", display: "flex", gap: 8, alignItems: "center" }}>
            {[["paste", "📝 Paste Code"], ["pr", "🔀 GitHub PR"]].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setReview(null); setError(null); }}
                style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${mode === m ? "#60a5fa" : "#1a1f30"}`, background: mode === m ? "#60a5fa18" : "transparent", color: mode === m ? "#60a5fa" : "#5a6585", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: mode === m ? 600 : 400, transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Paste Code Mode */}
          {mode === "paste" && (
            <>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid #1a1f30", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "#3a4560", textTransform: "uppercase", letterSpacing: 1 }}>Language</span>
                <select value={language} onChange={e => setLanguage(e.target.value)}
                  style={{ background: "#1a1f30", border: "1px solid #252b40", color: "#d4daf0", padding: "4px 10px", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#2a3050" }}>{code.length} chars</span>
              </div>
              <textarea ref={textareaRef} value={code} onChange={e => setCode(e.target.value)}
                placeholder={`// Paste your ${language} code here...\n// Claude will analyze it for:\n//  🐛 Bugs   🔒 Security   ⚡ Performance\n//  📖 Readability   💡 Suggestions`}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#b8c4e0", padding: "18px 16px", fontSize: 13, lineHeight: 1.75, resize: "none", fontFamily: "inherit" }} />
            </>
          )}

          {/* GitHub PR Mode */}
          {mode === "pr" && (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#5a6585", display: "block", marginBottom: 6 }}>GitHub PR URL <span style={{ color: "#f87171" }}>*</span></label>
                <input value={prUrl} onChange={e => setPrUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/123"
                  style={{ width: "100%", background: "#0b0d14", border: "1px solid #1e2535", color: "#d4daf0", padding: "10px 12px", borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "#60a5fa"}
                  onBlur={e => e.target.style.borderColor = "#1e2535"} />
                <p style={{ fontSize: 11, color: "#3a4560", marginTop: 5 }}>Must be a public repo, or provide a GitHub token below.</p>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: "#5a6585" }}>GitHub Token <span style={{ color: "#3a4560" }}>(optional)</span></label>
                  <button onClick={() => setShowToken(!showToken)}
                    style={{ fontSize: 10, background: "transparent", border: "1px solid #1e2535", color: "#3a4560", padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}>
                    {showToken ? "hide" : "show"}
                  </button>
                </div>
                <input type={showToken ? "text" : "password"} value={githubToken} onChange={e => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  style={{ width: "100%", background: "#0b0d14", border: "1px solid #1e2535", color: "#d4daf0", padding: "10px 12px", borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "#60a5fa"}
                  onBlur={e => e.target.style.borderColor = "#1e2535"} />
                <p style={{ fontSize: 11, color: "#3a4560", marginTop: 5 }}>Get a token at github.com/settings/tokens — no scopes needed for public repos.</p>
              </div>
              <div style={{ background: "#0b0d14", border: "1px solid #1e2535", borderRadius: 8, padding: 14 }}>
                <p style={{ fontSize: 12, color: "#5a6585", margin: "0 0 8px" }}>ℹ️ How GitHub PR review works:</p>
                <ul style={{ fontSize: 12, color: "#3a4560", margin: 0, paddingLeft: 16, lineHeight: 2 }}>
                  <li>Fetches the PR diff from GitHub API</li>
                  <li>Sends the changed files to Claude for analysis</li>
                  <li>Returns categorized feedback with a quality score</li>
                </ul>
              </div>
            </div>
          )}

          {/* Submit Bar */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1f30", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <button onClick={handleReview} disabled={loading || !canSubmit}
              style={{ background: loading || !canSubmit ? "#1a1f30" : "linear-gradient(135deg, #60a5fa, #a78bfa)", border: "none", color: loading || !canSubmit ? "#3a4560" : "#fff", padding: "10px 22px", borderRadius: 8, cursor: loading || !canSubmit ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
              {loading
                ? <><span style={{ animation: "spin 0.9s linear infinite", display: "inline-block" }}>⟳</span> Analyzing...</>
                : <><span>▶</span> {mode === "pr" ? "Review PR" : "Review Code"}</>
              }
            </button>
            <button onClick={() => { setCode(""); setPrUrl(""); setReview(null); setError(null); }}
              style={{ background: "transparent", border: "1px solid #1a1f30", color: "#475580", padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              Clear
            </button>
            {error && <span style={{ fontSize: 12, color: "#f87171", flex: 1 }}>{error}</span>}
          </div>
        </div>

        {/* ── RIGHT PANEL: RESULTS ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <ReviewPanel review={review} loading={loading} error={error} />
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #080a10; }
        ::-webkit-scrollbar-thumb { background: #1a1f30; border-radius: 3px; }
        input::placeholder, textarea::placeholder { color: #2a3050; }
        select option { background: #1a1f30; }
      `}</style>
    </div>
  );
}
