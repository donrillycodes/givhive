export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cream surface so the form panel feels like an extension of the landing
  // page. Each auth page renders its own brand panel + form layout.
  return <main className="min-h-screen bg-cream">{children}</main>;
}
