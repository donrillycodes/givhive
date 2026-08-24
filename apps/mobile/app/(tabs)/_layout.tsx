import { Tabs } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";
import {
  TabBarCollapseProvider,
  useTabBarCollapseProgress,
} from "../../lib/tabBarScroll";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface TabMeta {
  icon: IoniconName;
  iconFocused: IoniconName;
  label: string;
}

// Keyed by route name so we don't rely on React Navigation's built-in
// icon/label layout.
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

// Glass look per color scheme — kept local to the tab bar rather than the
// shared design tokens, since only this component needs it.
const GLASS = {
  light: {
    tint: "light" as const,
    overlay: "rgba(255,255,255,0.55)",
    border: "rgba(255,255,255,0.8)",
    inactive: COLORS.textSub,
    active: COLORS.primary,
    bubble: "rgba(20,20,20,0.07)",
    shadow: "#000",
  },
  dark: {
    tint: "dark" as const,
    overlay: "rgba(18,18,20,0.45)",
    border: "rgba(255,255,255,0.1)",
    inactive: "rgba(255,255,255,0.6)",
    active: "#4CB980",
    bubble: "rgba(255,255,255,0.16)",
    shadow: "#000",
  },
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? GLASS.dark : GLASS.light;
  const progress = useTabBarCollapseProgress();

  const animatedBarStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      progress.value,
      [0, 1],
      [1, 0.84],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [0, 8],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      progress.value,
      [0, 1],
      [1, 0.92],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + SPACE.md }]}
    >
      {/* Shadow lives on this outer, non-clipped view — elevation shadows
          on Android get clipped away by a sibling overflow:hidden. */}
      <Animated.View style={[styles.shadowWrap, animatedBarStyle]}>
        <View style={[styles.tabBar, { borderColor: theme.border }]}>
          <BlurView
            intensity={scheme === "dark" ? 45 : 65}
            tint={theme.tint}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: theme.overlay },
            ]}
          />

          {state.routes.map((route, index) => {
            const meta = TAB_META[route.name] ?? {
              icon: "ellipse-outline" as IoniconName,
              iconFocused: "ellipse" as IoniconName,
              label: route.name,
            };
            const focused = state.index === index;
            const color = focused ? theme.active : theme.inactive;
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
                <View style={styles.iconWrap}>
                  {focused && (
                    <Animated.View
                      entering={ZoomIn.duration(160)}
                      exiting={ZoomOut.duration(120)}
                      style={[
                        styles.bubble,
                        {
                          backgroundColor: theme.bubble,
                          shadowColor: theme.shadow,
                        },
                      ]}
                    />
                  )}
                  <Ionicons
                    name={focused ? meta.iconFocused : meta.icon}
                    size={22}
                    color={color}
                  />
                </View>
                <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <TabBarCollapseProvider>
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
    </TabBarCollapseProvider>
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
  // Carries the shadow + the shrink/scale animation. Must NOT clip
  // (overflow hidden) or Android's elevation shadow disappears.
  shadowWrap: {
    marginHorizontal: SPACE.xl,
    borderRadius: RADII.full,
    // Floating shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    // Floating shadow (Android)
    elevation: 14,
  },
  // Clips the blur + overlay to the pill shape.
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADII.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.xs,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: SPACE.xs,
  },
  iconWrap: {
    width: 40,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    position: "absolute",
    width: 40,
    height: 34,
    borderRadius: RADII.full,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    fontSize: FONT.xs,
    fontWeight: "500",
  },
});
