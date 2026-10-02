"use client";

// Embuni ELC — Gallery grid with masonry layout and a Dialog image viewer.
// Client component because it manages which image is open in the Dialog.

import * as React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Images } from "lucide-react";

export type GalleryItem = {
  id: string;
  title: string;
  caption?: string | null;
  imageUrl: string;
  album?: string | null;
};

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = React.useState<GalleryItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-10 text-center">
        <Images className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No photos have been published yet. Check back soon.
        </p>
      </div>
    );
  }

  // Masonry via CSS columns.
  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="mb-4 block w-full break-inside-avoid rounded-xl overflow-hidden ring-1 ring-border bg-secondary text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Open image: ${item.title}`}
          >
            <div className="relative">
              { }
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                loading={idx < 6 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-medium text-white line-clamp-1">{item.title}</p>
                {item.caption && (
                  <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
                    {item.caption}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent
          showCloseButton
          className="sm:max-w-3xl p-0 overflow-hidden bg-background"
        >
          {active && (
            <>
              { }
              <img
                src={active.imageUrl}
                alt={active.title}
                className="w-full h-auto max-h-[70vh] object-contain bg-secondary"
              />
              <div className="p-5 space-y-2">
                <DialogTitle className="text-base">{active.title}</DialogTitle>
                {active.caption && (
                  <DialogDescription className="text-sm leading-relaxed">
                    {active.caption}
                  </DialogDescription>
                )}
                {active.album && (
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground pt-1">
                    Album &middot; {active.album}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
