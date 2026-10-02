// Embuni ELC — /gallery public page (server component).
// Uses the client GalleryGrid component for the masonry + Dialog viewer.

import { db } from "@/lib/db";
import { GalleryGrid } from "@/components/public/gallery-grid";
import { Images } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Gallery",
  description:
    "Photos from Embuni Equity Leaders Chapter events, workshops, outreach and gatherings at the University of Embu.",
};

export default async function GalleryPage() {
  const media = await db.galleryMedia.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
  });

  const albums = Array.from(new Set(media.map((m) => m.album).filter(Boolean))) as string[];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/40 border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-brand pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 relative">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Images className="h-3.5 w-3.5" />
              Chapter Gallery
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
              Gallery
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Moments captured across chapter events, workshops, outreach
              activities and gatherings.
            </p>
            {albums.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Albums:
                </span>
                {albums.map((album) => (
                  <span
                    key={album}
                    className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium"
                  >
                    {album}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <GalleryGrid
          items={media.map((m) => ({
            id: m.id,
            title: m.title,
            caption: m.caption,
            imageUrl: m.imageUrl,
            album: m.album,
          }))}
        />
      </section>
    </>
  );
}
