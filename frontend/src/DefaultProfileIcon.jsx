import React from 'react';

export default function DefaultProfileIcon({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#e5e7eb" // A light gray color
      style={{ borderRadius: '50%' }}
    >
      <circle cx="12" cy="12" r="12" fill="#a1a1aa" /> // A darker gray background circle
      <path
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
        fill="#f8fafc" // The white/lightest gray icon shape
      />
    </svg>
  );
}