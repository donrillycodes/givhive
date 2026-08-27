import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";
import { signIn, sendPasswordReset } from "../../lib/firebase";
import { authApi } from "../../lib/api";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import type { User } from "../../types";

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1 — Firebase sign in
      const firebaseUser = await signIn(email.trim().toLowerCase(), password);

      // Step 2 — Get JWT token
      const token = await firebaseUser.getIdToken();
      setToken(token);

      // Step 3 — Fetch user profile
      const response = await authApi.getMe();
      const user: User = response.data.data.user;

      // Step 4 — Block NGO and Admin users
      if (user.role !== "DONOR") {
        router.replace("/(auth)/wrong-role");
        return;
      }

      setUser(user);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      const code = err?.code ?? "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (code === "auth/user-disabled") {
        setError("Your account has been disabled. Please contact support.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        "Enter your email",
        "Please enter your email address first then tap Forgot Password.",
      );
      return;
    }
    try {
      await sendPasswordReset(email.trim().toLowerCase());
      Alert.alert(
        "Email sent ✉️",
        "Check your inbox for a password reset link.",
        [{ text: "OK" }],
      );
    } catch (err) {
      Alert.alert(
        "Failed",
        "Could not send reset email. Please check your email address.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          {router.canGoBack() && (
            <TouchableOpacity
              style={styles.back}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
          )}

          {/* Logo mark */}
          <View style={styles.logoWrap}>
            <View style={styles.logoMark}>
              <Ionicons name="leaf" size={22} color={COLORS.primary} />
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headingBlock}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>
              Sign in to your GivHive account
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email address"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              icon="lock-closed-outline"
              secureToggle
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              labelRight={
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              }
            />

            <ErrorBanner message={error} />

            <Button
              label="Sign in"
              loadingLabel="Signing in..."
              loading={loading}
              onPress={handleLogin}
              icon="arrow-forward"
              style={styles.submitBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.footerCta}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACE.xl,
    paddingBottom: SPACE["3xl"],
  },
  back: {
    marginTop: SPACE.lg,
    width: 40,
    height: 40,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    marginTop: SPACE["3xl"],
    marginBottom: SPACE["2xl"],
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headingBlock: {
    gap: SPACE.sm,
    marginBottom: SPACE["3xl"],
  },
  heading: {
    fontSize: FONT["3xl"],
    fontWeight: "800",
    color: COLORS.text,
  },
  subheading: {
    fontSize: FONT.base,
    color: COLORS.textSub,
    lineHeight: 22,
  },
  form: {
    gap: SPACE.xl,
    marginBottom: SPACE["3xl"],
  },
  forgotText: {
    fontSize: FONT.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  submitBtn: {
    marginTop: SPACE.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontSize: FONT.md,
    color: COLORS.textSub,
  },
  footerCta: {
    fontSize: FONT.md,
    color: COLORS.primary,
    fontWeight: "700",
  },
});
