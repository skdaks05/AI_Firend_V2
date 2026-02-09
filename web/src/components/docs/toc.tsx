"use client";

import { useEffect, useMemo, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { HeadingItem } from "@/lib/docs";
import { cn } from "@/lib/utils";

interface TocProps {
  headings: HeadingItem[];
  title: string;
}

export function Toc({ headings, title }: TocProps) {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(
    headings[0]?.id ?? null,
  );

  const headingIds = useMemo(
    () => headings.map((heading) => heading.id),
    [headings],
  );

  useEffect(() => {
    if (headingIds.length === 0) return;

    let mounted = true;
    let handler: EventListener | null = null;

    const setup = async () => {
      const throttleModule = (await import(
        "react-bits/lib/util/throttle.js"
      )) as {
        throttle?: <T extends (...args: never[]) => void>(
          fn: T,
          ms?: number,
        ) => T;
        default?: {
          throttle?: <T extends (...args: never[]) => void>(
            fn: T,
            ms?: number,
          ) => T;
        };
      };

      const throttle =
        throttleModule.throttle ??
        throttleModule.default?.throttle ??
        (<T extends (...args: never[]) => void>(fn: T) => fn);

      const computeActive = () => {
        const candidates = headingIds
          .map((id) => document.getElementById(id))
          .filter((el): el is HTMLElement => Boolean(el));

        if (candidates.length === 0) return;

        let current = candidates[0].id;

        for (const el of candidates) {
          const top = el.getBoundingClientRect().top;
          if (top <= 132) current = el.id;
        }

        if (mounted) setActiveHeadingId(current);
      };

      handler = throttle(computeActive, 120) as unknown as EventListener;
      window.addEventListener("scroll", handler, { passive: true });
      computeActive();
    };

    setup().catch(() => {
      // Keep TOC functional without scroll sync if dynamic import fails.
    });

    return () => {
      mounted = false;
      if (handler) window.removeEventListener("scroll", handler);
    };
  }, [headingIds]);

  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] xl:block">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
          {title}
        </p>
        <ScrollArea className="h-[calc(100vh-11rem)] pr-3">
          <nav className="space-y-1">
            {headings.map((heading) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100",
                  heading.depth === 3 && "pl-5 text-xs",
                  activeHeadingId === heading.id &&
                    "bg-cyan-500/10 text-cyan-100 ring-1 ring-cyan-300/30",
                )}
              >
                {heading.text}
              </a>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
