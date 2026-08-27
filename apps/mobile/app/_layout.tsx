import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useNavigationStore } from "../store/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  // Whichever tab was last focused — used so a screen pushed on top of the
  // tab navigator (e.g. a food need opened from Home) shows that tab's name
  // as its native back-button label instead of a generic one.
  const activeTabTitle = useNavigationStore((s) => s.activeTabTitle);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" options={{ title: activeTabTitle }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
