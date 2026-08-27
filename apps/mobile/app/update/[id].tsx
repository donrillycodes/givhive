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
import { updateApi } from "../../lib/api";
import { COLORS, FONT, formatDate, formatRelativeTime } from "../../lib/utils";
import type { NGOUpdate } from "../../types";

export default function UpdateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: update, isLoading } = useQuery({
    queryKey: ["update", id],
    queryFn: async () => {
      const response = await updateApi.getOne(id);
      return response.data.data.update as NGOUpdate;
    },
  });

  const headerOptions = {
    headerShown: true,
    title: update?.title ?? "Update",
    headerTintColor: COLORS.primary,
    headerStyle: { backgroundColor: COLORS.background },
    headerShadowVisible: false,
    headerTitleStyle: {
      fontSize: FONT.base,
      fontWeight: "700" as const,
      color: COLORS.text,
    },
  };

  if (isLoading) {
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

  if (!update) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right"]}
        >
          <View style={styles.errorState}>
            <Text style={styles.errorText}>Update not found</Text>
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
          {/* NGO info */}
          <View style={styles.ngoRow}>
            <View style={styles.ngoLogo}>
              <Text style={styles.ngoLogoText}>
                {update.ngo.name.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={styles.ngoName}>{update.ngo.name}</Text>
              <Text style={styles.updateTime}>
                {formatRelativeTime(update.publishedAt ?? update.createdAt)}
              </Text>
            </View>
          </View>

          {/* Cover image placeholder */}
          {update.coverImageUrl && (
            <Image
              source={{ uri: update.coverImageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          )}

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {update.type.replace(/_/g, " ")}
              </Text>
            </View>
            <Text style={styles.title}>{update.title}</Text>
            {update.summary && (
              <Text style={styles.summary}>{update.summary}</Text>
            )}
            <View style={styles.divider} />
            <Text style={styles.body}>{update.body}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              👁 {update.viewsCount} views ·{" "}
              {formatDate(update.publishedAt ?? update.createdAt)}
            </Text>
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
  ngoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMd,
  },
  ngoLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.greenLt,
    alignItems: "center",
    justifyContent: "center",
  },
  ngoLogoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.green,
  },
  ngoName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.black,
  },
  updateTime: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 1,
  },
  coverImage: {
    height: 200,
    backgroundColor: COLORS.grayLt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  content: {
    padding: 20,
    backgroundColor: COLORS.white,
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.greenLt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    color: COLORS.green,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.black,
    lineHeight: 30,
    marginBottom: 10,
  },
  summary: {
    fontSize: 15,
    color: COLORS.gray,
    lineHeight: 22,
    marginBottom: 16,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.grayMd,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: COLORS.black,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    marginTop: 1,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMd,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: "center",
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
});
