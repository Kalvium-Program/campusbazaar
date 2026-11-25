import { Suspense } from "react";
import { Browse } from "@/components/Browse";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Buy and sell on your campus.</h1>
        <p>Books, gadgets, cycles and furniture from students who are right down the hall. Post a listing in a minute, with an AI helper to write it for you.</p>
      </section>
      <Suspense>
        <Browse />
      </Suspense>
    </>
  );
}
