import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import SuggestionCard from './SuggestionCard';
import FoodScanner from './FoodScanner';
import UploadPanel from './UploadPanel';


const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";


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
  const [reportContext, setReportContext] = useState("");

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

  const profilePayload = useMemo(() => ({
    age: profile.age || undefined,
    restrictions: (profile.restrictions || "").split(",").map(s => s.trim()).filter(Boolean),
    preferences: (profile.preferences || "").split(",").map(s => s.trim()).filter(Boolean),
    conditions: (profile.conditions || "").split(",").map(s => s.trim()).filter(Boolean),
  }), [profile]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setErr("");
    setLoading(true);

    setMessages(prev => [...prev, { role: "user", content: text, time: nowTime() }]);
    setInput("");

    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        message: text,
        profile: profilePayload,
        report_text: reportContext,
      });

      const botMessage = {
        role: 'assistant',
        content: res.data?.reply || 'Sorry, I encountered an issue.',
        structured: res.data?.structured || null,
        time: nowTime(),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Sorry, an error occurred: ${e?.response?.data?.detail || e.message}`, time: nowTime() }]);
    } finally {
      setLoading(false);
    }
  }

  // NEW: This function now contains the full logic to call the backend
const handleCapture = async (imageData) => {
  // Do nothing if the 'Retake' button was clicked which sends null
  if (!imageData) {
    return;
  }

  setErr("");
  setLoading(true);
  // Add a placeholder message to the chat UI
  setMessages(prev => [...prev, { role: "user", content: "📷 Analyzing Scanned Food...", time: nowTime() }]);

  const profilePayload = {
      age: profile.age || undefined,
      restrictions: (profile.restrictions || "").split(",").map(s => s.trim()).filter(Boolean),
      preferences: (profile.preferences || "").split(",").map(s => s.trim()).filter(Boolean),
      conditions: (profile.conditions || "").split(",").map(s => s.trim()).filter(Boolean),
    };
  try {
    // Send the image data and profile to the new backend endpoint
    const res = await axios.post(`${API_BASE}/analyze-food-image`, {
      image_data_url: imageData,
      profile: profilePayload,
      report_text: reportContext,
    });

    // The response format is the same as the chat endpoint, so we can reuse the logic
    const botMessage = {
      role: 'assistant',
      content: res.data?.reply || 'Sorry, I encountered an issue analyzing the image.',
      structured: res.data?.structured || null,
      time: nowTime(),
    };
    setMessages(prev => [...prev, botMessage]);

  } catch (e) {
    setMessages(prev => [...prev, { role: "assistant", content: `Sorry, an error occurred: ${e?.response?.data?.detail || e.message}`, time: nowTime() }]);
  } finally {
    setLoading(false);
  }
};

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        {/* Chat column */}
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, height: "80vh", display: "flex", flexDirection: "column" }}>
          <div style={{ overflowY: "auto", padding: "6px 6px 0 6px", flex: 1 }}>
            {messages.map((m, i) => (
              <div key={i}>
                <Bubble role={m.role} time={m.time}>{m.content}</Bubble>
                {m.role === 'assistant' && m.structured && (<SuggestionCard data={m.structured} />)}
              </div>
            ))}
            {loading && <Typing />}
            <div ref={endRef} />
          </div>

          <div style={{ marginTop: 8 }}>
            <textarea
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              placeholder="Type a message…"
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
        <aside style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, height: "80vh", overflowY: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Your Profile</h3>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
            Personalization helps NutriBot tailor eat/avoid lists.
          </div>
          <label>Age</label>
          <input type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
          <label>Diet preferences (comma separated)</label>
          <input type="text" value={profile.preferences} placeholder="e.g., vegetarian, high-protein" onChange={e => setProfile(p => ({ ...p, preferences: e.target.value }))} style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
          <label>Restrictions / Allergies (comma separated)</label>
          <input type="text" value={profile.restrictions} placeholder="e.g., lactose, gluten" onChange={e => setProfile(p => ({ ...p, restrictions: e.target.value }))} style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
          <label>Known conditions (comma separated)</label>
          <input type="text" value={profile.conditions} placeholder="e.g., type 2 diabetes" onChange={e => setProfile(p => ({ ...p, conditions: e.target.value }))} style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
            * We store this locally in your browser for the MVP.
          </div>
          <UploadPanel API_BASE={API_BASE} onAnalysisComplete={setReportContext} />
          <FoodScanner onCapture={handleCapture} isProcessing={loading} />
        </aside>
      </div>
    </main>
  );
}