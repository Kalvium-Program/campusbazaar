import Link from "next/link";
import { Suspense } from "react";
import { Browse } from "@/components/Browse";
import { HeroStats } from "@/components/HeroStats";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Buy and sell on your campus.</h1>
        <p>Books, gadgets, cycles and furniture from students down the hall. Snap a photo, let AI write the listing, and chat with buyers live.</p>
        <div className="row" style={{ marginTop: "1.25rem" }}>
          <Link className="btn light" href="/sell">✨ Sell something</Link>
          <a className="btn ghost" href="#browse">Browse listings</a>
        </div>
        <HeroStats />
      </section>
      <div id="browse" />
      <Suspense>
        <Browse />
      </Suspense>
    </>
  );
}
