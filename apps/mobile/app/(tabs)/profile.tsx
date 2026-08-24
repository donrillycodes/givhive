import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { COLORS, FONT, SPACE, RADII, getInitials } from "../../lib/utils";
import { useNavigationStore } from "../../store/authStore";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface MenuItem {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { setActivityTab } = useNavigationStore();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    {
      icon: "heart-outline",
      label: "My Donations",
      onPress: () => {
        setActivityTab("donations");
        router.push("/(tabs)/activity");
      },
    },
    {
      icon: "cube-outline",
      label: "My Pledges",
      onPress: () => {
        setActivityTab("pledges");
        router.push("/(tabs)/activity");
      },
    },
    {
      icon: "notifications-outline",
      label: "Notifications",
      onPress: () => router.push("/notifications"),
    },
    {
      icon: "settings-outline",
      label: "Settings",
      onPress: () => router.push("/settings" as any),
    },
    {
      icon: "help-circle-outline",
      label: "Help & Support",
      onPress: () => router.push("/support" as any),
    },
    {
      icon: "document-text-outline",
      label: "Privacy Policy",
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user ? getInitials(user.firstName, user.lastName) : "U"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.role === "NGO" ? "NGO" : "Donor"}
              </Text>
            </View>
          </View>
          <TouchableOpacity>
            <Ionicons name="create-outline" size={20} color={COLORS.textSub} />
          </TouchableOpacity>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.menuItem,
                i < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name={item.icon} size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.textHint}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>GivHive v1.0.0</Text>
        <View style={styles.bottomPad} />
      </ScrollView>
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
    paddingBottom: SPACE.sm,
  },
  title: {
    fontSize: FONT["2xl"],
    fontWeight: "800",
    color: COLORS.text,
  },

  // User card
  userCard: {
    marginHorizontal: SPACE.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    padding: SPACE.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACE["2xl"],
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: RADII.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: FONT.xl,
    fontWeight: "800",
    color: COLORS.primary,
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: FONT.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  userEmail: {
    fontSize: FONT.sm,
    color: COLORS.textSub,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACE.md,
    paddingVertical: 3,
    borderRadius: RADII.full,
    marginTop: 2,
  },
  roleBadgeText: {
    fontSize: FONT.xs,
    color: COLORS.primary,
    fontWeight: "700",
  },

  // Menu
  menu: {
    marginHorizontal: SPACE.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: SPACE.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemLabel: {
    fontSize: FONT.base,
    color: COLORS.text,
    fontWeight: "500",
  },

  // Sign out
  signOutBtn: {
    marginHorizontal: SPACE.xl,
    backgroundColor: COLORS.errorLight,
    borderRadius: RADII.lg,
    paddingVertical: SPACE.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACE.sm,
  },
  signOutText: {
    fontSize: FONT.base,
    fontWeight: "700",
    color: COLORS.error,
  },
  version: {
    textAlign: "center",
    fontSize: FONT.xs,
    color: COLORS.textHint,
    marginTop: SPACE.lg,
  },
  bottomPad: {
    // Clears the floating tab bar (height + its bottom offset + safe area)
    height: 120,
  },
});
