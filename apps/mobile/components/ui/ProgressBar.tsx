import { View, StyleSheet, ViewStyle } from "react-native";
import { COLORS, RADII } from "../../lib/utils";

interface ProgressBarProps {
  percent: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
}

/**
 * Slim horizontal progress bar used on food-need cards and detail
 * screens. `percent` is clamped to 0-100.
 */
export function ProgressBar({
  percent,
  height = 5,
  trackColor = COLORS.surfaceAlt,
  fillColor = COLORS.primary,
  style,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: RADII.full, backgroundColor: trackColor },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          { width: `${clamped}%`, borderRadius: RADII.full, backgroundColor: fillColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
