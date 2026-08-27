import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { ngoApi, foodNeedApi, updateApi } from "../../lib/api";
import {
  COLORS,
  FONT,
  SPACE,
  RADII,
  formatRelativeTime,
  truncate,
  formatCategory,
} from "../../lib/utils";
import { useTabBarScrollHandler } from "../../lib/tabBarScroll";
import { SectionHeader } from "../../components/shared/SectionHeader";
import { NGOAvatar } from "../../components/shared/NGOAvatar";
import { FoodNeedCard } from "../../components/shared/FoodNeedCard";
import type { NGO, FoodNeed, NGOUpdate, PaginatedResponse } from "../../types";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// ── Sub-components ─────────────────────────────────────────────────────────────

interface QuickActionProps {
  icon: IoniconName;
  label: string;
  sub: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}

function QuickAction({
  icon,
  label,
  sub,
  iconBg,
  iconColor,
  onPress,
}: QuickActionProps) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.quickActionIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View>
        <Text style={styles.quickActionLabel}>{label}</Text>
        <Text style={styles.quickActionSub}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tabBarScrollHandler = useTabBarScrollHandler();

  const {
    data: ngosData,
    isLoading: ngosLoading,
    refetch: refetchNgos,
  } = useQuery({
    queryKey: ["featured-ngos"],
    queryFn: async () => {
      const res = await ngoApi.getAll({ limit: 5 });
      return res.data.data as PaginatedResponse<NGO>;
    },
  });

  const {
    data: needsData,
    isLoading: needsLoading,
    refetch: refetchNeeds,
  } = useQuery({
    queryKey: ["urgent-needs"],
    queryFn: async () => {
      const res = await foodNeedApi.getAll({ isUrgent: true, limit: 3 });
      return res.data.data as PaginatedResponse<FoodNeed>;
    },
  });

  const {
    data: updatesData,
    isLoading: updatesLoading,
    refetch: refetchUpdates,
  } = useQuery({
    queryKey: ["recent-updates"],
    queryFn: async () => {
      const res = await updateApi.getAll({ limit: 5 });
      return res.data.data as PaginatedResponse<NGOUpdate>;
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchNgos(), refetchNeeds(), refetchUpdates()]);
    setIsRefreshing(false);
  };

  const ngos = ngosData?.items ?? [];
  const urgentNeeds = needsData?.items ?? [];
  const updates = updatesData?.items ?? [];

  // Derive a simple aggregate for the impact card
  const totalNGOs = ngosData?.meta?.total ?? 0;
  const totalNeeds = needsData?.meta?.total ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={tabBarScrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.firstName} 👋</Text>
            <Text style={styles.headerSub}>
              Make a difference in Winnipeg today
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={COLORS.text}
            />
          </TouchableOpacity>
        </View>

        {/* ── Impact card ── */}
        <View style={styles.impactCard}>
          <View>
            <Text style={styles.impactLabel}>Active in Winnipeg</Text>
            <Text style={styles.impactNumber}>
              {totalNGOs > 0 ? totalNGOs : "—"}
            </Text>
            <Text style={styles.impactUnit}>verified charities</Text>
          </View>
          <View style={styles.impactDivider} />
          <View>
            <Text style={styles.impactLabel}>Open right now</Text>
            <Text style={styles.impactNumber}>
              {totalNeeds > 0 ? totalNeeds : "—"}
            </Text>
            <Text style={styles.impactUnit}>food requests</Text>
          </View>
          <View style={styles.impactCta}>
            <Ionicons name="leaf" size={14} color={COLORS.primaryLight} />
            <Text style={styles.impactCtaText}>GivHive</Text>
          </View>
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.quickActions}>
          <QuickAction
            icon="heart-outline"
            label="Donate"
            sub="Cash gift"
            iconBg={COLORS.accentLight}
            iconColor={COLORS.accent}
            onPress={() => router.push("/(tabs)/discover")}
          />
          <QuickAction
            icon="cube-outline"
            label="Pledge Food"
            sub="Food items"
            iconBg={COLORS.primaryLight}
            iconColor={COLORS.primary}
            onPress={() => router.push("/(tabs)/discover")}
          />
          <QuickAction
            icon="receipt-outline"
            label="My Activity"
            sub="History"
            iconBg="#EEF2FF"
            iconColor={COLORS.blue}
            onPress={() => router.push("/(tabs)/activity")}
          />
          <QuickAction
            icon="business-outline"
            label="NGOs"
            sub="Browse all"
            iconBg={COLORS.warningLight}
            iconColor={COLORS.warning}
            onPress={() => router.push("/(tabs)/discover")}
          />
        </View>

        {/* ── Urgent needs ── */}
        {(urgentNeeds.length > 0 || needsLoading) && (
          <View style={styles.section}>
            <SectionHeader
              title="Urgent needs"
              onSeeAll={() => router.push("/discover?tab=needs" as any)}
            />
            {needsLoading ? (
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : (
              urgentNeeds.map((need) => (
                <FoodNeedCard
                  key={need.id}
                  need={need}
                  variant="urgent"
                  onPress={() => router.push(`/food-need/${need.id}` as any)}
                />
              ))
            )}
          </View>
        )}

        {/* ── Featured NGOs ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Featured NGOs"
            onSeeAll={() => router.push("/(tabs)/discover")}
          />
          {ngosLoading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ngoRow}
            >
              {ngos.map((ngo) => (
                <TouchableOpacity
                  key={ngo.id}
                  style={styles.ngoCard}
                  onPress={() => router.push(`/ngo/${ngo.slug}` as any)}
                  activeOpacity={0.75}
                >
                  <NGOAvatar name={ngo.name} logoUrl={ngo.logoUrl} />
                  <Text style={styles.ngoName} numberOfLines={2}>
                    {ngo.name}
                  </Text>
                  <Text style={styles.ngoCategory}>
                    {formatCategory(ngo.category)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Latest updates ── */}
        <View style={styles.section}>
          <SectionHeader title="Latest updates" />
          {updatesLoading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : updates.length === 0 ? (
            <Text style={styles.emptyText}>No updates yet</Text>
          ) : (
            updates.map((update) => (
              <TouchableOpacity
                key={update.id}
                style={styles.updateCard}
                onPress={() => router.push(`/update/${update.id}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.updateHeader}>
                  <NGOAvatar name={update.ngo.name} logoUrl={update.ngo.logoUrl} size={36} />
                  <View style={styles.updateMeta}>
                    <Text style={styles.updateNgo}>{update.ngo.name}</Text>
                    <Text style={styles.updateTime}>
                      {formatRelativeTime(
                        update.publishedAt ?? update.createdAt,
                      )}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={COLORS.textHint}
                  />
                </View>
                <Text style={styles.updateTitle}>{update.title}</Text>
                {update.summary && (
                  <Text style={styles.updateSummary}>
                    {truncate(update.summary, 110)}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.bottomPad} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.xl,
    paddingBottom: SPACE.lg,
  },
  greeting: {
    fontSize: FONT.xl,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSub: {
    fontSize: FONT.sm,
    color: COLORS.textSub,
    marginTop: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Impact card
  impactCard: {
    marginHorizontal: SPACE.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.xl,
    padding: SPACE.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xl,
    marginBottom: SPACE.xl,
    position: "relative",
    overflow: "hidden",
  },
  impactLabel: {
    fontSize: FONT.xs,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
    marginBottom: 2,
  },
  impactNumber: {
    fontSize: FONT["3xl"],
    fontWeight: "900",
    color: COLORS.surface,
    lineHeight: 32,
  },
  impactUnit: {
    fontSize: FONT.xs,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  impactDivider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  impactCta: {
    position: "absolute",
    bottom: SPACE.md,
    right: SPACE.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    opacity: 0.4,
  },
  impactCtaText: {
    fontSize: FONT.xs,
    color: COLORS.surface,
    fontWeight: "600",
  },

  // Quick actions
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACE.xl,
    gap: SPACE.md,
    marginBottom: SPACE.xl,
  },
  quickAction: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    padding: SPACE.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADII.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  quickActionLabel: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  quickActionSub: {
    fontSize: FONT.xs,
    color: COLORS.textSub,
    marginTop: 1,
  },

  // Sections
  section: {
    marginBottom: SPACE.xl,
  },
  loader: {
    marginTop: SPACE.xl,
  },
  emptyText: {
    paddingHorizontal: SPACE.xl,
    color: COLORS.textSub,
    fontSize: FONT.sm,
  },

  // NGO cards
  ngoRow: {
    paddingHorizontal: SPACE.xl,
    gap: SPACE.md,
  },
  ngoCard: {
    width: 130,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    gap: SPACE.sm,
  },
  ngoName: {
    fontSize: FONT.sm,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  ngoCategory: {
    fontSize: FONT.xs,
    color: COLORS.primary,
    fontWeight: "500",
    textAlign: "center",
  },

  // Update cards
  updateCard: {
    marginHorizontal: SPACE.xl,
    marginBottom: SPACE.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    padding: SPACE.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACE.sm,
  },
  updateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  updateMeta: {
    flex: 1,
  },
  updateNgo: {
    fontSize: FONT.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  updateTime: {
    fontSize: FONT.xs,
    color: COLORS.textSub,
    marginTop: 1,
  },
  updateTitle: {
    fontSize: FONT.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  updateSummary: {
    fontSize: FONT.sm,
    color: COLORS.textSub,
    lineHeight: 19,
  },

  bottomPad: {
    // Clears the floating tab bar (height + its bottom offset + safe area)
    height: 120,
  },
});
