// Auth route group layout.
// Auth pages (login, register) have their own full-screen branding — no public header/footer.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
