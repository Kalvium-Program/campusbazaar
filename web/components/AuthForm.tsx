"use client";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, post, type User } from "@/lib/api";
import { Field } from "./Field";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const qc = useQueryClient();
  const next = useSearchParams().get("next");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const { user } = await post<{ user: User }>(`/auth/${mode}`, {
        ...(isSignup && { name: f.get("name") }),
        email: f.get("email"),
        password: f.get("password"),
      });
      qc.setQueryData(["me"], user);
      // only follow same-site paths
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "NETWORK", "Could not reach the server. Check your connection."));
      setBusy(false);
    }
  }

  return (
    <div className="auth card pad">
      <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
      <p className="muted">{isSignup ? "Use your college email to start buying and selling." : "Log in to post listings and message sellers."}</p>
      <form onSubmit={submit} noValidate>
        {isSignup && (
          <Field label="Name" htmlFor="name" error={error?.fields?.name}>
            <input id="name" name="name" className="input" autoComplete="name" required aria-invalid={Boolean(error?.fields?.name)} />
          </Field>
        )}
        <Field label="Email" htmlFor="email" error={error?.fields?.email}>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required aria-invalid={Boolean(error?.fields?.email)} />
        </Field>
        <Field label="Password" htmlFor="password" error={error?.fields?.password} hint={isSignup ? "At least 8 characters" : undefined}>
          <input id="password" name="password" type="password" className="input" autoComplete={isSignup ? "new-password" : "current-password"} required aria-invalid={Boolean(error?.fields?.password)} />
        </Field>
        {error && !error.fields?.email && !error.fields?.password && !error.fields?.name && (
          <div className="notice error" role="alert">{error.message}</div>
        )}
        <button className="btn primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={busy}>
          {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>
      <p className="muted small" style={{ marginTop: "1rem" }}>
        {isSignup ? <>Already have an account? <Link href="/login"><u>Log in</u></Link></> : <>New here? <Link href="/signup"><u>Create an account</u></Link></>}
      </p>
    </div>
  );
}
