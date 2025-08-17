import React from 'react';

// A simple helper component for each section of the card
function SuggestionSection({ title, items, color }) {
  if (!items || items.length === 0) {
    return null;
  }

  const listItems = Array.isArray(items) ? items : [items];

  return (
    <div style={{ marginBottom: '12px' }}>
      <h4 style={{ margin: '0 0 8px 0', borderBottom: `2px solid ${color}` }}>
        {title}
      </h4>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {listItems.map((item, index) => (
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
        Dietary Suggestions for: {data.condition || 'Your Query'}
      </h3>

      {data.explanation && (
        <p style={{ fontStyle: 'italic', color: '#4b5563' }}>
          {data.explanation}
        </p>
      )}

      <SuggestionSection title="✅ Foods to Eat" items={data.what_to_eat} color="#22c55e" />
      <SuggestionSection title="❌ Foods to Avoid" items={data.what_to_avoid} color="#ef4444" />
      <SuggestionSection title="⏰ Timing & Tips" items={data.timing} color="#3b82f6" />
      <SuggestionSection title="📝 Additional Notes" items={data.notes} color="#6b7280" />

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