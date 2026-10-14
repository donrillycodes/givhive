import Image from "next/image";

const transparentArtwork = "/brand/givhive_primary_horizontal_2800x760.png";

/** Supplied brand lockup; use the reverse artwork on dark surfaces. */
export function BrandLogo({ reverse = false, width = 180 }: { reverse?: boolean; width?: number }) {
  return (
    <Image
      src={`/brand/givhive_primary_${reverse ? "reverse" : "horizontal"}_2800x760.png`}
      alt="GivHive — Giving is better together."
      width={2800}
      height={760}
      style={{
        width,
        maxWidth: "100%",
        height: "auto",
        // Both lockups share the same silhouette. Reuse the original alpha
        // to remove the reverse artwork's solid background without recoloring it.
        ...(reverse && {
          maskImage: `url("${transparentArtwork}")`,
          WebkitMaskImage: `url("${transparentArtwork}")`,
          maskMode: "alpha",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }),
      }}
      preload
    />
  );
}
