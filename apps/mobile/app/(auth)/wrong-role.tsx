import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { logOut } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";
import { COLORS } from "../../lib/utils";

export default function WrongRoleScreen() {
  const router = useRouter();
  const { signOut } = useAuthStore();

  const handleSignOut = async () => {
    await logOut();
    signOut();
    router.replace("/(auth)/welcome");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Wrong app</Text>
        <Text style={styles.message}>
          This app is for donors only. NGO managers and admins should use the
          GivHive web dashboard at dashboard.givhive.ca
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.black,
  },
  message: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
