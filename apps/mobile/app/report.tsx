import { useState } from 'react';
import { Alert, Text, TextInput, ScrollView, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { safetyApi } from '../lib/api';
import { COLORS } from '../lib/utils';
import { Button } from '../components/ui/Button';

const REASONS = [
  ['HARASSMENT', 'Harassment or threats'], ['HATE_OR_SEXUAL_CONTENT', 'Hateful or sexual content'],
  ['FRAUD_OR_SPAM', 'Fraud, impersonation, or spam'], ['UNSAFE_FOOD', 'Unsafe food or donation request'],
  ['PRIVACY', 'Personal information shared without permission'], ['OTHER', 'Something else'],
] as const;
export default function ReportScreen() {
  const { targetType, targetId } = useLocalSearchParams<{ targetType: string; targetId: string }>();
  const router = useRouter();
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const validTarget = ['NGO', 'UPDATE', 'FOOD_NEED'].includes(targetType) && typeof targetId === 'string';
  const send = useMutation({
    mutationFn: () => safetyApi.report({ targetType, targetId, reason, details: details.trim() }),
    onSuccess: () => Alert.alert('Report received', 'Thank you. GivHive will review your report. Your identity is not shown to the organisation. You can also block the organisation from its page.', [{ text: 'Done', onPress: () => router.back() }]),
    onError: () => Alert.alert('Could not send report', 'Please try again. If the problem continues, email support@givhive.com with the content reference.'),
  });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: true, title: 'Report a concern', headerTintColor: COLORS.primary }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text }}>What is the concern?</Text>
        <Text style={{ color: COLORS.textSub }}>Reports go privately to GivHive for review. Please include only the information needed to investigate.</Text>
        {!validTarget && <Text style={{ color: COLORS.error }}>This content reference is invalid. Please return to the content and try again.</Text>}
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {REASONS.map(([value, label]) => (
            <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: reason === value }} disabled={send.isPending} onPress={() => setReason(value)} style={{ padding: 14, borderWidth: 1, borderRadius: 10, borderColor: reason === value ? COLORS.primary : COLORS.border }}>
              <Text style={{ color: COLORS.text }}>{reason === value ? '● ' : '○ '}{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput accessibilityLabel="Report details" placeholder="Describe what happened (5–1000 characters)" value={details} onChangeText={setDetails} multiline maxLength={1000} editable={!send.isPending} textAlignVertical="top" style={{ minHeight: 130, padding: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, color: COLORS.text, backgroundColor: COLORS.surface }} />
        <Button label="Send report" loading={send.isPending} disabled={!validTarget || !reason || details.trim().length < 5 || send.isSuccess} onPress={() => send.mutate()} />
      </ScrollView>
    </SafeAreaView>
  );
}
