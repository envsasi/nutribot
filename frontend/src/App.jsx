import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function Bubble({ role, children, time }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", margin: "6px 0" }}>
      <div style={{
        maxWidth: 640,
        padding: "10px 12px",
        borderRadius: 12,
        background: isUser ? "#2563eb" : "#f1f5f9",
        color: isUser ? "white" : "#111827",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)"
      }}>
        <div style={{ whiteSpace: "pre-wrap" }}>{children}</div>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7, textAlign: isUser ? "right" : "left" }}>
          {time}
        </div>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div style={{ display: "flex", gap: 6, padding: "6px 10px", background: "#f8fafc", borderRadius: 12, width: 64 }}>
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      <style>{`
        .dot {
          width: 6px; height: 6px; border-radius: 999px; background:#94a3b8;
          display:inline-block; animation: bounce 1s infinite;
        }
        .dot:nth-child(2){ animation-delay: .15s }
        .dot:nth-child(3){ animation-delay: .3s }
        @keyframes bounce { 0%, 80%, 100% {transform: scale(0.7)} 40% {transform: scale(1)} }
      `}</style>
    </div>
  );
}

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("nb_messages");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("nb_profile");
      return saved ? JSON.parse(saved) : { age: "", restrictions: "", preferences: "", conditions: "" };
    } catch { return { age: "", restrictions: "", preferences: "", conditions: "" }; }
  });

  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    axios.get(`${API_BASE}/health`).then(r => setHealth(r.data)).catch(e => setErr(e.message));
  }, []);

  useEffect(() => { localStorage.setItem("nb_messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem("nb_profile", JSON.stringify(profile)); }, [profile]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setErr(""); setLoading(true);

    // 1) Add user message
    setMessages(prev => [...prev, { role: "user", content: text, time: nowTime() }]);
    setInput("");

    // 2) Build the profile object in a simple JSON shape for backend
    const profilePayload = {
      age: profile.age || undefined,
      restrictions: (profile.restrictions || "").split(",").map(s => s.trim()).filter(Boolean),
      preferences: (profile.preferences || "").split(",").map(s => s.trim()).filter(Boolean),
      conditions: (profile.conditions || "").split(",").map(s => s.trim()).filter(Boolean),
    };

    try {
      const res = await axios.post(`${API_BASE}/chat`, { message: text, profile: profilePayload });
      const reply = res.data?.reply || "No reply";
      const structured = res.data?.structured || null;

      let pretty = reply;
      if (structured) {
        const lines = [];
        if (structured.what_to_eat?.length) lines.push(`\nWhat to eat: ${structured.what_to_eat.join(", ")}`);
        if (structured.what_to_avoid?.length) lines.push(`What to avoid: ${structured.what_to_avoid.join(", ")}`);
        if (structured.timing?.length) lines.push(`Timing: ${structured.timing.join(" | ")}`);
        if (structured.notes) lines.push(`Notes: ${structured.notes}`);
        if (structured.disclaimer) lines.push(`\n${structured.disclaimer}`);
        pretty = reply + "\n" + lines.join("\n");
      }

      setMessages(prev => [...prev, { role: "assistant", content: pretty.trim(), time: nowTime() }]);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry—something went wrong. Please try again.", time: nowTime() }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) send();
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "1.5rem auto", fontFamily: "Inter, system-ui", padding: "0 12px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>NutriBot</h1>
        <small>Backend: {health ? "OK" : (err || "checking…")}</small>
      </header>

      {/* Layout: left chat, right profile */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* Chat column */}
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, height: "70vh", display: "flex", flexDirection: "column" }}>
          <div style={{ overflowY: "auto", padding: "6px 6px 0 6px", flex: 1 }}>
            {messages.length === 0 && (
              <div style={{ color: "#6b7280", fontSize: 14, margin: "8px 0 14px" }}>
                Ask anything like: “What foods are good for migraine?” or “Type 2 diabetes breakfast ideas”.
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} role={m.role} time={m.time}>{m.content}</Bubble>)}
            {loading && <Typing />}
            <div ref={endRef} />
          </div>

          <div style={{ marginTop: 8 }}>
            <textarea
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={send} disabled={!canSend} style={{ padding: "8px 12px" }}>
                {loading ? "Thinking…" : "Send"}
              </button>
              <button onClick={() => setMessages([])} style={{ padding: "8px 12px" }}>Clear chat</button>
            </div>
            {err && <div style={{ color: "crimson", marginTop: 8 }}>Error: {err}</div>}
          </div>
        </section>

        {/* Profile column */}
        <aside style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, height: "70vh", overflowY: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Your Profile</h3>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
            Personalization helps NutriBot tailor eat/avoid lists.
          </div>

          <label>Age</label>
          <input
            type="number"
            value={profile.age}
            onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
            style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />

          <label>Diet preferences (comma separated)</label>
          <input
            type="text"
            value={profile.preferences}
            placeholder="e.g., vegetarian, high-protein"
            onChange={e => setProfile(p => ({ ...p, preferences: e.target.value }))}
            style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />

          <label>Restrictions / Allergies (comma separated)</label>
          <input
            type="text"
            value={profile.restrictions}
            placeholder="e.g., lactose, gluten"
            onChange={e => setProfile(p => ({ ...p, restrictions: e.target.value }))}
            style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />

          <label>Known conditions (comma separated)</label>
          <input
            type="text"
            value={profile.conditions}
            placeholder="e.g., type 2 diabetes"
            onChange={e => setProfile(p => ({ ...p, conditions: e.target.value }))}
            style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />

          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
            * We store this locally in your browser for the MVP.
          </div>
        </aside>
      </div>
    </main>
  );
}
