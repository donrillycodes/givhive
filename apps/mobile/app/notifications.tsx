import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../lib/api";
import { COLORS, FONT, formatRelativeTime } from "../lib/utils";
import type { Notification, PaginatedResponse } from "../types";

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await notificationApi.getAll({ limit: 30 });
      return response.data.data as PaginatedResponse<Notification>;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const notifications = data?.items ?? [];
  const unreadCount = notifications.filter((n) => n.status === "UNREAD").length;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Notifications",
          headerTintColor: COLORS.primary,
          headerStyle: { backgroundColor: COLORS.background },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontSize: FONT.base,
            fontWeight: "700",
            color: COLORS.text,
          },
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity onPress={() => markAllReadMutation.mutate()}>
                <Text style={styles.markAllRead}>Mark all read</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.green} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyMessage}>
              You will be notified about your donations and pledges here
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  notification.status === "UNREAD" &&
                    styles.notificationItemUnread,
                ]}
                onPress={() => {
                  if (notification.status === "UNREAD") {
                    markReadMutation.mutate(notification.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.notificationContent}>
                  {notification.status === "UNREAD" && (
                    <View style={styles.unreadDot} />
                  )}
                  <View
                    style={[
                      styles.notificationText,
                      notification.status !== "UNREAD" && { marginLeft: 16 },
                    ]}
                  >
                    <Text style={styles.notificationTitle}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationBody}>
                      {notification.body}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatRelativeTime(notification.createdAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  markAllRead: {
    fontSize: 13,
    color: COLORS.green,
    fontWeight: "500",
    paddingHorizontal: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.black,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 20,
  },
  notificationItem: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLt,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  notificationItemUnread: {
    backgroundColor: COLORS.greenLt,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginTop: 5,
    flexShrink: 0,
  },
  notificationText: {
    flex: 1,
    gap: 3,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.black,
  },
  notificationBody: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.grayMd,
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
});
