"use client";

// Global search dialog (command palette). Triggered by a button in the dashboard
// topbar or the Cmd+K / Ctrl+K keyboard shortcut. Debounced 300ms.

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Users,
  CalendarDays,
  Newspaper,
  FolderKanban,
  Images,
  BookOpen,
  Search as SearchIcon,
  CornerDownLeft,
} from "lucide-react";

interface SearchResult {
  type: "leaders" | "events" | "news" | "programs" | "gallery" | "resources";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  leaders: "Leaders",
  events: "Events",
  news: "News",
  programs: "Programs",
  gallery: "Gallery",
  resources: "Resources",
};

const TYPE_ICONS: Record<SearchResult["type"], React.ComponentType<{ className?: string }>> = {
  leaders: Users,
  events: CalendarDays,
  news: Newspaper,
  programs: FolderKanban,
  gallery: Images,
  resources: BookOpen,
};

export function SearchDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Debounced search (300ms).
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  // Reset state when dialog closes.
  React.useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  // Group by type preserving the canonical type order.
  const grouped = React.useMemo(() => {
    const order: SearchResult["type"][] = [
      "leaders",
      "events",
      "news",
      "programs",
      "gallery",
      "resources",
    ];
    const map = new Map<SearchResult["type"], SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    return order
      .map((t) => ({ type: t, items: map.get(t) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  function handleNavigate(href: string) {
    onOpenChange(false);
    // External links open in a new tab; internal links use the router.
    if (href.startsWith("http")) {
      window.open(href, "_blank", "noreferrer");
      return;
    }
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-2xl gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search the chapter</DialogTitle>
          <DialogDescription>
            Search across leaders, events, news, programs, gallery and resources.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-none border-0">
          <div className="flex h-12 items-center gap-2 border-b border-border px-4">
            <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leaders, events, news, programs…"
              className="h-8 border-0 px-0 shadow-none focus-visible:ring-0 bg-transparent"
              aria-label="Search query"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>
          <CommandList className="max-h-[60vh]">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : query.trim().length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
            ) : grouped.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              grouped.map((g) => {
                const Icon = TYPE_ICONS[g.type];
                return (
                  <CommandGroup
                    key={g.type}
                    heading={TYPE_LABELS[g.type]}
                  >
                    {g.items.map((item) => (
                      <CommandItem
                        key={`${item.type}-${item.id}`}
                        value={`${item.type}-${item.id}`}
                        onSelect={() => handleNavigate(item.href)}
                        className="gap-3 px-2"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium">
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                        {item.imageUrl && (
                           
                          <img
                            src={item.imageUrl}
                            alt=""
                            loading="lazy"
                            className="h-8 w-8 rounded-md object-cover border border-border"
                          />
                        )}
                        <CornerDownLeft className="h-3 w-3 text-muted-foreground/60" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })
            )}
          </CommandList>
          {/* Hint row */}
          <div className="border-t border-border px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Use ↑ ↓ to navigate, ↵ to open.</span>
            <Link
              href="/dashboard"
              onClick={() => onOpenChange(false)}
              className="hover:text-foreground hover:underline"
            >
              Back to dashboard
            </Link>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
