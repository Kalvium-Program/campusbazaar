import Link from "next/link";
import { CATEGORIES, imageUrl, label, rupees, type Listing } from "@/lib/api";

export function ListingCard({ l }: { l: Listing }) {
  return (
    <Link href={`/listings/${l.id}`} className="card listing-card">
      <div className="sold-wrap">
        {l.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumb" src={imageUrl(l.id)} alt="" loading="lazy" />
        ) : (
          <div className="thumb-empty">No photo</div>
        )}
        {l.status === "SOLD" && <span className="badge sold badge-corner">Sold</span>}
      </div>
      <div className="listing-body">
        <span className="listing-title">{l.title}</span>
        <span className="price">{rupees(l.priceRupees)}</span>
        <span className="muted small">{label(CATEGORIES, l.category)} · {l.owner.name}</span>
      </div>
    </Link>
  );
}

export function ListingSkeletons({ n = 8 }: { n?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 270 }} />
      ))}
    </div>
  );
}
