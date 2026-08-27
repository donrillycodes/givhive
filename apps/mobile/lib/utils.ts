// ── Harvest Design Tokens ──────────────────────────────────────────────────────
export const COLORS = {
  // Primary — forest green
  primary: "#2A6041",
  primaryDark: "#1A4A30",
  primaryLight: "#E8F4EE",

  // Accent — warm orange (urgency, highlights)
  accent: "#E8793A",
  accentLight: "#FEF0E8",

  // Surfaces
  background: "#FAFAF7",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F4F0",

  // Typography
  text: "#1C1C1C",
  textSub: "#6B7280",
  textHint: "#9CA3AF",

  // Borders
  border: "#E8E8E4",
  borderStrong: "#D0D0CC",

  // Semantic
  success: "#16A34A",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  error: "#DC2626",
  errorLight: "#FEF2F2",
  errorBorder: "#FECACA",

  // ── Backward-compat aliases (all existing COLORS.x references still work) ──
  orange: "#E8793A",
  orangeDk: "#C9622A",
  orangeLt: "#FEF0E8",
  greenDk: "#1A4A30",
  green: "#2A6041",
  greenLt: "#E8F4EE", // was '#6B8B6B' — now a proper light tint
  white: "#FFFFFF",
  black: "#1C1C1C",
  gray: "#6B7280",
  grayMd: "#E8E8E4",
  grayLt: "#F4F4F0",
  red: "#DC2626",
  amber: "#D97706",
  blue: "#3B4DBF",
} as const;

// ── Typography scale ───────────────────────────────────────────────────────────
export const FONT = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 34,
} as const;

// ── Spacing scale ──────────────────────────────────────────────────────────────
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

// ── Border radii ───────────────────────────────────────────────────────────────
export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 28,
  full: 9999,
} as const;

// ── Card shadow ─────────────────────────────────────────────────────────────────
// One shared recipe for "floating" cards (quick actions, NGO cards, list rows,
// boxed sections) so depth reads consistently instead of a flat hairline
// border. Not used on inputs, buttons, or pill/tab toggles — those keep borders.
export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 3,
  },
} as const;

// ── Helper functions (unchanged) ───────────────────────────────────────────────
// Format currency — always two decimal places
export function formatCurrency(
  amount: number | string,
  currency = "CAD",
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(
    num,
  );
}
// Format date — human readable
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}
// Format relative time — "2 hours ago"
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return formatDate(date);
}

// Truncate text with ellipsis
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

// Get initials from name
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Format NGO category for display
export function formatCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
// Format status for display
export function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}
// Get progress percentage
export function getProgress(fulfilled: number, required: number): number {
  if (required === 0) return 0;
  return Math.min(Math.round((fulfilled / required) * 100), 100);
}
