import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  const [health, setHealth] = useState(null);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [structured, setStructured] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    axios.get(`${API_BASE}/health`)
      .then(r => setHealth(r.data))
      .catch(e => setErr(e.message));
  }, []);

  const send = async () => {
    const msg = message.trim();
    if (!msg) return;
    setLoading(true); setErr(""); setReply(""); setStructured(null);
    try {
      const res = await axios.post(`${API_BASE}/chat`, { message: msg });
      setReply(res.data?.reply || "");
      setStructured(res.data?.structured || null);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>NutriBot</h1>
      <section style={{ marginBottom: 12 }}>
        <small>Backend health: {health ? "OK" : err || "checking..."}</small>
      </section>

      <textarea
        rows={4}
        style={{ width: "100%", padding: 8 }}
        placeholder="e.g., I have a migraine, what foods should I eat?"
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button onClick={send} disabled={loading || !message.trim()}>
          {loading ? "Thinking..." : "Send"}
        </button>
        <button onClick={() => { setMessage(""); setReply(""); setStructured(null); }}>
          Clear
        </button>
      </div>

      {reply && (
        <div style={{ marginTop: 16, background: "#f7f7f8", padding: 12, borderRadius: 8 }}>
          <b>Bot:</b>
          <div style={{ whiteSpace: "pre-wrap" }}>{reply}</div>
        </div>
      )}

      {structured && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #e5e5e5", borderRadius: 8 }}>
          <b>Structured summary</b>
          <ul>
            {structured.condition && <li><b>Condition:</b> {structured.condition}</li>}
            {structured.what_to_eat?.length ? <li><b>Eat:</b> {structured.what_to_eat.join(", ")}</li> : null}
            {structured.what_to_avoid?.length ? <li><b>Avoid:</b> {structured.what_to_avoid.join(", ")}</li> : null}
            {structured.timing?.length ? <li><b>Timing:</b> {structured.timing.join(" | ")}</li> : null}
            {structured.notes && <li><b>Notes:</b> {structured.notes}</li>}
            {structured.disclaimer && <li><i>{structured.disclaimer}</i></li>}
          </ul>
        </div>
      )}

      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}
    </main>
  );
}
