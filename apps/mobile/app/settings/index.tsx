import { useRef, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { authApi } from "../../lib/api";
import { logOut, reauthenticateForAccountDeletion } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const deleteAccount = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const currentPassword = password;
    setPassword("");
    let accepted = false;
    try {
      await reauthenticateForAccountDeletion(currentPassword);
      const response = await authApi.deleteAccount();
      accepted = true;
      // Stop old responses from repopulating private data after deletion.
      await queryClient.cancelQueries();
      queryClient.clear();
      useAuthStore.getState().signOut();
      try { await logOut(); } catch { /* Application access is already cleared. */ }
      router.replace("/(auth)/welcome");
      Alert.alert(
        response.data.data.status === "completed" ? "Account deleted" : "Deletion is finishing",
        response.data.data.status === "completed"
          ? "Your account and sign-in have been deleted."
          : "Your GivHive account data has been removed. Sign-in cleanup normally finishes within a few minutes. We will email you when it is complete.",
      );
    } catch (failure: unknown) {
      if (accepted) {
        // A local error after acceptance must not be described as failed deletion.
        queryClient.clear();
        useAuthStore.getState().signOut();
        router.replace("/(auth)/welcome");
        return;
      }
      const issue = failure as { code?: string; response?: { data?: { message?: string } } };
      if (["auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials"].includes(issue.code ?? "")) {
        setError("That password did not match. Please enter your current password and try again.");
      } else if (issue.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a little before trying again.");
      } else if (issue.code === "auth/network-request-failed") {
        setError("Could not reach sign-in services. Check your connection and try again.");
      } else {
        setError(issue.response?.data?.message ?? "We could not confirm deletion. Check your connection and try again. If the request already finished, you may need to sign in again to check your account.");
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const confirmDeletion = () => {
    if (!password || busy || inFlight.current) return;
    Alert.alert(
      "Permanently delete your account?",
      "Your profile, food pledges, notes, preferences and notifications will be removed. Outstanding pledges will be cancelled. This cannot be undone.",
      [
        { text: "Keep account", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: () => { void deleteAccount(); } },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{
        headerShown: true, title: "Settings", headerTintColor: COLORS.primary,
        headerStyle: { backgroundColor: COLORS.background }, headerShadowVisible: false,
        headerTitleStyle: { fontSize: FONT.base, fontWeight: "700", color: COLORS.text },
      }} />
      <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Delete account</Text>
            <Text style={styles.body}>You can permanently delete your GivHive account here. This is different from signing out.</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>What will be removed</Text>
              <Text style={styles.body}>Your profile, sign-in, food pledge history, personal notes, preferences and notifications. Any outstanding pledges will be cancelled.</Text>
              <Text style={styles.cardTitle}>What may remain</Text>
              <Text style={styles.body}>Historical payment amounts, dates and payment references, if any, are kept without your GivHive account details. Copies in backups remain until those backups expire.</Text>
              <Text style={styles.body}>Deletion normally finishes immediately. If sign-in cleanup needs a retry, we temporarily keep your email for the completion notice and retry automatically, normally within a few minutes.</Text>
            </View>
            <Text style={styles.label}>Confirm your current password</Text>
            <TextInput
              style={styles.input} value={password} onChangeText={setPassword}
              placeholder="Current password" placeholderTextColor={COLORS.textHint}
              accessibilityLabel="Current password" secureTextEntry autoCapitalize="none"
              autoCorrect={false} autoComplete="current-password" textContentType="password"
              editable={!busy} onSubmitEditing={confirmDeletion}
            />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Button label="Delete my account" loadingLabel="Deleting account…" loading={busy}
              disabled={!password || busy} onPress={confirmDeletion} style={styles.deleteButton} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  content: { padding: SPACE.xl, gap: SPACE.lg },
  heading: { fontSize: FONT.xl, fontWeight: "700", color: COLORS.text },
  body: { fontSize: FONT.sm, lineHeight: 21, color: COLORS.textSub },
  card: { padding: SPACE.lg, gap: SPACE.md, borderRadius: RADII.lg, backgroundColor: COLORS.surface },
  cardTitle: { fontSize: FONT.base, fontWeight: "700", color: COLORS.text },
  label: { fontSize: FONT.sm, fontWeight: "600", color: COLORS.text },
  input: { padding: SPACE.lg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADII.lg,
    backgroundColor: COLORS.surface, color: COLORS.text, fontSize: FONT.base },
  error: { color: COLORS.error, fontSize: FONT.sm, lineHeight: 21 },
  deleteButton: { backgroundColor: COLORS.error },
});
