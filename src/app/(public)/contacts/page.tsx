// Embuni ELC — /contacts public page (server component).
// Two-column layout: contact info + form (client). Below: compact exec team list.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/public/contact-form";
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  Crown,
  UserSquare2,
  FileText,
  CalendarClock,
  Wallet,
  Megaphone,
  Heart,
  Network,
  UserRound,
  UserCog,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Contact the Chapter",
  description:
    "Get in touch with the Embuni Equity Leaders Chapter at the University of Embu. Find our address, email, phone and executive team.",
};

const CONTACT_INFO = [
  {
    icon: MapPin,
    label: "Address",
    value: "University of Embu, Embu Town, Kenya",
  },
  {
    icon: Mail,
    label: "Email",
    value: "elc@embuni.ac.ke",
    href: "mailto:elc@embuni.ac.ke",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+254 700 000 000",
    href: "tel:+254700000000",
  },
  {
    icon: Clock,
    label: "Office hours",
    value: "Mon – Fri, 9:00 AM – 5:00 PM (EAT)",
  },
];

const EXEC_ROLES = [
  { icon: Crown, title: "President", area: "Overall leadership & external representation" },
  { icon: UserSquare2, title: "Vice President", area: "Deputises the President; delegated duties" },
  { icon: FileText, title: "Secretary General", area: "Records, minutes & official correspondence" },
  { icon: CalendarClock, title: "Organizing Secretary", area: "Events, meetings & logistics" },
  { icon: Wallet, title: "Treasurer", area: "Chapter finances & financial reporting" },
  { icon: Megaphone, title: "Communications Director", area: "News, announcements & digital presence" },
  { icon: Heart, title: "Mentorship Coordinator", area: "Mentorship programs & pairings" },
  { icon: Network, title: "Alumni Manager", area: "Alumni records & engagement" },
  { icon: UserRound, title: "Male Y1 Rep", area: "Male Year 1 leaders' representation" },
  { icon: UserRound, title: "Female Y1 Rep", area: "Female Year 1 leaders' representation" },
  { icon: UserCog, title: "Asst. Female Y1 Rep", area: "Supports the Female Y1 Rep" },
];

export default function ContactsPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/40 border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-brand pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 relative">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Mail className="h-3.5 w-3.5" />
              Get in Touch
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
              Contact the Chapter
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Have a question about joining, a program, an event or a media
              enquiry? Reach out — the chapter executive responds within
              2 working days.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT INFO + FORM */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="grid lg:grid-cols-5 gap-10">
          {/* LEFT — info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Chapter office</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Embuni Equity Leaders Chapter is based at the University of
                Embu in Embu Town, Kenya. Reach out through any of the channels
                below.
              </p>
            </div>
            <div className="space-y-3">
              {CONTACT_INFO.map((c) => (
                <Card key={c.label} className="border-border/70">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                      <c.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {c.label}
                      </div>
                      {c.href ? (
                        <a
                          href={c.href}
                          className="text-sm font-medium hover:text-primary hover:underline underline-offset-4"
                        >
                          {c.value}
                        </a>
                      ) : (
                        <div className="text-sm font-medium">{c.value}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-secondary/30 border-border/70">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-semibold">Visit the chapter</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The chapter holds its meetings and events across the
                  University of Embu main campus. Public visitors are welcome
                  to attend open chapter events — see the events calendar for
                  upcoming activities.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/events">
                    View events
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — form */}
          <div className="lg:col-span-3">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Send a message</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fill in the form and the chapter communications team will get
                  back to you.
                </p>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* EXEC TEAM (compact) */}
      <section className="bg-section-alt border-t border-border">
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              The executive team
            </h2>
            <p className="mt-3 text-muted-foreground">
              The chapter is led by an 11-member executive. Each carries a
              distinct area of responsibility — reach out to the right office
              and you'll get a faster response.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXEC_ROLES.map((r, idx) => (
              <Card
                key={`${r.title}-${idx}`}
                className="border-border/70 hover:border-primary/30 transition-colors"
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                    <r.icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold leading-tight">{r.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {r.area}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
