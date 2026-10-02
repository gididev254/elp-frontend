// Generic "module placeholder" page for dashboard subroutes that aren't fully built yet.
// Re-exported by each stub page.

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";

export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
      </div>
      <Card>
        <CardContent className="p-10 text-center">
          <Construction className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium">Module under construction</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            This module is part of the Embuni ELC platform roadmap. The data model,
            API surface and RBAC permissions are already in place — full UI is being built out.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
