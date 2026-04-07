"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_SESSION_CHANGED_EVENT, readAppSession } from "@/lib/appSession";

export default function SessionBanner() {
  const pathname = usePathname();
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    const check = () => setGuest(readAppSession()?.mode === "guest");
    check();
    window.addEventListener("storage", check);
    window.addEventListener(APP_SESSION_CHANGED_EVENT, check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener(APP_SESSION_CHANGED_EVENT, check);
    };
  }, [pathname]);

  if (!guest) return null;

  const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <span className="font-semibold">Guest mode</span>
      <span className="text-amber-900/80 dark:text-amber-200/90">
        Progress is saved only on this device until you sign in.
      </span>
      <Link
        href={`/login${next}`}
        className="shrink-0 font-semibold text-purple-700 underline-offset-2 hover:underline dark:text-purple-300"
      >
        Sign in to save progress
      </Link>
    </div>
  );
}
