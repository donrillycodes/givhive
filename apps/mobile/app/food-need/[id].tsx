import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { foodNeedApi } from "../../lib/api";
import {
  COLORS,
  FONT,
  formatDate,
  getProgress,
  formatCategory,
} from "../../lib/utils";
import { Badge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Button } from "../../components/ui/Button";
import type { FoodNeed } from "../../types";

export default function FoodNeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [dropOffDate, setDropOffDate] = useState("");
  const [showPledgeForm, setShowPledgeForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: need, isLoading } = useQuery({
    queryKey: ["food-need", id],
    queryFn: async () => {
      const response = await foodNeedApi.getOne(id);
      return response.data.data.foodNeed as FoodNeed;
    },
  });

  const headerOptions = {
    headerShown: true,
    title: need?.title ?? "Food Need",
    headerTintColor: COLORS.primary,
    headerStyle: { backgroundColor: COLORS.background },
    headerShadowVisible: false,
    headerTitleStyle: {
      fontSize: FONT.base,
      fontWeight: "700" as const,
      color: COLORS.text,
    },
  };

  const pledgeMutation = useMutation({
    mutationFn: () =>
      foodNeedApi.pledge({
        foodNeedId: id,
        quantityPledged: parseInt(quantity),
        notes: notes || undefined,
        dropOffDate: dropOffDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-need", id] });
      queryClient.invalidateQueries({ queryKey: ["my-pledges"] });
      setShowPledgeForm(false);
      setQuantity("");
      setNotes("");
      setDropOffDate("");
      Alert.alert(
        "Pledge submitted! 🎉",
        "Thank you for your pledge. The NGO will confirm your drop off details.",
        [{ text: "OK" }],
      );
    },
    onError: () => {
      Alert.alert("Failed", "Could not submit pledge. Please try again.");
    },
  });

  const handlePledge = () => {
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert("Invalid quantity", "Please enter a valid quantity.");
      return;
    }
    pledgeMutation.mutate();
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

  if (!need) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right"]}
        >
          <View style={styles.errorState}>
            <Text style={styles.errorText}>Food need not found</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backLink}>Go back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const progress = getProgress(need.quantityFulfilled, need.quantityRequired);
  const remaining = need.quantityRequired - need.quantityFulfilled;

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>📦</Text>
              </View>

              <View style={styles.badges}>
                {need.isUrgent && (
                  <Badge label="🚨 URGENT" bg="#FEE2E2" color={COLORS.red} />
                )}
                <Badge
                  label={formatCategory(need.itemCategory)}
                  bg={COLORS.greenLt}
                  color={COLORS.green}
                  textStyle={{ fontWeight: "600" }}
                />
              </View>

              <Text style={styles.title}>{need.title}</Text>
              <Text style={styles.ngoName}>{need.ngo.name}</Text>
            </View>

            {/* Progress */}
            <View style={styles.section}>
              <View style={styles.progressHeader}>
                <Text style={styles.sectionTitle}>Progress</Text>
                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>
              <ProgressBar
                percent={progress}
                height={8}
                style={styles.progressBarSpacing}
              />
              <View style={styles.progressStats}>
                <Text style={styles.progressStat}>
                  <Text style={styles.progressStatBold}>
                    {need.quantityFulfilled}
                  </Text>{" "}
                  {need.unit} pledged
                </Text>
                <Text style={styles.progressStat}>
                  <Text style={styles.progressStatBold}>{remaining}</Text>{" "}
                  {need.unit} remaining
                </Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Item</Text>
                <Text style={styles.detailValue}>{need.itemName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity needed</Text>
                <Text style={styles.detailValue}>
                  {need.quantityRequired} {need.unit}
                </Text>
              </View>
              {need.deadline && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Deadline</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(need.deadline)}
                  </Text>
                </View>
              )}
              {need.dropOffAddress && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Drop off</Text>
                  <Text style={styles.detailValue}>{need.dropOffAddress}</Text>
                </View>
              )}
              {need.dropOffInstructions && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Instructions</Text>
                  <Text style={styles.detailValue}>
                    {need.dropOffInstructions}
                  </Text>
                </View>
              )}
              {need.description && (
                <View
                  style={[
                    styles.detailRow,
                    { flexDirection: "column", gap: 4 },
                  ]}
                >
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{need.description}</Text>
                </View>
              )}
            </View>

            {/* Pledge form */}
            {need.status === "OPEN" && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Make a Pledge</Text>

                {!showPledgeForm ? (
                  <Button
                    label="📦 Pledge Food Items"
                    onPress={() => setShowPledgeForm(true)}
                  />
                ) : (
                  <View style={styles.pledgeForm}>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>
                        Quantity ({need.unit}){" "}
                        <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={quantity}
                        onChangeText={setQuantity}
                        placeholder={`Max ${remaining} ${need.unit}`}
                        placeholderTextColor={COLORS.grayMd}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>
                        Planned drop off date
                      </Text>
                      <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text
                          style={{
                            color: dropOffDate ? COLORS.black : COLORS.grayMd,
                            fontSize: 14,
                          }}
                        >
                          {dropOffDate || "Select a date"}
                        </Text>
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={
                            dropOffDate ? new Date(dropOffDate) : new Date()
                          }
                          mode="date"
                          minimumDate={new Date()}
                          onChange={(event, date) => {
                            setShowDatePicker(false);
                            if (date) {
                              setDropOffDate(date.toISOString().split("T")[0]);
                            }
                          }}
                        />
                      )}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Notes (optional)</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Any notes for the NGO..."
                        placeholderTextColor={COLORS.grayMd}
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    <View style={styles.formButtons}>
                      <Button
                        label="Submit Pledge"
                        loadingLabel="Submitting..."
                        loading={pledgeMutation.isPending}
                        onPress={handlePledge}
                        style={styles.flexButton}
                      />
                      <Button
                        label="Cancel"
                        variant="secondary"
                        onPress={() => setShowPledgeForm(false)}
                        style={styles.flexButton}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {need.status !== "OPEN" && (
              <View style={styles.closedBanner}>
                <Text style={styles.closedText}>
                  This food need is {need.status.toLowerCase()} and no longer
                  accepting pledges.
                </Text>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hero: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMd,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.black,
    textAlign: "center",
    marginBottom: 6,
  },
  ngoName: {
    fontSize: 14,
    color: COLORS.gray,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayMd,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.green,
  },
  progressBarSpacing: {
    marginBottom: 10,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressStat: {
    fontSize: 13,
    color: COLORS.gray,
  },
  progressStatBold: {
    fontWeight: "700",
    color: COLORS.black,
  },
  detailRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLt,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.gray,
    width: 110,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.black,
    flex: 1,
  },
  pledgeForm: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.gray,
  },
  required: {
    color: COLORS.red,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.grayMd,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.black,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  formButtons: {
    flexDirection: "row",
    gap: 10,
  },
  flexButton: {
    flex: 1,
  },
  closedBanner: {
    marginHorizontal: 16,
    backgroundColor: COLORS.grayLt,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  closedText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: "center",
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  backLink: {
    fontSize: 15,
    color: COLORS.green,
    fontWeight: "500",
  },
  bottomPadding: {
    height: 40,
  },
});
