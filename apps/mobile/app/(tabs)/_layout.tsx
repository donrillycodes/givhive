import { Tabs } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface TabMeta {
  icon: IoniconName;
  iconFocused: IoniconName;
  label: string;
}

// Keyed by route name so we don't rely on React Navigation's built-in
// icon/label layout (which is what clipped our labels before).
const TAB_META: Record<string, TabMeta> = {
  home: { icon: "home-outline", iconFocused: "home", label: "Home" },
  discover: { icon: "search-outline", iconFocused: "search", label: "Search" },
  activity: {
    icon: "receipt-outline",
    iconFocused: "receipt",
    label: "Activity",
  },
  profile: { icon: "person-outline", iconFocused: "person", label: "Account" },
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + SPACE.md }]}
    >
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name] ?? {
            icon: "ellipse-outline" as IoniconName,
            iconFocused: "ellipse" as IoniconName,
            label: route.name,
          };
          const focused = state.index === index;
          const color = focused ? COLORS.primary : COLORS.textSub;
          const { options } = descriptors[route.key];

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              activeOpacity={0.75}
              style={styles.tabItem}
            >
              <Ionicons
                name={focused ? meta.iconFocused : meta.icon}
                size={22}
                color={color}
              />
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Outer wrap just positions the pill; box-none so touches pass through
  // the empty margin on either side of it.
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    // No alignItems override — default "stretch" lets tabBar's
    // marginHorizontal below carve out equal side gaps reliably.
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACE.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.full,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.xs,
    // Floating shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    // Floating shadow (Android)
    elevation: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: SPACE.xs,
  },
  tabLabel: {
    fontSize: FONT.xs,
    fontWeight: "500",
  },
});
