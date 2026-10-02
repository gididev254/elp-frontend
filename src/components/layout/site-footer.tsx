"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, ExternalLink } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const FOOTER_NAV: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Chapter",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/programs", label: "Programs" },
      { href: "/events", label: "Events" },
      { href: "/news", label: "News & Announcements" },
    ],
  },
  {
    title: "Engage",
    links: [
      { href: "/gallery", label: "Gallery" },
      { href: "/resources", label: "Resources" },
      { href: "/contacts", label: "Contacts" },
      { href: "/register", label: "Join the Chapter" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/dashboard", label: "Leader Dashboard" },
      { href: "/profile", label: "My Profile" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[#2B2B2B] text-white">
      <div className="container mx-auto px-4 md:px-6">
        {/* Top: brand + nav columns */}
        <div className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <Logo className="h-10 w-10 text-white" />
              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight">
                  Embuni Equity Leaders Chapter
                </div>
                <div className="text-[11px] uppercase tracking-wider text-white/70">
                  University of Embu &middot; Kenya
                </div>
              </div>
            </div>
            <p className="text-sm text-white/70 max-w-sm">
              The official digital home of the University of Embu Equity Leaders Chapter.
              Centralizing records, programs, events and engagement for present and future
              chapter leaders.
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-start gap-2 text-white/70">
                <MapPin className="h-4 w-4 mt-0.5 text-gold" />
                <span>University of Embu, Embu Town, Kenya</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Mail className="h-4 w-4 text-gold" />
                <a
                  href="mailto:elc@embuni.ac.ke"
                  className="hover:text-white hover:underline"
                >
                  elc@embuni.ac.ke
                </a>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Phone className="h-4 w-4 text-gold" />
                <span>+254 700 000 000</span>
              </div>
            </div>
          </div>

          {FOOTER_NAV.map((col) => (
            <div key={col.title} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-white hover:underline underline-offset-4"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 py-6">
          <p className="text-xs text-white/70">
            &copy; {year} Embuni Equity Leaders Chapter. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/70">
            <Link href="/about" className="hover:text-white hover:underline underline-offset-4">
              Privacy
            </Link>
            <Link href="/about" className="hover:text-white hover:underline underline-offset-4">
              Terms
            </Link>
            <a
              href="https://www.embuni.ac.ke"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-white hover:underline underline-offset-4"
            >
              University of Embu
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
