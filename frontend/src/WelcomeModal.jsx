import React from 'react';
import Modal from 'react-modal';
import UploadPanel from './UploadPanel'; // Import the UploadPanel component

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '450px',
    border: '1px solid #3c4043',
    background: '#1e1f20',
    borderRadius: '12px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)'
  }
};

Modal.setAppElement('#root');

export default function WelcomeModal({ isOpen, onClose, profile, setProfile, API_BASE, onAnalysisComplete }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="Welcome to NutriBot"
    >
      {/* HEADER (NOT SCROLLABLE) */}
      <div style={{ color: '#e3e3e3', flexShrink: 0 }}>
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>Welcome to NutriBot</h2>
        <p style={{ textAlign: 'center', color: '#a1a1aa', marginBottom: '1.5rem' }}>
          Update your profile to get personalized recommendations.
        </p>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Name</label>
            <input type="text" value={profile.name} placeholder="e.g., Sasi" onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Age</label>
            <input type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Diet preferences (comma separated)</label>
            <input type="text" value={profile.preferences} placeholder="e.g., vegetarian, high-protein" onChange={e => setProfile(p => ({ ...p, preferences: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Restrictions / Allergies (comma separated)</label>
            <input type="text" value={profile.restrictions} placeholder="e.g., lactose, gluten" onChange={e => setProfile(p => ({ ...p, restrictions: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Known conditions (comma separated)</label>
            <input type="text" value={profile.conditions} placeholder="e.g., type 2 diabetes" onChange={e => setProfile(p => ({ ...p, conditions: e.target.value }))} style={{ width: "100%", padding: 8, boxSizing: 'border-box' }} />
          </div>

          {/* ADDED THE UPLOAD PANEL HERE */}
          <UploadPanel API_BASE={API_BASE} onAnalysisComplete={onAnalysisComplete} />
        </div>
      </div>

      {/* FOOTER (NOT SCROLLABLE) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '10px', flexShrink: 0, paddingTop: '1rem', borderTop: '1px solid #3c4043' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '20px', border: '1px solid #3c4043', background: 'none', color: '#e3e3e3', cursor: 'pointer' }}>
          Skip for Now
        </button>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', background: '#6d28d9', color: 'white', cursor: 'pointer' }}>
          Save and Continue
        </button>
      </div>
    </Modal>
  );
}