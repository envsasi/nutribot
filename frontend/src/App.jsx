import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import SuggestionCard from './SuggestionCard';
import FoodScanner from './FoodScanner';
import UploadPanel from './UploadPanel';
import DefaultProfileIcon from './DefaultProfileIcon';
import WelcomeModal from './WelcomeModal';
import TextareaAutosize from 'react-textarea-autosize';


const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function Bubble({ role, children, time }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", margin: "6px 0" }}>
      <div style={{
        maxWidth: 640,
        padding: "10px 12px",
        borderRadius: 12,
        // UPDATED COLORS
       background: isUser ? '#3c4043' : '#3c4043', // User is light grey, bot is darker grey
        color: '#e3e3e3',
        boxShadow: "0 1px 2px rgba(0,0,0,0.5)"
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

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
    // Add name to the initial state
    return saved ? JSON.parse(saved) : { name: "", age: "", restrictions: "", preferences: "", conditions: "" };
  } catch { return { name: "", age: "", restrictions: "", preferences: "", conditions: "" }; }
});

  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    axios.get(`${API_BASE}/health`).then(r => setHealth(r.data)).catch(e => setErr(e.message));
  }, []);

  useEffect(() => { localStorage.setItem("nb_messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem("nb_profile", JSON.stringify(profile)); }, [profile]);

    useEffect(() => {
    const hasVisitedBefore = localStorage.getItem('nutribot_has_visited');
    if (!hasVisitedBefore) {
        setIsWelcomeModalOpen(true);
        localStorage.setItem('nutribot_has_visited', 'true');
    }
}, []);

const closeWelcomeModal = () => setIsWelcomeModalOpen(false);// The empty array [] ensures this runs only once
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
<main style={{
    maxWidth: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "Inter, system-ui"
}}>
    {/* Header with Profile Button */}
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: '0.5rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>NutriBot</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{
                    background: profile.name ? '#3c4043' : 'none', // UPDATED: Grey background
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '18px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    color: 'white',
                }}
                title="Toggle Profile Panel"
            >
                {profile.name ? (
                    profile.name.charAt(0).toUpperCase()
                ) : (
                    <DefaultProfileIcon />
                )}
            </button>
        </div>
    </header>

    {/* Main Layout Grid */}
    <div style={{
        display: "grid",
        gridTemplateColumns: isProfileOpen ? "1fr 380px" : "1fr 0fr",
        gap: isProfileOpen ? 16 : 0,
        padding: '1rem',
        flex: 1,
        overflow: 'hidden',
        height: 'calc(100vh - 80px)'
    }}>
        {/* Chat column */}
        <section style={{
            border: "1px solid #333537", // Darker border
            backgroundColor: '#1e1f20',   // Dark background
            borderRadius: 12,
            padding: 12,
            display: "flex", // This is crucial for scrolling
            flexDirection: "column",
            overflow: 'hidden'
        }}>
            <div style={{ overflowY: "auto", padding: "6px 6px 0 6px", flex: 1, display: 'flex', flexDirection: 'column' }}>
    {messages.length === 0 ? (
        // NEW: Welcome Screen View
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingBottom: '10%' }}>
                    <h1 style={{ fontSize: '4rem', margin: '0', color: '#5f6368' }}>NutriBot</h1>
                    <p style={{ color: '#a1a1aa' }}>Your personalized AI nutrition assistant</p>
                </div>
            ) : (
                // Your existing message list
                messages.map((m, i) => (
                    <div key={i}>
                        <Bubble role={m.role} time={m.time}>{m.content}</Bubble>
                        {m.role === 'assistant' && m.structured && (<SuggestionCard data={m.structured} />)}
                    </div>
                ))
            )}
            {loading && <Typing />}
            <div ref={endRef} />
        </div>

            {/* RESTORED: Gemini-style chat input */}
            <div style={{ marginTop: 8 }}>
                <div
                  className="gemini-chat-bar" // <-- Add this class name
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#1e1f20', // <-- Change to dark background
                    borderRadius: '24px',
                    padding: '4px',
                    border: '1px solid #3c4043', // Add subtle border
                    transition: 'box-shadow 0.2s ease-in-out' // Smooth transition for the glow
                }}>
                {/* NEW: "Plus" icon on the left */}
                 <button
                          onClick={openScanner}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Scan a food item"
                        >
                          {/* NEW: Outline-Style Camera Icon SVG */}
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                          </svg>
                        </button>
                    {attachedImage && (
                        <div style={{ paddingLeft: '10px' }}>
                            <img src={attachedImage} height="40" style={{ borderRadius: '4px' }} alt="Attachment" />
                            <button onClick={() => setAttachedImage(null)} style={{ position: 'absolute', top: '5px', left: '45px', background: '#777', color: 'white', border: 'none', width: '16px', height: '16px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '10px' }}>X</button>
                        </div>
                    )}
                    <TextareaAutosize
                        minRows={1}
                        maxRows={5} // Set a max height to prevent it from getting too tall
                        style={{
                          width: "100%",
                          padding: '14px 100px 14px 15px',
                          borderRadius: '20px',
                          border: "none",
                          resize: 'none',
                          outline: 'none',
                          fontSize: '16px',
                          boxSizing: 'border-box',
                          background: 'transparent',
                          fontFamily: 'inherit',
                          color: '#e3e3e3'
                        }}
                        placeholder="Type a message or scan a food..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                    <div style={{ position: 'absolute', right: '10px', bottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>

                        <button
                              onClick={send}
                              disabled={!canSend}
                              style={{
                                width: '36px',
                                height: '36px',
                                border: 'none',
                                borderRadius: '50%', // Makes it a circle
                                background: canSend ? '#3c4043' : '#303134',
                                color: 'white',
                                cursor: canSend ? 'pointer' : 'not-allowed',
                                transition: 'background-color 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Send message"
                            >
                              {/* NEW: SVG Send Icon */}
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                              </svg>
                            </button>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                    <button onClick={() => setMessages([])} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>Clear chat</button>
                </div>
            </div>
        </section>

    {/* Profile column is now conditional */}
    {isProfileOpen && (
      <aside style={{ border: "1px solid #333537", backgroundColor: '#1e1f20', borderRadius: 12, padding: 12, height: "calc(100vh - 90px)", overflowY: "auto" }}>
    <h3 style={{ marginTop: 0 }}>Your Profile</h3>
    <p style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 20 }}>
        Personalization helps NutriBot tailor eat/avoid lists.
    </p>

    {/* NEW: Flexbox container for alignment */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

        {/* Name */}
        <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Name</label>
            <input type="text" value={profile.name} placeholder="e.g., Sasi" onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
        </div>

        {/* Age */}
        <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Age</label>
            <input type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
        </div>

        {/* Diet preferences */}
        <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Diet preferences (comma separated)</label>
            <input type="text" value={profile.preferences} placeholder="e.g., vegetarian, high-protein" onChange={e => setProfile(p => ({ ...p, preferences: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
        </div>

        {/* Restrictions / Allergies */}
        <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Restrictions / Allergies (comma separated)</label>
            <input type="text" value={profile.restrictions} placeholder="e.g., lactose, gluten" onChange={e => setProfile(p => ({ ...p, restrictions: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
        </div>

        {/* Known conditions */}
        <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Known conditions (comma separated)</label>
            <input type="text" value={profile.conditions} placeholder="e.g., type 2 diabetes" onChange={e => setProfile(p => ({ ...p, conditions: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
        </div>
    </div>

    {/* File Upload Panel */}
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

      <WelcomeModal
    isOpen={isWelcomeModalOpen}
    onClose={closeWelcomeModal}
    profile={profile}
    setProfile={setProfile}
    API_BASE={API_BASE}
    onAnalysisComplete={setReportContext}
    />
    </>
  );

 }