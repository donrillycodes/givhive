import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { COLORS, FONT } from "../../lib/utils";

export default function SupportScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Help & Support",
          headerTintColor: COLORS.primary,
          headerStyle: { backgroundColor: COLORS.background },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontSize: FONT.base,
            fontWeight: "700",
            color: COLORS.text,
          },
        }}
      />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>❓</Text>
          <Text style={styles.message}>Support centre coming soon</Text>
          <Text style={styles.sub}>For urgent issues email hello@givhive.ca</Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emoji: { fontSize: 48 },
  message: { fontSize: 16, color: COLORS.gray, fontWeight: "600" },
  sub: { fontSize: 13, color: COLORS.gray, textAlign: "center" },
});
