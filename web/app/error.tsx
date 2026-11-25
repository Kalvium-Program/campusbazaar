"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty">
      <h1>Something went wrong</h1>
      <p>The server did not answer. Try again in a moment.</p>
      <button className="btn primary" onClick={reset}>Try again</button>
    </div>
  );
}
