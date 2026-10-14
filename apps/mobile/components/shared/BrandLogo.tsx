import { Image } from "react-native";

export function BrandLogo({ width = 220 }: { width?: number }) {
  return (
    <Image
      source={require("../../assets/logo.png")}
      accessibilityLabel="GivHive — Giving is better together."
      style={{ width, height: width * 760 / 2800 }}
      resizeMode="contain"
    />
  );
}
