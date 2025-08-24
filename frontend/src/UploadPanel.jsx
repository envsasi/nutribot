import React, { useState, useRef } from "react";
import axios from "axios";

export default function UploadPanel({ API_BASE, onAnalysisComplete }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setResult(null);
    setAnalysisResult(null);
    onAnalysisComplete("");
    setErr("");
    setProgress(0);
    if (selectedFile) {
      upload(selectedFile);
    }
  };

  const upload = async (fileToUpload) => {
    if (!fileToUpload) return;
    setErr(""); setResult(null); setProgress(0);
    const form = new FormData();
    form.append("file", fileToUpload);
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
      const summary = `Analyzed: ${result.original_filename}. Context is now available.`;
      setAnalysisResult(summary);
      onAnalysisComplete(res.data.content);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to parse file.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid #3c4043", marginTop: 20, paddingTop: 15 }}>
      <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Upload Health Report</h4>

      {/* NEW: Custom File Input Button */}
      {!result && (
        <>
          <input
            type="file"
            accept=".pdf"
            onChange={onFileChange}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          <label
            onClick={() => fileInputRef.current.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px dashed #5f6368',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              justifyContent: 'center',
              backgroundColor: '#303134'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#a1a1aa">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v11.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"></path>
            </svg>
            <span style={{ color: '#a1a1aa' }}>
              {file ? file.name : 'Upload File'}
            </span>
          </label>
        </>
      )}

      {/* NEW: Styled Analyze Button */}
      {result && !analysisResult && (
        <div style={{ marginTop: '8px', textAlign: 'center' }}>
          <div style={{fontSize: 13, color: '#4caf50', marginBottom: '10px'}}>
            Successfully uploaded: {result.original_filename}
          </div>
          <button
            onClick={handleParse}
            disabled={isParsing}
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#3c4043',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {isParsing ? "Analyzing..." : "Analyze Report"}
          </button>
        </div>
      )}

      {analysisResult && <div style={{marginTop: '12px', padding: '10px', background: '#303134', borderRadius: '8px', fontSize: '13px', color: '#4caf50'}}>{analysisResult}</div>}
      {err && <div style={{ color: "#f44336", marginTop: 8 }}>Error: {err}</div>}
    </div>
  );
}