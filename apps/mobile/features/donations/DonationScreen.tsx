import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ngoApi, donationApi } from "../../lib/api";
import { COLORS, FONT, SHADOW } from "../../lib/utils";
import type { NGO } from "../../types";
import * as WebBrowser from "expo-web-browser";

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

export default function DonateScreen() {
  const { ngoId } = useLocalSearchParams<{ ngoId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const { data: ngo, isLoading } = useQuery({
    queryKey: ["ngo-by-id", ngoId],
    queryFn: async () => {
      const response = await ngoApi.getOne(ngoId);
      return response.data.data.ngo as NGO;
    },
  });

  const donateMutation = useMutation({
    mutationFn: async () => {
      const res = await donationApi.checkout({
        ngoId,
        amount: parseFloat(customAmount || amount),
        currency: "CAD",
        message: message || undefined,
        isAnonymous,
      });
      return res.data.data as {
        donation: { id: string };
        checkoutUrl: string;
      };
    },
    onSuccess: async (data) => {
      // Open Stripe's hosted checkout page in an in-app browser
      await WebBrowser.openBrowserAsync(data.checkoutUrl);

      // The browser has closed — refresh the donation history
      queryClient.invalidateQueries({ queryKey: ["my-donations"] });

      Alert.alert(
        "Donation submitted",
        `Thank you for supporting ${ngo?.name}. Your donation will appear in your activity once payment is confirmed.`,
        [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ],
      );
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        "Could not start the donation. Please try again.";
      Alert.alert("Payment Failed", msg);
    },
  });

  const handlePresetSelect = (preset: number) => {
    setSelectedPreset(preset);
    setAmount(preset.toString());
    setCustomAmount("");
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setSelectedPreset(null);
    setAmount(value);
  };

  const handleDonate = () => {
    const finalAmount = parseFloat(customAmount || amount);
    if (!finalAmount || finalAmount <= 0) {
      Alert.alert(
        "Invalid amount",
        "Please select or enter a donation amount.",
      );
      return;
    }
    if (finalAmount < 1) {
      Alert.alert("Minimum donation", "Minimum donation amount is $1.00.");
      return;
    }

    Alert.alert(
      "Confirm Donation",
      `Donate $${finalAmount.toFixed(2)} CAD to ${ngo?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => donateMutation.mutate(),
        },
      ],
    );
  };

  const headerOptions = {
    headerShown: true,
    title: ngo?.name ?? "Donate",
    headerTintColor: COLORS.primary,
    headerStyle: { backgroundColor: COLORS.background },
    headerShadowVisible: false,
    headerTitleStyle: {
      fontSize: FONT.base,
      fontWeight: "700" as const,
      color: COLORS.text,
    },
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right"]}
        >
          <ActivityIndicator color={COLORS.green} style={{ marginTop: 40 }} />
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* NGO info */}
        {ngo && (
          <View style={styles.ngoCard}>
            <View style={styles.ngoLogo}>
              <Text style={styles.ngoLogoText}>{ngo.name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.ngoName}>{ngo.name}</Text>
              <Text style={styles.ngoCity}>
                {ngo.city}, {ngo.province}
              </Text>
            </View>
          </View>
        )}

        {/* Amount selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Amount (CAD)</Text>

          <View style={styles.presetGrid}>
            {PRESET_AMOUNTS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetButton,
                  selectedPreset === preset && styles.presetButtonActive,
                ]}
                onPress={() => handlePresetSelect(preset)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    selectedPreset === preset && styles.presetButtonTextActive,
                  ]}
                >
                  ${preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customAmountContainer}>
            <Text style={styles.customAmountPrefix}>$</Text>
            <TextInput
              style={styles.customAmountInput}
              value={customAmount}
              onChangeText={handleCustomAmount}
              placeholder="Custom amount"
              placeholderTextColor={COLORS.grayMd}
              keyboardType="decimal-pad"
            />
            <Text style={styles.customAmountSuffix}>CAD</Text>
          </View>
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add a Message (optional)</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Leave an encouraging message for the NGO..."
            placeholderTextColor={COLORS.grayMd}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Anonymous toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.anonymousRow}
            onPress={() => setIsAnonymous(!isAnonymous)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.anonymousLabel}>Donate anonymously</Text>
              <Text style={styles.anonymousSubtitle}>
                Your name will not be shown to the NGO
              </Text>
            </View>
            <View style={[styles.toggle, isAnonymous && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleKnob,
                  isAnonymous && styles.toggleKnobActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Security note */}
        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            🔒 Payments are processed securely via Stripe. Your card details are
            never stored on our servers.
          </Text>
        </View>

        {/* Donate button */}
        <TouchableOpacity
          style={[
            styles.donateButton,
            (!amount || donateMutation.isPending) &&
              styles.donateButtonDisabled,
          ]}
          onPress={handleDonate}
          disabled={!amount || donateMutation.isPending}
          activeOpacity={0.8}
        >
          {donateMutation.isPending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.donateButtonText}>
              {amount
                ? `Donate $${parseFloat(amount).toFixed(2)} CAD`
                : "Select an amount"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  ngoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    ...SHADOW.card,
  },
  ngoLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.greenLt,
    alignItems: "center",
    justifyContent: "center",
  },
  ngoLogoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.green,
  },
  ngoName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.black,
  },
  ngoCity: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    ...SHADOW.card,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  presetButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.grayMd,
    backgroundColor: COLORS.white,
    minWidth: 70,
    alignItems: "center",
  },
  presetButtonActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLt,
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray,
  },
  presetButtonTextActive: {
    color: COLORS.green,
  },
  customAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.grayMd,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  customAmountPrefix: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.gray,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 18,
    color: COLORS.black,
    paddingVertical: 14,
  },
  customAmountSuffix: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: "500",
  },
  messageInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.grayMd,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.black,
    height: 90,
    textAlignVertical: "top",
  },
  anonymousRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  anonymousLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.black,
  },
  anonymousSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.grayMd,
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: COLORS.green,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  securityNote: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: COLORS.greenLt,
    borderRadius: 12,
  },
  securityText: {
    fontSize: 12,
    color: COLORS.green,
    textAlign: "center",
    lineHeight: 18,
  },
  donateButton: {
    backgroundColor: COLORS.green,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  donateButtonDisabled: {
    opacity: 0.5,
  },
  donateButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
  },
  bottomPadding: {
    height: 40,
  },
});
