import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, FONT, SPACE } from "../../lib/utils";

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

/** Section title with an optional "See all" action, used above home-feed lists. */
export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <View style={styles.header}>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACE.xl,
    marginBottom: SPACE.md,
  },
  title: {
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
