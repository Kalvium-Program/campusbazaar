import Link from "next/link";
import { CATEGORIES, CATEGORY_ICON, imageUrl, initials, label, rupees, timeAgo, type Listing } from "@/lib/api";
import { SaveButton } from "./SaveButton";

const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 3 * 86400_000;

export function ListingCard({ l }: { l: Listing }) {
  return (
    <Link href={`/listings/${l.id}`} className="card listing-card">
      <div className="sold-wrap">
        {l.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumb" src={imageUrl(l.id)} alt="" loading="lazy" />
        ) : (
          <div className="thumb-empty" aria-hidden="true">{CATEGORY_ICON[l.category]}</div>
        )}
        {l.status === "SOLD" ? <span className="badge sold badge-corner">Sold</span> : isNew(l.createdAt) ? <span className="badge new badge-corner">New</span> : null}
        <SaveButton id={l.id} />
      </div>
      <div className="listing-body">
        <span className="listing-title">{l.title}</span>
        <span className="price">{rupees(l.priceRupees)}</span>
        <div className="meta">
          <span className="seller"><span className="avatar">{initials(l.owner.name)}</span><span>{l.owner.name}</span></span>
          <span>{label(CATEGORIES, l.category)} · {timeAgo(l.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ListingSkeletons({ n = 8 }: { n?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 300 }} />
      ))}
    </div>
  );
}
