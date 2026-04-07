"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startAuthenticatedSession,
  startGuestSession,
} from "@/lib/appSession";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => searchParams.get("next") || "/",
    [searchParams]
  );

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in, skip login.
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data?.user) {
          startAuthenticatedSession(data.user);
          router.replace(nextPath);
        }
      } catch {
        // ignore
      }
    })();
  }, [nextPath, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Request failed.");
        return;
      }
      if (data?.user) {
        startAuthenticatedSession(data.user);
      }
      router.replace(nextPath);
    } catch (err) {
      setError("Could not connect. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 via-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-indigo-950 dark:via-purple-950 dark:to-pink-950 font-sans flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-purple-200 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-purple-800 dark:bg-gray-900/70">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
          {mode === "login" ? "Login" : "Register"}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Sign in to save your interview attempts.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-xl border-2 border-gray-200 bg-white/90 px-4 py-3.5 text-base text-gray-900 shadow-lg transition-all duration-200 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100 dark:focus:border-purple-300"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
              className="w-full rounded-xl border-2 border-gray-200 bg-white/90 px-4 py-3.5 text-base text-gray-900 shadow-lg transition-all duration-200 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100 dark:focus:border-purple-300"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 px-8 py-4 text-base font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? mode === "login"
                ? "Logging in..."
                : "Registering..."
              : mode === "login"
                ? "Login"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            startGuestSession();
            router.replace(nextPath);
          }}
          className="mt-3 w-full rounded-xl border-2 border-gray-300 bg-white/80 px-8 py-3.5 text-base font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          Continue as Guest
        </button>

        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("register");
                }}
                className="font-semibold text-purple-600 hover:underline dark:text-purple-400"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("login");
                }}
                className="font-semibold text-purple-600 hover:underline dark:text-purple-400"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

