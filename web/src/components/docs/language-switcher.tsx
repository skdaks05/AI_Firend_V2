"use client";

import { Globe } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type DocGroupId, getHref, type Lang } from "@/lib/docs";

interface LanguageSwitcherProps {
  lang: Lang;
  group: DocGroupId;
  slug: string;
}

const LABELS: Record<Lang, string> = {
  en: "English",
  ko: "한국어",
};

export function LanguageSwitcher({ lang, group, slug }: LanguageSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-white/15 bg-black/20"
        >
          <Globe className="size-4" />
          {LABELS[lang]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-white/15 bg-zinc-950">
        {(["en", "ko"] as Lang[]).map((nextLang) => (
          <DropdownMenuItem
            key={nextLang}
            asChild
            className={nextLang === lang ? "bg-white/10" : undefined}
          >
            <Link href={getHref(nextLang, group, slug)}>
              {LABELS[nextLang]}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
