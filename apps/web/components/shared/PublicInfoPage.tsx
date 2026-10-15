import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";

export function PublicInfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#1C1C1C]">
      <header className="border-b border-[#E8E8E4] bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
          <Link href="/" aria-label="GivHive home"><BrandLogo width={180} /></Link>
          <Link href="/" className="text-sm font-medium text-[#1A7A4A] hover:underline">← Back to home</Link>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#1A4530]">{title}</h1>
        <div className="space-y-8 text-[15px] leading-[1.75]">{children}</div>
        <nav aria-label="Information pages" className="mt-12 pt-6 border-t border-[#E8E8E4] flex flex-wrap gap-6 text-sm text-[#1A7A4A]">
          <Link href="/support" className="hover:underline">Support</Link>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </nav>
        <p className="mt-6 text-sm text-[#6B7280]">GivHive · Winnipeg, Manitoba, Canada</p>
      </article>
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold tracking-tight text-[#1A4530]">{title}</h2>
      {children}
    </section>
  );
}
