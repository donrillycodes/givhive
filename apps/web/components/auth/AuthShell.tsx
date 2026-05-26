import { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

// AuthShell — shared pieces for /login, /register, and /download.
// The brand panel sits on the left on desktop; on mobile it collapses to
// a compact top logo + tagline. Everything references GivHive.
//
// Visual refresh matches landing: deep forest panel with hex texture,
// Fraunces serif headline with italic accent, cream form panel.

// ─── Hexagon hive logo mark ────────────────────────────────────────────────
export function HiveMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <path d="M14 2L24.3923 8V20L14 26L3.60769 20V8L14 2Z" fill="#1a7a4a" />
      <path
        d="M14 7L19.1962 10V16L14 19L8.80385 16V10L14 7Z"
        fill="#4dbf83"
        opacity="0.9"
      />
    </svg>
  );
}

// ─── Dark brand panel (desktop left column) ────────────────────────────────
export function BrandPanel({
  heading = "Connecting donors with the communities that need them most.",
  highlight = "donors",
  subheading = "The management dashboard for NGOs and administrators running food donation programmes in Winnipeg.",
  bullets = [
    "Verified NGO organisations only",
    "Real-time food pledge tracking",
    "Secure, role-based access control",
  ],
}: {
  heading?: ReactNode;
  /** Optional substring inside `heading` to render as the italic accent. */
  highlight?: string;
  subheading?: ReactNode;
  bullets?: string[];
}) {
  // Render the heading with the highlighted substring wrapped in an italic
  // serif accent so it picks up the landing-page treatment.
  const renderHeading = () => {
    if (typeof heading !== "string" || !highlight) return heading;
    const idx = heading.indexOf(highlight);
    if (idx === -1) return heading;
    return (
      <>
        {heading.slice(0, idx)}
        <em className="italic font-light text-green-400">{highlight}</em>
        {heading.slice(idx + highlight.length)}
      </>
    );
  };

  return (
    <div
      className="hidden lg:flex lg:flex-col lg:justify-between p-10 xl:p-14 flex-shrink-0 auth-brand-hex-bg relative"
      style={{
        background: "#0d2e1c",
        width: "42%",
        minWidth: "440px",
        maxWidth: "580px",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 relative">
        <HiveMark size={28} />
        <span className="font-serif text-white text-lg font-semibold tracking-tight">
          GivHive
        </span>
      </div>

      {/* Copy */}
      <div className="relative">
        <h2 className="font-serif text-[34px] xl:text-[38px] font-semibold leading-[1.12] tracking-tight text-white mb-4">
          {renderHeading()}
        </h2>
        <p
          className="text-[15px] leading-relaxed max-w-[380px]"
          style={{ color: "rgba(255,255,255,0.62)" }}
        >
          {subheading}
        </p>

        <div className="mt-7 space-y-3">
          {bullets.map((point) => (
            <div key={point} className="flex items-center gap-3">
              <span
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(77,191,131,0.18)",
                  color: "#4dbf83",
                }}
              >
                <ShieldCheck className="w-3 h-3" />
              </span>
              <p
                className="text-[13px]"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {point}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p
        className="text-xs tracking-wider relative"
        style={{ color: "rgba(255,255,255,0.32)" }}
      >
        GivHive — Winnipeg, Canada
      </p>
    </div>
  );
}

// ─── Mobile top logo (replaces the brand panel on small screens) ───────────
export function MobileLogo() {
  return (
    <div className="flex flex-col items-center gap-2 mb-7 lg:hidden">
      <HiveMark size={36} />
      <span className="font-serif font-semibold text-ink text-lg tracking-tight">
        GivHive
      </span>
      <p className="text-[11px] text-ink-subtle text-center">
        NGO &amp; Admin Dashboard
      </p>
    </div>
  );
}

// ─── Google SSO placeholder ────────────────────────────────────────────────
export function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSoonButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2.5 h-12 px-4 rounded-xl border-[1.5px] border-[rgba(13,46,28,0.14)] bg-[#fbfaf5] text-[13px] font-semibold text-ink-soft hover:border-brand-green hover:bg-white transition-colors relative"
    >
      <GoogleIcon />
      Continue with Google
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold tracking-wide">
        SOON
      </span>
    </button>
  );
}

export function OrDivider({ label = "or use email" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-[rgba(13,46,28,0.10)]" />
      <span className="text-[10.5px] text-ink-muted uppercase tracking-[0.12em] font-semibold">
        {label}
      </span>
      <div className="flex-1 h-px bg-[rgba(13,46,28,0.10)]" />
    </div>
  );
}
