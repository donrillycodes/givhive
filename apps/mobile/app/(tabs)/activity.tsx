import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { donationApi, pledgeApi } from "../../lib/api";
import {
  COLORS,
  FONT,
  SPACE,
  RADII,
  SHADOW,
  formatCurrency,
  formatDate,
  formatStatus,
} from "../../lib/utils";
import { useTabBarScrollHandler } from "../../lib/tabBarScroll";
import type { Donation, FoodPledge, PaginatedResponse } from "../../types";
import { useNavigationStore } from "../../store/authStore";

type Tab = "donations" | "pledges";

function statusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
    case "FULFILLED":
      return COLORS.success;
    case "PENDING":
    case "CONFIRMED":
      return COLORS.warning;
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
      return COLORS.error;
    default:
      return COLORS.textSub;
  }
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export default function ActivityScreen() {
  const { activityTab, setActiveTabTitle } = useNavigationStore();
  const [activeTab, setActiveTab] = useState<Tab>(activityTab);
  const tabBarScrollHandler = useTabBarScrollHandler();

  useEffect(() => {
    setActiveTab(activityTab);
  }, [activityTab]);

  useFocusEffect(
    useCallback(() => {
      setActiveTabTitle("Activity");
    }, [setActiveTabTitle]),
  );

  const { data: donationsData, isLoading: donationsLoading } = useQuery({
    queryKey: ["my-donations"],
    queryFn: async () => {
      const res = await donationApi.getMyDonations();
      return res.data.data as PaginatedResponse<Donation>;
    },
  });

  const { data: pledgesData, isLoading: pledgesLoading } = useQuery({
    queryKey: ["my-pledges"],
    queryFn: async () => {
      const res = await pledgeApi.getMyPledges();
      return res.data.data as PaginatedResponse<FoodPledge>;
    },
    enabled: activeTab === "pledges",
  });

  const donations = donationsData?.items ?? [];
  const pledges = pledgesData?.items ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Activity</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "donations" && styles.tabActive]}
            onPress={() => setActiveTab("donations")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "donations" && styles.tabTextActive,
              ]}
            >
              Donations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pledges" && styles.tabActive]}
            onPress={() => setActiveTab("pledges")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "pledges" && styles.tabTextActive,
              ]}
            >
              Food Pledges
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        onScroll={tabBarScrollHandler}
        scrollEventThrottle={16}
      >
        {activeTab === "donations" ? (
          donationsLoading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : donations.length === 0 ? (
            <EmptyState
              icon="heart-outline"
              title="No donations yet"
              message="Your donation history will appear here once you make your first contribution."
            />
          ) : (
            donations.map((donation) => (
              <View key={donation.id} style={styles.card}>
                <View style={styles.cardAvatar}>
                  <Text style={styles.cardAvatarText}>
                    {donation.ngo.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {donation.ngo.name}
                  </Text>
                  <Text style={styles.cardDate}>
                    {formatDate(donation.createdAt)}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.amount}>
                    {formatCurrency(Number(donation.amount))}
                  </Text>
                  <Text
                    style={[
                      styles.status,
                      { color: statusColor(donation.status) },
                    ]}
                  >
                    {formatStatus(donation.status)}
                  </Text>
                </View>
              </View>
            ))
          )
        ) : pledgesLoading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : pledges.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="No pledges yet"
            message="Your food pledge history will appear here once you start pledging."
          />
        ) : (
          pledges.map((pledge) => (
            <View key={pledge.id} style={styles.card}>
              <View style={[styles.cardAvatar, styles.pledgeAvatar]}>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={COLORS.warning}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {pledge.foodNeed?.title ?? "Food Pledge"}
                </Text>
                <Text style={styles.cardDate}>
                  {pledge.quantityPledged} {pledge.foodNeed?.unit} ·{" "}
                  {pledge.ngo?.name ?? "NGO"}
                </Text>
                <Text style={styles.cardDate}>
                  {formatDate(pledge.createdAt)}
                </Text>
              </View>
              <View style={styles.cardRight}>
                <Text
                  style={[styles.status, { color: statusColor(pledge.status) }]}
                >
                  {formatStatus(pledge.status)}
                </Text>
              </View>
            </View>
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
  emptyState: {
    alignItems: "center",
    paddingTop: SPACE["3xl"] * 2,
    gap: SPACE.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: RADII.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.sm,
  },
  emptyTitle: {
    fontSize: FONT.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyMessage: {
    fontSize: FONT.sm,
    color: COLORS.textSub,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: SPACE.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    ...SHADOW.card,
    padding: SPACE.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: RADII.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pledgeAvatar: {
    backgroundColor: COLORS.warningLight,
  },
  cardAvatarText: {
    fontSize: FONT.lg,
    fontWeight: "800",
    color: COLORS.primary,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: FONT.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  cardDate: {
    fontSize: FONT.xs,
    color: COLORS.textSub,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  amount: {
    fontSize: FONT.base,
    fontWeight: "700",
    color: COLORS.text,
  },
  status: {
    fontSize: FONT.xs,
    fontWeight: "600",
  },
  bottomPad: {
    // Clears the floating tab bar (height + its bottom offset + safe area)
    height: 120,
  },
});
