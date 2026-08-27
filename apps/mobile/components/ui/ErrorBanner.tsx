import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";

interface ErrorBannerProps {
  message?: string;
}

/**
 * Inline form error banner (icon + message). Renders nothing when
 * `message` is empty, so callers can use it unconditionally:
 * `<ErrorBanner message={error} />`.
 */
export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <View style={styles.box}>
      <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    backgroundColor: COLORS.errorLight,
    borderRadius: RADII.md,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
  },
  text: {
    fontSize: FONT.sm,
    color: COLORS.error,
    flex: 1,
    lineHeight: 18,
  },
});
