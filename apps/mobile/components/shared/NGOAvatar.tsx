import { View, Text, StyleSheet, Image } from "react-native";
import { COLORS } from "../../lib/utils";

interface NGOAvatarProps {
  name: string;
  size?: number;
  /** Optional logo image URL — falls back to the initials mark when absent. */
  logoUrl?: string;
}

// A small rotation of brand colors so a list of NGO initials doesn't read as
// one repeated green block — picked deterministically from the name so the
// same NGO always lands on the same color.
const PALETTE = [
  { bg: COLORS.primaryLight, color: COLORS.primary },
  { bg: "#EEF2FF", color: COLORS.blue },
  { bg: COLORS.warningLight, color: COLORS.warning },
  { bg: COLORS.accentLight, color: COLORS.accent },
];

function paletteFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Circular initials mark (or logo image) used for NGOs across cards and lists. */
export function NGOAvatar({ name, size = 48, logoUrl }: NGOAvatarProps) {
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        resizeMode="cover"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  const { bg, color } = paletteFor(name);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.35, color }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "800",
  },
});
