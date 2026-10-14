import Image from "next/image";

/** Supplied brand lockup; use the reverse artwork on dark surfaces. */
export function BrandLogo({ reverse = false, width = 180 }: { reverse?: boolean; width?: number }) {
  return (
    <Image
      src={`/brand/givhive_primary_${reverse ? "reverse" : "horizontal"}_2800x760.png`}
      alt="GivHive — Giving is better together."
      width={2800}
      height={760}
      style={{ width, maxWidth: "100%", height: "auto" }}
      preload
    />
  );
}
