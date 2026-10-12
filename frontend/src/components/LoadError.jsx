import React from 'react';

export default function LoadError({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="load-error" role="alert">
      <span>{message}</span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>Retry</button>
    </div>
  );
}
