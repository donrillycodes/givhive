import { View, Text, StyleSheet, Image } from "react-native";
import { COLORS } from "../../lib/utils";

interface NGOAvatarProps {
  name: string;
  size?: number;
  /** Optional logo image URL — falls back to the initials mark when absent. */
  logoUrl?: string;
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

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.35 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "800",
    color: COLORS.primary,
  },
});
