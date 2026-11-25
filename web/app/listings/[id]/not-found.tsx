import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h1>That listing is gone</h1>
      <p>It may have been sold and removed, or the link is wrong.</p>
      <Link className="btn primary" href="/">Browse listings</Link>
    </div>
  );
}
