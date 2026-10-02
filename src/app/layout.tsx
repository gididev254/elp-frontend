import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { QueryProvider } from "@/components/query-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Embuni ELC — University of Embu Equity Leaders Chapter",
    template: "%s | Embuni ELC",
  },
  description:
    "The official digital platform of the University of Embu Equity Leaders Chapter. Centralized records, programs, events, mentorship, and engagement for chapter leaders.",
  keywords: [
    "University of Embu",
    "Embuni ELC",
    "Equity Leaders Chapter",
    "student leadership",
    "Kenya",
    "mentorship",
    "chapter management",
  ],
  authors: [{ name: "Embuni Equity Leaders Chapter" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Embuni ELC — University of Embu Equity Leaders Chapter",
    description:
      "Centralized digital platform for chapter records, programs, events, and engagement.",
    siteName: "Embuni ELC",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SessionProvider>
            <QueryProvider>
              <div className="min-h-screen flex flex-col">
                <SiteHeader />
                <main className="flex-1 flex flex-col">{children}</main>
                <SiteFooter />
              </div>
              <Toaster />
              <Sonner />
            </QueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
