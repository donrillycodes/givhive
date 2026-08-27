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
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ngoApi, foodNeedApi } from "../../lib/api";
import { useNavigationStore } from "../../store/authStore";
import { COLORS, FONT, SPACE, RADII, formatCategory } from "../../lib/utils";
import { useTabBarScrollHandler } from "../../lib/tabBarScroll";
import { NGOAvatar } from "../../components/shared/NGOAvatar";
import { FoodNeedCard } from "../../components/shared/FoodNeedCard";
import type { NGO, FoodNeed, PaginatedResponse } from "../../types";

type Tab = "ngos" | "needs";

export default function DiscoverScreen() {
  const router = useRouter();
  const setActiveTabTitle = useNavigationStore((s) => s.setActiveTabTitle);
  const [activeTab, setActiveTab] = useState<Tab>("ngos");
  const [search, setSearch] = useState("");
  const tabBarScrollHandler = useTabBarScrollHandler();

  useFocusEffect(
    useCallback(() => {
      setActiveTabTitle("Search");
    }, [setActiveTabTitle]),
  );

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
                <NGOAvatar name={ngo.name} logoUrl={ngo.logoUrl} />
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
          needs.map((need) => (
            <FoodNeedCard
              key={need.id}
              need={need}
              variant="compact"
              onPress={() => router.push(`/food-need/${need.id}` as any)}
            />
          ))
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
  bottomPad: {
    // Clears the floating tab bar (height + its bottom offset + safe area)
    height: 120,
  },
});
