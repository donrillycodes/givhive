import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { SUPPORT_EMAIL, openSupportEmail } from "../../lib/legal";
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
          <Text style={styles.message}>How can we help?</Text>
          <Text style={styles.sub}>
            For account help, pledge questions, or privacy requests, email GivHive.
          </Text>
          <TouchableOpacity
            onPress={openSupportEmail}
            accessibilityRole="link"
            accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
            style={styles.emailLink}
          >
            <Text style={styles.emailText}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
          <Text style={styles.sub}>
            Include a brief description of the issue. Please do not send your password or payment details.
          </Text>
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
  emailLink: { paddingVertical: 12, paddingHorizontal: 16 },
  emailText: { fontSize: 16, color: COLORS.primary, fontWeight: "600" },
  emoji: { fontSize: 48 },
  message: { fontSize: 16, color: COLORS.gray, fontWeight: "600" },
  sub: { fontSize: 13, color: COLORS.gray, textAlign: "center" },
});
