import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans", // important for Tailwind v4
  display: "swap",
});

export const metadata: Metadata = {
  title: "GivHive Dashboard",
  description:
    "NGO and Admin dashboard for the GivHive platform — connecting food donors with communities in Winnipeg.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={plusJakartaSans.variable}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
