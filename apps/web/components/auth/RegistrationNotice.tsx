import Link from "next/link";

export function RegistrationNotice() {
  return (
    <p className="text-xs leading-relaxed text-ink-muted">
      By creating an account, you agree to our{" "}
      <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-brand-green-dk">Terms of Service</Link>.
      Our{" "}
      <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-brand-green-dk">Privacy Policy</Link>{" "}
      explains how we handle your information. These links open in a new tab.
    </p>
  );
}
