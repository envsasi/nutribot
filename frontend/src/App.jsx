import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function App() {
  const [health, setHealth] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    axios.get(`${API_BASE}/health`)
      .then(r => setHealth(r.data))
      .catch(e => setErr(e?.response?.data || e.message));
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>NutriBot</h1>
      <p>Frontend is up. Backend health response:</p>
      {health ? (
        <pre style={{ background: "#f7f7f8", padding: 12, borderRadius: 8 }}>
{JSON.stringify(health, null, 2)}
        </pre>
      ) : err ? <p style={{color:"crimson"}}>Error: {String(err)}</p> : <p>Checking...</p>}
      <hr />
      <p>Next: wire the chat endpoint.</p>
    </main>
  );
}
