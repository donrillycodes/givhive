import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT, SPACE, RADII, getProgress } from "../../lib/utils";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import type { FoodNeed } from "../../types";

interface FoodNeedCardProps {
  need: FoodNeed;
  onPress: () => void;
  /**
   * "urgent" — featured card used on the home screen's urgent-needs section.
   * "compact" — icon + chevron row used in Discover's food-needs list.
   * "minimal" — plain bordered row used on an NGO's profile page.
   */
  variant?: "urgent" | "compact" | "minimal";
}

export function FoodNeedCard({ need, onPress, variant = "compact" }: FoodNeedCardProps) {
  const pct = getProgress(need.quantityFulfilled, need.quantityRequired);

  if (variant === "urgent") {
    return (
      <TouchableOpacity
        style={styles.urgentCard}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Badge label="URGENT" />
        <Text style={styles.urgentTitle}>{need.title}</Text>
        <Text style={styles.urgentNgo}>
          {need.ngo.name} · {need.ngo.city}
        </Text>
        <View style={styles.progressRow}>
          <ProgressBar percent={pct} style={styles.progressBarFlex} />
          <Text style={styles.progressText}>
            {need.quantityFulfilled}/{need.quantityRequired} {need.unit}
          </Text>
        </View>
        <View style={styles.urgentArrow}>
          <Ionicons name="arrow-forward" size={14} color={COLORS.surface} />
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === "minimal") {
    return (
      <TouchableOpacity
        style={styles.minimalCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.minimalHeader}>
          <Text style={styles.minimalTitle} numberOfLines={1}>
            {need.title}
          </Text>
          {need.isUrgent && (
            <Badge
              label="URGENT"
              style={styles.smallBadge}
              textStyle={styles.smallBadgeText}
            />
          )}
        </View>
        <Text style={styles.minimalSubtitle}>
          {need.itemName} · {need.quantityFulfilled}/{need.quantityRequired}{" "}
          {need.unit}
        </Text>
        <ProgressBar percent={pct} />
      </TouchableOpacity>
    );
  }

  // compact
  return (
    <TouchableOpacity
      style={[styles.compactCard, need.isUrgent && styles.compactCardUrgent]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.compactIcon}>
        <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.compactContent}>
        <View style={styles.compactTitleRow}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {need.title}
          </Text>
          {need.isUrgent && (
            <Badge
              label="URGENT"
              style={styles.smallBadge}
              textStyle={styles.smallBadgeText}
            />
          )}
        </View>
        <Text style={styles.compactNgo}>{need.ngo.name}</Text>
        <View style={styles.progressRow}>
          <ProgressBar percent={pct} height={4} style={styles.progressBarFlex} />
          <Text style={styles.progressTextSm}>{pct}%</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textHint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
  },
  progressBarFlex: {
    flex: 1,
  },
  smallBadge: {
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
    marginBottom: 0,
  },
  smallBadgeText: {
    fontSize: FONT.xs,
  },

  // ── urgent variant ──
  urgentCard: {
    marginHorizontal: SPACE.xl,
    marginBottom: SPACE.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    padding: SPACE.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    position: "relative",
    gap: SPACE.xs,
  },
  urgentTitle: {
    fontSize: FONT.base,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SPACE.sm,
    paddingRight: SPACE["2xl"],
  },
  urgentNgo: {
    fontSize: FONT.sm,
    color: COLORS.textSub,
    marginBottom: SPACE.xs,
  },
  progressText: {
    fontSize: FONT.xs,
    color: COLORS.textSub,
  },
  urgentArrow: {
    position: "absolute",
    top: SPACE.lg,
    right: SPACE.lg,
    width: 28,
    height: 28,
    borderRadius: RADII.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── compact variant ──
  compactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  compactCardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  compactIcon: {
    width: 48,
    height: 48,
    borderRadius: RADII.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  compactContent: {
    flex: 1,
    gap: 4,
  },
  compactTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    flexWrap: "wrap",
  },
  compactTitle: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  compactNgo: {
    fontSize: FONT.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  progressTextSm: {
    fontSize: FONT.xs,
    color: COLORS.textSub,
    width: 32,
  },

  // ── minimal variant ──
  minimalCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    padding: SPACE.md,
    marginBottom: SPACE.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACE.xs,
  },
  minimalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
  },
  minimalTitle: {
    fontSize: FONT.sm,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  minimalSubtitle: {
    fontSize: FONT.xs,
    color: COLORS.textSub,
    marginBottom: SPACE.xs,
  },
});
