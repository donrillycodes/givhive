import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ngoApi, foodNeedApi } from "../../lib/api";
import {
  COLORS,
  FONT,
  SPACE,
  RADII,
  formatCategory,
  getProgress,
} from "../../lib/utils";
import { useTabBarScrollHandler } from "../../lib/tabBarScroll";
import type { NGO, FoodNeed, PaginatedResponse } from "../../types";

type Tab = "ngos" | "needs";

export default function DiscoverScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("ngos");
  const [search, setSearch] = useState("");
  const tabBarScrollHandler = useTabBarScrollHandler();

  const { data: ngosData, isLoading: ngosLoading } = useQuery({
    queryKey: ["all-ngos", search],
    queryFn: async () => {
      const res = await ngoApi.getAll({
        search: search || undefined,
        limit: 20,
      });
      return res.data.data as PaginatedResponse<NGO>;
    },
  });

  const { data: needsData, isLoading: needsLoading } = useQuery({
    queryKey: ["all-needs", search],
    queryFn: async () => {
      const res = await foodNeedApi.getAll({
        search: search || undefined,
        limit: 20,
      });
      return res.data.data as PaginatedResponse<FoodNeed>;
    },
    enabled: activeTab === "needs",
  });

  const ngos = ngosData?.items ?? [];
  const needs = needsData?.items ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSub} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={
              activeTab === "ngos" ? "Search NGOs..." : "Search food needs..."
            }
            placeholderTextColor={COLORS.textHint}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSub} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "ngos" && styles.tabActive]}
            onPress={() => setActiveTab("ngos")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "ngos" && styles.tabTextActive,
              ]}
            >
              NGOs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "needs" && styles.tabActive]}
            onPress={() => setActiveTab("needs")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "needs" && styles.tabTextActive,
              ]}
            >
              Food Needs
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onScroll={tabBarScrollHandler}
        scrollEventThrottle={16}
      >
        {activeTab === "ngos" ? (
          ngosLoading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : ngos.length === 0 ? (
            <Text style={styles.empty}>No NGOs found</Text>
          ) : (
            ngos.map((ngo) => (
              <TouchableOpacity
                key={ngo.id}
                style={styles.card}
                onPress={() => router.push(`/ngo/${ngo.slug}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.ngoAvatar}>
                  <Text style={styles.ngoAvatarText}>{ngo.name.charAt(0)}</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{ngo.name}</Text>
                  <Text style={styles.cardCategory}>
                    {formatCategory(ngo.category)} · {ngo.city}
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {ngo.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textHint}
                />
              </TouchableOpacity>
            ))
          )
        ) : needsLoading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : needs.length === 0 ? (
          <Text style={styles.empty}>No food needs found</Text>
        ) : (
          needs.map((need) => {
            const pct = getProgress(
              need.quantityFulfilled,
              need.quantityRequired,
            );
            return (
              <TouchableOpacity
                key={need.id}
                style={[styles.card, need.isUrgent && styles.cardUrgent]}
                onPress={() => router.push(`/food-need/${need.id}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.needIcon}>
                  <Ionicons
                    name="cube-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.needTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {need.title}
                    </Text>
                    {need.isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardCategory}>{need.ngo.name}</Text>
                  <View style={styles.progressRow}>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${pct}%` }]}
                      />
                    </View>
                    <Text style={styles.progressText}>{pct}%</Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textHint}
                />
              </TouchableOpacity>
            );
          })
        )}
        <View style={styles.bottomPad} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.xl,
    paddingBottom: SPACE.md,
    gap: SPACE.md,
  },
  title: {
    fontSize: FONT["2xl"],
    fontWeight: "800",
    color: COLORS.text,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACE.md,
    gap: SPACE.sm,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT.base,
    color: COLORS.text,
    paddingVertical: 0,
  },
  tabs: {
    flexDirection: "row",
    gap: SPACE.sm,
  },
  tab: {
    paddingHorizontal: SPACE.xl,
    paddingVertical: SPACE.sm,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT.md,
    fontWeight: "600",
    color: COLORS.textSub,
  },
  tabTextActive: {
    color: COLORS.surface,
  },
  list: {
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.sm,
    gap: SPACE.sm,
  },
  loader: {
    marginTop: SPACE["3xl"],
  },
  empty: {
    textAlign: "center",
    color: COLORS.textSub,
    fontSize: FONT.base,
    marginTop: SPACE["3xl"],
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  cardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  ngoAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADII.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ngoAvatarText: {
    fontSize: FONT.lg,
    fontWeight: "800",
    color: COLORS.primary,
  },
  needIcon: {
    width: 48,
    height: 48,
    borderRadius: RADII.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  cardCategory: {
    fontSize: FONT.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  cardDesc: {
    fontSize: FONT.sm,
    color: COLORS.textSub,
    lineHeight: 18,
  },
  needTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    flexWrap: "wrap",
  },
  urgentBadge: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
    borderRadius: RADII.sm,
  },
  urgentText: {
    color: COLORS.accent,
    fontSize: FONT.xs,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    marginTop: SPACE.xs,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADII.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: RADII.full,
  },
  progressText: {
    fontSize: FONT.xs,
    color: COLORS.textSub,
    width: 32,
  },
  bottomPad: {
    // Clears the floating tab bar (height + its bottom offset + safe area)
    height: 120,
  },
});
