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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";
import { authApi } from "../../lib/api";
import { signIn } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import type { User } from "../../types";

type Role = "DONOR" | "NGO";

const ORG_TYPES = [
  { value: "REGISTERED_CHARITY", label: "Registered Charity" },
  { value: "NON_PROFIT", label: "Non-Profit" },
  { value: "COMMUNITY_GROUP", label: "Community Group" },
  { value: "SOCIAL_ENTERPRISE", label: "Social Enterprise" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [role, setRole] = useState<Role>("DONOR");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [craNumber, setCraNumber] = useState("");
  const [orgType, setOrgType] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactTitle, setPrimaryContactTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    try {
      setLoading(true);
      await authApi.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        ...(role === "NGO" && {
          craNumber: craNumber.trim() || undefined,
          orgType: orgType || undefined,
          primaryContactName: primaryContactName.trim() || undefined,
          primaryContactTitle: primaryContactTitle.trim() || undefined,
        }),
      });

      const firebaseUser = await signIn(email.trim().toLowerCase(), password);
      const token = await firebaseUser.getIdToken();
      setToken(token);
      const response = await authApi.getMe();
      const user: User = response.data.data.user;
      setUser(user);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "";
      if (message.includes("already exists")) {
        setError("An account with this email already exists. Sign in instead.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
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
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.subheading}>
              Join GivHive and start making a difference
            </Text>
          </View>

          {/* Role selector */}
          <View style={styles.roleSection}>
            <Text style={styles.label}>I am joining as</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  role === "DONOR" && styles.roleCardActive,
                ]}
                onPress={() => setRole("DONOR")}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.roleIcon,
                    role === "DONOR" && styles.roleIconActive,
                  ]}
                >
                  <Ionicons
                    name="heart-outline"
                    size={20}
                    color={role === "DONOR" ? COLORS.surface : COLORS.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.roleLabel,
                    role === "DONOR" && styles.roleLabelActive,
                  ]}
                >
                  Donor
                </Text>
                <Text
                  style={[
                    styles.roleDesc,
                    role === "DONOR" && styles.roleDescActive,
                  ]}
                >
                  Give food or cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleCard,
                  role === "NGO" && styles.roleCardActive,
                ]}
                onPress={() => setRole("NGO")}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.roleIcon,
                    role === "NGO" && styles.roleIconActive,
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={role === "NGO" ? COLORS.surface : COLORS.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.roleLabel,
                    role === "NGO" && styles.roleLabelActive,
                  ]}
                >
                  Charity
                </Text>
                <Text
                  style={[
                    styles.roleDesc,
                    role === "NGO" && styles.roleDescActive,
                  ]}
                >
                  Receive donations
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name row */}
            <View style={styles.nameRow}>
              <Input
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                autoCapitalize="words"
                containerStyle={styles.nameField}
              />
              <Input
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                autoCapitalize="words"
                containerStyle={styles.nameField}
              />
            </View>

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
              placeholder="At least 6 characters"
            />

            <Input
              label="Confirm password"
              icon="lock-closed-outline"
              secureToggle
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
            />

            {/* NGO verification fields — only shown when NGO role selected */}
            {role === "NGO" && (
              <>
                <Input
                  label="CRA Charity Number"
                  icon="document-text-outline"
                  value={craNumber}
                  onChangeText={setCraNumber}
                  placeholder="e.g. 123456789 RR 0001"
                  autoCapitalize="none"
                />

                <Input
                  label="Primary Contact Name"
                  icon="person-outline"
                  value={primaryContactName}
                  onChangeText={setPrimaryContactName}
                  placeholder="Full name"
                  autoCapitalize="words"
                />

                <Input
                  label="Contact Title"
                  icon="briefcase-outline"
                  value={primaryContactTitle}
                  onChangeText={setPrimaryContactTitle}
                  placeholder="e.g. Executive Director"
                  autoCapitalize="words"
                />

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Organisation Type</Text>
                  <View style={styles.orgTypeRow}>
                    {ORG_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.orgTypeChip,
                          orgType === type.value && styles.orgTypeChipActive,
                        ]}
                        onPress={() => setOrgType(type.value)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.orgTypeChipText,
                            orgType === type.value &&
                              styles.orgTypeChipTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            <ErrorBanner message={error} />

            <Button
              label="Create account"
              loadingLabel="Creating account..."
              loading={loading}
              onPress={handleRegister}
              icon="arrow-forward"
              style={styles.submitBtn}
            />

            {/* Terms */}
            <Text style={styles.terms}>
              By creating an account you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.footerCta}>Sign in</Text>
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
    marginBottom: SPACE["2xl"],
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
  roleSection: {
    gap: SPACE.md,
    marginBottom: SPACE["2xl"],
  },
  roleRow: {
    flexDirection: "row",
    gap: SPACE.md,
  },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACE.md,
    gap: SPACE.sm,
    alignItems: "flex-start",
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconActive: {
    backgroundColor: COLORS.primary,
  },
  roleLabel: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  roleLabelActive: {
    color: COLORS.primary,
  },
  roleDesc: {
    fontSize: FONT.xs,
    color: COLORS.textSub,
  },
  roleDescActive: {
    color: COLORS.primary,
  },
  form: {
    gap: SPACE.xl,
    marginBottom: SPACE["2xl"],
  },
  nameRow: {
    flexDirection: "row",
    gap: SPACE.md,
  },
  nameField: {
    flex: 1,
  },
  fieldGroup: {
    gap: SPACE.sm,
  },
  label: {
    fontSize: FONT.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  submitBtn: {
    marginTop: SPACE.sm,
  },
  terms: {
    fontSize: FONT.xs,
    color: COLORS.textSub,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: "600",
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
  orgTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.sm,
  },
  orgTypeChip: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADII.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  orgTypeChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  orgTypeChipText: {
    fontSize: FONT.sm,
    color: COLORS.textSub,
    fontWeight: "500",
  },
  orgTypeChipTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
