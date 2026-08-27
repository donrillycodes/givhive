import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ngoApi, foodNeedApi } from "../../lib/api";
import { COLORS, FONT, SHADOW, formatCategory } from "../../lib/utils";
import { NGOAvatar } from "../../components/shared/NGOAvatar";
import { FoodNeedCard } from "../../components/shared/FoodNeedCard";
import { Button } from "../../components/ui/Button";
import type { NGO, FoodNeed, PaginatedResponse } from "../../types";

export default function NGOProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const { data: ngoData, isLoading: ngoLoading } = useQuery({
    queryKey: ["ngo", slug],
    queryFn: async () => {
      const response = await ngoApi.getOne(slug);
      return response.data.data.ngo as NGO;
    },
  });

  const { data: needsData, isLoading: needsLoading } = useQuery({
    queryKey: ["ngo-needs", ngoData?.slug],
    queryFn: async () => {
      const response = await foodNeedApi.getAll({ limit: 20 });
      const all = response.data.data as PaginatedResponse<FoodNeed>;
      return {
        ...all,
        items: all.items.filter((n) => n.ngo.id === ngoData!.id),
      };
    },
    enabled: !!ngoData?.id,
  });

  const ngo = ngoData;
  const needs = needsData?.items ?? [];

  const headerOptions = {
    headerShown: true,
    title: ngo?.name ?? "NGO Profile",
    headerTintColor: COLORS.primary,
    headerStyle: { backgroundColor: COLORS.background },
    headerShadowVisible: false,
    headerTitleStyle: {
      fontSize: FONT.base,
      fontWeight: "700" as const,
      color: COLORS.text,
    },
  };

  if (ngoLoading) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right"]}
        >
          <ActivityIndicator color={COLORS.green} style={{ marginTop: 40 }} />
        </SafeAreaView>
      </>
    );
  }

  if (!ngo) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right"]}
        >
          <View style={styles.errorState}>
            <Text style={styles.errorText}>NGO not found</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backLink}>Go back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Cover image */}
          {ngo.coverUrl && (
            <Image
              source={{ uri: ngo.coverUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          )}

          {/* NGO hero */}
          <View style={styles.hero}>
            <NGOAvatar name={ngo.name} logoUrl={ngo.logoUrl} size={80} />
            <Text style={styles.ngoName}>{ngo.name}</Text>
            <Text style={styles.ngoCategory}>
              {formatCategory(ngo.category)} · {ngo.city}, {ngo.province}
            </Text>

            {/* Donate button */}
            <Button
              label="❤️ Donate Now"
              onPress={() => router.push(`/donate/${ngo.id}` as any)}
              style={styles.donateButton}
            />
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{ngo.description}</Text>
            {ngo.mission && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
                  Mission
                </Text>
                <Text style={styles.description}>{ngo.mission}</Text>
              </>
            )}
          </View>

          {/* Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{ngo.email}</Text>
            </View>
            {ngo.phone && (
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{ngo.phone}</Text>
              </View>
            )}
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Address</Text>
              <Text style={styles.contactValue}>
                {ngo.address}, {ngo.city}
              </Text>
            </View>
            {ngo.website && (
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Website</Text>
                <Text style={[styles.contactValue, { color: COLORS.green }]}>
                  {ngo.website}
                </Text>
              </View>
            )}
          </View>

          {/* Food needs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Food Needs</Text>
            {needsLoading ? (
              <ActivityIndicator color={COLORS.green} />
            ) : needs.length === 0 ? (
              <Text style={styles.emptyText}>
                No open food needs at the moment
              </Text>
            ) : (
              needs.map((need) => (
                <FoodNeedCard
                  key={need.id}
                  need={need}
                  variant="minimal"
                  onPress={() => router.push(`/food-need/${need.id}` as any)}
                />
              ))
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: COLORS.white,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMd,
    gap: 6,
  },
  ngoName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.black,
    textAlign: "center",
  },
  ngoCategory: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 14,
  },
  donateButton: {
    paddingHorizontal: 40,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    ...SHADOW.card,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLt,
  },
  contactLabel: {
    fontSize: 13,
    color: COLORS.gray,
    width: 70,
    fontWeight: "500",
  },
  contactValue: {
    fontSize: 13,
    color: COLORS.black,
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: "center",
    paddingVertical: 12,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  backLink: {
    fontSize: 15,
    color: COLORS.green,
    fontWeight: "500",
  },
  bottomPadding: {
    height: 40,
  },
  coverImage: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.grayLt,
  },
});
