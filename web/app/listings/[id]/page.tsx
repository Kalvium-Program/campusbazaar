import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingActions } from "@/components/ListingActions";
import { CATEGORIES, CONDITIONS, imageUrl, label, rupees } from "@/lib/api";
import { getListing } from "@/lib/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await getListing((await params).id);
  return { title: l?.title ?? "Listing not found" };
}

// Server component: the page arrives with the listing already in the HTML.
export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const l = await getListing(id);
  if (!l) notFound();
  return (
    <article className="detail">
      <div className="detail-img">
        {l.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(l.id)} alt={l.title} style={{ width: "100%" }} />
        ) : (
          <div className="thumb-empty" style={{ minHeight: 280 }}>No photo</div>
        )}
      </div>
      <div>
        <div className="row" style={{ marginBottom: "0.5rem" }}>
          <span className="badge">{label(CATEGORIES, l.category)}</span>
          <span className={`badge ${l.status === "SOLD" ? "sold" : "good"}`}>{l.status === "SOLD" ? "Sold" : "Available"}</span>
        </div>
        <h1>{l.title}</h1>
        <p className="price" style={{ fontSize: "1.6rem" }}>{rupees(l.priceRupees)}</p>
        <p>{l.description}</p>
        <dl className="facts">
          <dt>Condition</dt><dd>{label(CONDITIONS, l.condition)}</dd>
          <dt>Seller</dt><dd>{l.owner.name}</dd>
          <dt>Posted</dt><dd>{new Date(l.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd>
        </dl>
        <ListingActions listing={l} />
      </div>
    </article>
  );
}
