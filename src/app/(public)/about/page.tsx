// Embuni ELC — /about public page (server component).
// Hero, mission/vision/aim cards, 11-role executive structure, chapter values, CTA.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  GraduationCap,
  HeartHandshake,
  Users,
  Target,
  Compass,
  Flag,
  Crown,
  Briefcase,
  FileText,
  CalendarClock,
  Wallet,
  Megaphone,
  Heart,
  Network,
  UserSquare2,
  UserRound,
  UserCog,
  Scale,
} from "lucide-react";

const PILLARS = [
  {
    icon: Compass,
    title: "Vision",
    description:
      "To be the leading student-led chapter at the University of Embu, recognised for producing ethical, service-driven leaders who positively shape their communities and industries.",
  },
  {
    icon: Target,
    title: "Mission",
    description:
      "To build a thriving community of Equity Leaders at the University of Embu through mentorship, leadership development, academic excellence, and meaningful service to Embu County.",
  },
  {
    icon: Flag,
    title: "Aim",
    description:
      "To equip every chapter leader with the skills, networks, records and opportunities they need to transition from campus into impactful careers, postgraduate study, and lifelong civic engagement.",
  },
];

const VALUES = [
  {
    icon: GraduationCap,
    title: "Academic Excellence",
    description:
      "We support chapter leaders with mentorship, resources and peer learning that lift academic outcomes across the chapter.",
  },
  {
    icon: HeartHandshake,
    title: "Service to Community",
    description:
      "From school visits to environmental drives, our leaders give back to Embu County through structured service activities.",
  },
  {
    icon: Users,
    title: "Leadership Development",
    description:
      "Each executive role carries real responsibility. Our leaders graduate with the experience of having led a chapter.",
  },
];

type ExecRole = {
  icon: React.ElementType;
  title: string;
  responsibility: string;
};

const EXEC_ROLES: ExecRole[] = [
  {
    icon: Crown,
    title: "President",
    responsibility: "Provides overall strategic leadership and represents the chapter externally.",
  },
  {
    icon: UserSquare2,
    title: "Vice President",
    responsibility: "Deputises the President and assumes delegated executive responsibilities.",
  },
  {
    icon: FileText,
    title: "Secretary General",
    responsibility: "Maintains chapter records, minutes and official correspondence.",
  },
  {
    icon: CalendarClock,
    title: "Organizing Secretary",
    responsibility: "Plans and coordinates chapter events, meetings and logistics.",
  },
  {
    icon: Wallet,
    title: "Treasurer",
    responsibility: "Manages chapter finances, budgets and financial reporting.",
  },
  {
    icon: Megaphone,
    title: "Communications Director",
    responsibility: "Owns internal and external communications, news and digital presence.",
  },
  {
    icon: Heart,
    title: "Mentorship Coordinator",
    responsibility: "Designs and runs the chapter's mentorship programs and pairings.",
  },
  {
    icon: Network,
    title: "Alumni Manager",
    responsibility: "Maintains alumni records and engagement activities across cohorts.",
  },
  {
    icon: UserRound,
    title: "Male Year 1 Representative",
    responsibility: "Represents and advocates for male first-year leaders in the chapter.",
  },
  {
    icon: UserRound,
    title: "Female Year 1 Representative",
    responsibility: "Represents and advocates for female first-year leaders in the chapter.",
  },
  {
    icon: UserCog,
    title: "Assistant Female Y1 Rep",
    responsibility: "Supports the Female Y1 Rep in representing first-year female leaders.",
  },
];

export const metadata = {
  title: "About the Chapter",
  description:
    "Learn about the Embuni Equity Leaders Chapter at the University of Embu — our vision, mission, executive structure and chapter values.",
};

export default function AboutPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/40">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-brand pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                University of Embu &middot; Equity Leaders Chapter
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
                About <span className="text-primary">Embuni ELC</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                The University of Embu Equity Leaders Chapter. A student-led
                community built on mentorship, service, and accountable
                leadership — centralised on one digital platform for present
                and future chapter leaders.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                  <Link href="/register">
                    Join the chapter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/contacts">Contact us</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-xl ring-1 ring-border bg-secondary">
                { }
                <img
                  src="/images/hero/hero-about.png"
                  alt="Embuni ELC leaders on campus"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION / VISION / AIM */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Vision, mission &amp; aim
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three guiding commitments shape every decision the chapter makes.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PILLARS.map((p) => (
            <Card key={p.title} className="border-border/70 hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary mb-2">
                  <p.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">{p.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {p.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* EXECUTIVE STRUCTURE */}
      <section className="bg-section-alt border-y border-border">
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
              <Scale className="h-3.5 w-3.5" />
              Chapter executive
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              The 11-role executive structure
            </h2>
            <p className="mt-3 text-muted-foreground">
              The chapter is led by an 11-member executive, each carrying a
              distinct area of responsibility. Roles are admin-assigned; leaders
              cannot self-elevate.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXEC_ROLES.map((role, idx) => (
              <Card
                key={`${role.title}-${idx}`}
                className="border-border/70 hover:border-primary/30 transition-colors"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                      <role.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm leading-tight">{role.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {role.responsibility}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Chapter values</h2>
          <p className="mt-3 text-muted-foreground">
            Three commitments anchor everything the Embuni Equity Leaders Chapter does.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {VALUES.map((v) => (
            <Card key={v.title} className="border-border/70 hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary mb-2">
                  <v.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">{v.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {v.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="rounded-2xl bg-brand-gradient text-primary-foreground p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="relative grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Want to be part of this?
              </h2>
              <p className="text-sm md:text-base opacity-90 max-w-2xl">
                Registration is open to all University of Embu students with an
                <code className="bg-primary-foreground/10 px-1.5 py-0.5 rounded text-xs ml-1">@embuni.ac.ke</code>
                email. New accounts are reviewed and approved by the chapter
                executive before activation.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Button asChild size="lg" variant="secondary" className="w-full md:w-auto">
                <Link href="/register">
                  Join the chapter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="w-full md:w-auto text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/contacts">Contact us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
