"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

export default function CustomerSearchBar({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastApplied = useRef(initialQ);

  useEffect(() => {
    if (q === lastApplied.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastApplied.current = q;
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const url = params.toString() ? `/customers?${params}` : "/customers";
      startTransition(() => router.push(url));
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, router]);

  return (
    <div className="mb-4 relative group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-600 transition-colors pointer-events-none">
        <Search size={17} strokeWidth={2.25} />
      </div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="พิมพ์เพื่อค้นหา ชื่อ, เบอร์, LINE, อีเมล, ระดับ..."
        className="w-full bg-white border border-zinc-200 rounded-lg py-2.5 text-sm text-ink-900 placeholder:text-zinc-400 outline-none transition-all hover:border-zinc-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
        style={{
          paddingLeft: "2.5rem",
          paddingRight: q || pending ? "2.5rem" : "1rem",
        }}
        autoComplete="off"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        {pending && (
          <Loader2 size={15} className="animate-spin text-brand-500" />
        )}
        {q && !pending && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="w-6 h-6 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-ink-900 transition-colors"
            aria-label="ล้าง"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
