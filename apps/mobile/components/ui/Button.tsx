import { Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface ButtonProps {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  icon?: IoniconName;
  variant?: "primary" | "secondary";
  style?: ViewStyle;
}

/**
 * Primary action button used across auth and detail screens — a filled
 * pill with a loading state and an optional trailing icon. Pass
 * `variant="secondary"` for a muted/cancel-style button.
 */
export function Button({
  label,
  loadingLabel,
  loading = false,
  disabled = false,
  onPress,
  icon,
  variant = "primary",
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        variant === "secondary" && styles.btnSecondary,
        isDisabled && styles.btnDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.btnText,
          variant === "secondary" && styles.btnTextSecondary,
        ]}
      >
        {loading ? (loadingLabel ?? label) : label}
      </Text>
      {!loading && icon && variant === "primary" && (
        <Ionicons name={icon} size={18} color={COLORS.surface} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.lg,
    paddingVertical: SPACE.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
  },
  btnSecondary: {
    backgroundColor: COLORS.surfaceAlt,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: FONT.base,
    fontWeight: "700",
    color: COLORS.surface,
  },
  btnTextSecondary: {
    color: COLORS.textSub,
    fontWeight: "500",
  },
});
