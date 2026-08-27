import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface InputProps extends TextInputProps {
  label: string;
  icon?: IoniconName;
  /** Extra element rendered at the end of the label row (e.g. "Forgot password?"). */
  labelRight?: React.ReactNode;
  /** Renders an eye/eye-off toggle and manages the secure-entry state itself. */
  secureToggle?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Labeled text field with an optional leading icon and password-visibility
 * toggle — the field shape reused across the auth screens.
 */
export function Input({
  label,
  icon,
  labelRight,
  secureToggle = false,
  secureTextEntry,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  const [visible, setVisible] = useState(false);
  const isSecure = secureToggle ? !visible : secureTextEntry;

  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRight}
      </View>
      <View style={styles.inputWrap}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={COLORS.textSub}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={COLORS.textHint}
          secureTextEntry={isSecure}
          {...rest}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={COLORS.textSub}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: SPACE.sm,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: FONT.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACE.md,
    height: 52,
    gap: SPACE.sm,
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: FONT.base,
    color: COLORS.text,
    paddingVertical: 0,
  },
});
