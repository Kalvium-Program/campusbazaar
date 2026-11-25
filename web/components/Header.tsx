"use client";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { post } from "@/lib/api";
import { useMe } from "@/lib/hooks";

export function Header() {
  const { data: me, isPending } = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const path = usePathname();

  async function logout() {
    await post("/auth/logout");
    qc.setQueryData(["me"], null);
    qc.removeQueries({ queryKey: ["conversations"] });
    router.push("/");
    router.refresh();
  }

  const cls = (p: string) => (path === p ? "active" : undefined);
  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="logo" aria-label="CampusBazaar home">
          <span className="logo-mark">C</span> CampusBazaar
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/" className={cls("/")}>Browse</Link>
          {isPending ? null : me ? (
            <>
              <Link href="/sell" className={cls("/sell")}>Sell</Link>
              <Link href="/messages" className={cls("/messages")}>Messages</Link>
              <Link href="/me" className={cls("/me")}>My listings</Link>
              <button className="link" onClick={logout}>Log out ({me.name.split(" ")[0]})</button>
            </>
          ) : (
            <>
              <Link href="/login" className={cls("/login")}>Log in</Link>
              <Link href="/signup" className="btn primary sm">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
