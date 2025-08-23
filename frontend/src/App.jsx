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
  const [isProfileOpen, setIsProfileOpen] = useState(true);

  // New state for the modal and image attachment
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);

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

  // Updated canSend logic to allow sending with just an image
  const canSend = useMemo(() => (input.trim().length > 0 || attachedImage) && !loading, [input, attachedImage, loading]);

  const profilePayload = useMemo(() => ({
    age: profile.age || undefined,
    restrictions: (profile.restrictions || "").split(",").map(s => s.trim()).filter(Boolean),
    preferences: (profile.preferences || "").split(",").map(s => s.trim()).filter(Boolean),
    conditions: (profile.conditions || "").split(",").map(s => s.trim()).filter(Boolean),
  }), [profile]);

  // Updated send function to handle both text and image
  async function send() {
    const text = input.trim();
    if (!text && !attachedImage) return;

    setErr("");
    setLoading(true);

    // Create a user message with text and a small indicator for the image
    const userMessageContent = text + (attachedImage ? " 📷" : "");
    setMessages(prev => [...prev, { role: "user", content: userMessageContent.trim(), time: nowTime() }]);

    // Clear inputs after sending
    setInput("");
    const imageToSend = attachedImage;
    setAttachedImage(null);

    try {
      const endpoint = imageToSend ? "/chat-with-image" : "/chat";
      const payload = {
        message: text,
        profile: profilePayload,
        report_text: reportContext,
        image_data_url: imageToSend,
      };

      const res = await axios.post(`${API_BASE}${endpoint}`, payload);

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

  // Functions to manage the camera modal
  const openScanner = () => setIsScannerOpen(true);
  const closeScanner = () => setIsScannerOpen(false);
  const handleCapture = (imageData) => {
    setAttachedImage(imageData);
  };

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) send();
    }
  }

 return (
    <>
    <main style={{ maxWidth: 900, margin: "1.5rem auto", fontFamily: "Inter, system-ui", padding: "0 12px" }}>
  {/* Header with Profile Button */}
  <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: '8px' }}>
    <h1 style={{ margin: 0, fontSize: '24px' }}>NutriBot</h1>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <small>Backend: {health ? "OK" : (err || "checking…")}</small>
      <button
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        style={{
          background: '#6d28d9',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Toggle Profile Panel"
      >
        S
      </button>
    </div>
  </header>

  {/* Main Layout Grid */}
  <div style={{ display: "grid", gridTemplateColumns: isProfileOpen ? "1fr 380px" : "1fr", gap: isProfileOpen ? 16 : 0, transition: 'all 0.3s ease-in-out' }}>
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

      {/* === FINAL GEMINI-STYLE CHAT INPUT === */}
      <div style={{ marginTop: 8 }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f1f5f9',
          borderRadius: '24px',
          padding: '4px'
        }}>
          {/* Attachment preview */}
          {attachedImage && (
            <div style={{ paddingLeft: '10px' }}>
              <img src={attachedImage} height="40" style={{ borderRadius: '4px' }} alt="Attachment" />
              <button onClick={() => setAttachedImage(null)} style={{ position: 'absolute', top: '5px', left: '45px', background: '#777', color: 'white', border: 'none', width: '16px', height: '16px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '10px' }}>X</button>
            </div>
          )}
          {/* Textarea */}
          <textarea
            rows={1}
            style={{
              width: "100%",
              height: '48px',
              padding: '12px 100px 12px 15px',
              borderRadius: '20px',
              border: "none",
              resize: 'none',
              outline: 'none',
              fontSize: '16px',
              boxSizing: 'border-box',
              background: 'transparent',
              fontFamily: 'inherit'
            }}
            placeholder="Type a message or scan a food..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {/* Buttons container */}
          <div style={{ position: 'absolute', right: '10px', bottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={openScanner} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', padding: '5px' }} title="Scan a food item">
              📷
            </button>
            <button onClick={send} disabled={!canSend} style={{
              padding: "8px 16px",
              border: 'none',
              borderRadius: '20px',
              background: canSend ? '#6d28d9' : '#e5e7eb',
              color: canSend ? 'white' : '#9ca3af',
              cursor: canSend ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s ease'
            }}>
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
        {/* Clear Chat button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button onClick={() => setMessages([])} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>Clear chat</button>
        </div>
      </div>
    </section>

    {/* Profile column is now conditional */}
    {isProfileOpen && (
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
        <UploadPanel API_BASE={API_BASE} onAnalysisComplete={setReportContext} />
      </aside>
    )}
  </div>
</main>

      <FoodScanner
        isOpen={isScannerOpen}
        onRequestClose={closeScanner}
        onCapture={handleCapture}
      />
    </>
  );

 }