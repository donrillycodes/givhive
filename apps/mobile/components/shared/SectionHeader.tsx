import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, FONT, SPACE } from "../../lib/utils";

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

/** Section title with a small accent bar and an optional "See all" action. */
export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.bar} />
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.xl,
    marginBottom: SPACE.md,
  },
  bar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  title: {
    flex: 1,
    fontSize: FONT.base,
    fontWeight: "700",
    color: COLORS.text,
  },
  seeAll: {
    fontSize: FONT.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
