import { Text, View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";

interface BadgeProps {
  label: string;
  bg?: string;
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Small pill label — defaults to the "urgent" accent styling used
 * throughout the app. Pass `bg`/`color` to reuse it for other states
 * (category tags, status pills, etc).
 */
export function Badge({
  label,
  bg = COLORS.accentLight,
  color = COLORS.accent,
  style,
  textStyle,
}: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color }, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: RADII.sm,
  },
  text: {
    fontSize: FONT.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
