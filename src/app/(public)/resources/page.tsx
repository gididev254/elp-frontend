// Embuni ELC — /resources public page (server component).
// Public visitors only see resources with visibility === "public".

import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  FilesIcon,
  Scale,
  ClipboardList,
  HelpCircle,
  ArrowRight,
  Lock,
} from "lucide-react";

export const metadata = {
  title: "Resources",
  description:
    "Public chapter resources — constitution, code of conduct, templates and guides from the Embuni Equity Leaders Chapter.",
};

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  policy: { label: "Policies", icon: Scale },
  document: { label: "Documents", icon: FileText },
  template: { label: "Templates", icon: FilesIcon },
  form: { label: "Forms", icon: ClipboardList },
  guide: { label: "Guides", icon: HelpCircle },
};

const CATEGORY_ORDER = ["policy", "document", "template", "form", "guide"];

export default async function ResourcesPage() {
  const resources = await db.resource.findMany({
    where: {
      status: "published",
      visibility: "public",
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by category.
  const grouped = new Map<string, typeof resources>();
  for (const r of resources) {
    const cat = r.category ?? "document";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(r);
  }

  // Stable ordering by CATEGORY_ORDER; unknown categories appended at the end.
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/40 border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-brand pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 relative">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              Chapter Resources
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
              Resources
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Public chapter documents, policies, templates and guides. Some
              resources are restricted to active leaders and the executive —
              sign in to access them.
            </p>
          </div>
        </div>
      </section>

      {/* RESOURCE GROUPS */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        {orderedCategories.length === 0 ? (
          <div className="rounded-xl border border-border bg-secondary/30 p-10 text-center">
            <BookOpen className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No public resources are available yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {orderedCategories.map((cat) => {
              const meta = CATEGORY_META[cat] ?? { label: cat, icon: FileText };
              const items = grouped.get(cat) ?? [];
              return (
                <div key={cat} className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <meta.icon className="h-4 w-4" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                      {meta.label}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {items.map((r) => {
                      const isExternal = !!r.externalUrl;
                      const url = r.externalUrl ?? r.fileUrl ?? "#";
                      return (
                        <Card
                          key={r.id}
                          className="border-border/70 hover:border-primary/30 transition-colors flex flex-col"
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                              <CardTitle className="text-base leading-snug">
                                {r.title}
                              </CardTitle>
                              <Badge
                                variant="secondary"
                                className="text-[10px] uppercase tracking-wide shrink-0"
                              >
                                {meta.label}
                              </Badge>
                            </div>
                            {r.description && (
                              <CardDescription className="text-sm leading-relaxed">
                                {r.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="mt-auto pt-2">
                            {url !== "#" ? (
                              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                                <a
                                  href={url}
                                  target={isExternal ? "_blank" : undefined}
                                  rel={isExternal ? "noreferrer" : undefined}
                                >
                                  {isExternal ? (
                                    <>
                                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                      Open link
                                    </>
                                  ) : (
                                    <>
                                      <Download className="mr-2 h-3.5 w-3.5" />
                                      Download
                                    </>
                                  )}
                                </a>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                                <Lock className="h-3 w-3" />
                                File not available
                              </span>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* RESTRICTED CTA */}
      <section className="container mx-auto px-4 md:px-6 pb-16 md:pb-24">
        <div className="rounded-2xl bg-secondary/40 border border-border p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                Looking for leader-only resources?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Meeting minutes templates, event proposal forms, mentorship
                guidelines and the financial reporting guide are available to
                active leaders and the executive after sign-in.
              </p>
            </div>
          </div>
          <Button asChild size="lg">
            <Link href="/login">
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
