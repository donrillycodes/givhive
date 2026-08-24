import React, { createContext, useContext, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  useSharedValue,
  useAnimatedScrollHandler,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";

/**
 * Drives the floating tab bar's "shrink on scroll down / expand on scroll
 * up" animation. A single shared value lives here (created once by the
 * provider in app/(tabs)/_layout.tsx) and every tab screen's scroll view
 * reports into it via useTabBarScrollHandler().
 *
 * progress: 0 = fully expanded, 1 = fully collapsed (shrunk).
 */

const TabBarCollapseContext = createContext<SharedValue<number> | null>(null);

export function TabBarCollapseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const progress = useSharedValue(0);
  return (
    <TabBarCollapseContext.Provider value={progress}>
      {children}
    </TabBarCollapseContext.Provider>
  );
}

export function useTabBarCollapseProgress(): SharedValue<number> {
  const ctx = useContext(TabBarCollapseContext);
  if (!ctx) {
    throw new Error(
      "useTabBarCollapseProgress must be used within a TabBarCollapseProvider",
    );
  }
  return ctx;
}

const TIMING = { duration: 220, easing: Easing.out(Easing.cubic) };
// Always fully expanded within this many px of the top.
const TOP_SNAP = 24;
// Ignore tiny scroll jitter smaller than this before flipping state.
const DIRECTION_THRESHOLD = 6;

/** Attach the returned handler to a tab screen's Animated.ScrollView. */
export function useTabBarScrollHandler() {
  const progress = useTabBarCollapseProgress();
  const lastY = useSharedValue(0);

  // Reset to expanded whenever this screen gains focus, so switching tabs
  // never lands on a shrunk bar from wherever the last tab left off.
  useFocusEffect(
    useCallback(() => {
      progress.value = withTiming(0, TIMING);
      lastY.value = 0;
    }, [progress, lastY]),
  );

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      const y = event.contentOffset.y;
      const dy = y - lastY.value;

      if (y <= TOP_SNAP) {
        progress.value = withTiming(0, TIMING);
      } else if (dy > DIRECTION_THRESHOLD) {
        progress.value = withTiming(1, TIMING);
      } else if (dy < -DIRECTION_THRESHOLD) {
        progress.value = withTiming(0, TIMING);
      }
      lastY.value = y;
    },
  });
}
