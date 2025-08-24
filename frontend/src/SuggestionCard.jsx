import React from 'react';

// This component is now updated to handle the new nested structure
function SuggestionSection({ title, data, color }) {
  if (!data || (!data.main_suggestions?.length && !data.alternatives?.length)) {
    return null;
}

  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #3c4043', paddingBottom: '4px' }}>
        {title}
      </h4>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {data.main_suggestions.map((item, index) => (
          <li key={`main-${index}`} style={{ marginBottom: '4px' }}>{item}</li>
        ))}
      </ul>
      {data.alternatives?.length > 0 && (
        <>
          <h5 style={{ margin: '12px 0 8px 0', color: '#a1a1aa' }}>Alternatives:</h5>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {data.alternatives.map((item, index) => (
              <li key={`alt-${index}`} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// This component is for simple lists like "timing_and_tips"
function TipsSection({ title, items, color }) {
    if (!items || items.length === 0) {
        return null;
    }
    return (
        <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #3c4043', paddingBottom: '4px' }}>
                {title}
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {items.map((item, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
            </ul>
        </div>
    );
}


export default function SuggestionCard({ data }) {
  if (!data) {
    return null;
  }

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      border: '1px solid #3c4043', // UPDATED BORDER COLOR
      borderRadius: '12px',
      background: '#1e1f20' // UPDATED BACKGROUND COLOR
    }}>
      <h3 style={{ marginTop: 0 }}>
        Dietary Suggestions for: {data.condition_detected || 'Your Query'}
      </h3>

      {data.explanation && (
        <p style={{ fontStyle: 'italic', color: '#a1a1aa', borderLeft: '3px solid #4a4a4e', paddingLeft: '12px' }}>
          {data.explanation}
        </p>
      )}

      {/* Use the updated component for foods */}
      <SuggestionSection title="✅ Foods to Eat" data={data.foods_to_eat} color="#22c55e" />
      <TipsSection title="❌ Foods to Avoid" items={data.foods_to_avoid} color="#ef4444" />

      {/* Use the simple component for tips */}
      <TipsSection title="⏰ Timing & Tips" items={data.timing_and_tips} color="#3b82f6" />

      {data.disclaimer && (
        <p style={{
          marginTop: '16px',
          fontSize: '12px',
          color: '#a1a1aa', // UPDATED TEXT COLOR
          borderTop: '1px solid #3c4043', // UPDATED BORDER COLOR
          paddingTop: '8px'
        }}>
          <i>{data.disclaimer}</i>
        </p>
      )}
    </div>
  );
}