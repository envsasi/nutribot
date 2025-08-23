import React from 'react';

// This component is now updated to handle the new nested structure
function SuggestionSection({ title, data, color }) {
  // Check if the data (e.g., foods_to_eat) or its nested arrays exist
  if (!data || (!data.main_suggestions?.length && !data.alternatives?.length)) {
    return null;
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 8px 0', borderBottom: `2px solid ${color}`, paddingBottom: '4px' }}>
        {title}
      </h4>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {data.main_suggestions.map((item, index) => (
          <li key={`main-${index}`} style={{ marginBottom: '4px' }}>{item}</li>
        ))}
      </ul>
      {data.alternatives?.length > 0 && (
        <>
          <h5 style={{ margin: '12px 0 8px 0', color: '#4b5563' }}>Alternatives:</h5>
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
            <h4 style={{ margin: '0 0 8px 0', borderBottom: `2px solid ${color}`, paddingBottom: '4px' }}>
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
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      background: '#f9fafb'
    }}>
      <h3 style={{ marginTop: 0 }}>
        Dietary Suggestions for: {data.condition_detected || 'Your Query'}
      </h3>

      {data.explanation && (
        <p style={{ fontStyle: 'italic', color: '#4b5563', borderLeft: '3px solid #d1d5db', paddingLeft: '12px' }}>
          {data.explanation}
        </p>
      )}

      {/* Use the updated component for foods */}
      <SuggestionSection title="✅ Foods to Eat" data={data.foods_to_eat} color="#22c55e" />
      <SuggestionSection title="❌ Foods to Avoid" data={data.foods_to_avoid} color="#ef4444" />

      {/* Use the simple component for tips */}
      <TipsSection title="⏰ Timing & Tips" items={data.timing_and_tips} color="#3b82f6" />

      {data.disclaimer && (
        <p style={{
          marginTop: '16px',
          fontSize: '12px',
          color: '#6b7280',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '8px'
        }}>
          <i>{data.disclaimer}</i>
        </p>
      )}
    </div>
  );
}