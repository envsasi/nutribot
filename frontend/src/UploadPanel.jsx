import React, { useState } from "react";
import axios from "axios";

export default function UploadPanel({ API_BASE, onAnalysisComplete }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const onPick = (e) => {
    setFile(e.target.files?.[0] || null);
    setResult(null);
    setAnalysisResult(null);
    onAnalysisComplete("");
    setErr("");
    setProgress(0);
  };

  const upload = async () => {
    if (!file) return;
    setErr(""); setResult(null); setProgress(0);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await axios.post(`${API_BASE}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (pe) => {
          if (pe.total) setProgress(Math.round((pe.loaded / pe.total) * 100));
        },
      });
      setResult(res.data.file);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    }
  };

  const handleParse = async () => {
    if (!result?.file_id) return;
    setIsParsing(true);
    setErr("");
    try {
        const res = await axios.post(`${API_BASE}/files/${result.file_id}/parse`);
        const summary = `Analyzed report: ${result.original_filename}. The AI will now use this context.`;
        setAnalysisResult(summary);
        onAnalysisComplete(res.data.content);
    } catch (e) {
        setErr(e?.response?.data?.detail || "Failed to parse file.");
    } finally {
        setIsParsing(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 16, paddingTop: 12 }}>
      <h3>Upload Health Report</h3>
      <input type="file" accept=".pdf" onChange={onPick} style={{ display: "block", marginBottom: 8 }} />
      <button onClick={upload} disabled={!file || result} style={{ padding: "8px 12px" }}>
        {progress > 0 && progress < 100 ? `Uploading... ${progress}%` : "1. Upload File"}
      </button>

      {result && !analysisResult && (
        <div style={{ marginTop: '8px' }}>
            <div style={{fontSize: 13, color: 'green', marginBottom: '8px'}}>Upload successful! Ready to analyze.</div>
            <button onClick={handleParse} disabled={isParsing} style={{ padding: "8px 12px" }}>
                {isParsing ? "Analyzing..." : "2. Analyze for Context"}
            </button>
        </div>
      )}

      {analysisResult && <div style={{marginTop: '12px', padding: '8px', background: '#eef2ff', borderRadius: '8px', fontSize: '13px'}}>{analysisResult}</div>}
      {err && <div style={{ color: "crimson", marginTop: 8 }}>Error: {err}</div>}
      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
        * Analysis will provide context for your next chat messages.
      </div>
    </div>
  );
}