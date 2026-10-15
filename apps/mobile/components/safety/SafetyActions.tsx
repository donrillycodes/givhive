import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { safetyApi } from '../../lib/api';
import { COLORS } from '../../lib/utils';

export const CONTENT_KEYS = new Set(['all-ngos', 'all-needs', 'featured-ngos', 'urgent-needs', 'recent-updates', 'ngo', 'ngo-needs', 'update', 'food-need']);

export function SafetyActions({ targetType, targetId, ngoId }: { targetType: 'NGO' | 'UPDATE' | 'FOOD_NEED'; targetId: string; ngoId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const block = useMutation({
    mutationFn: () => safetyApi.block(ngoId),
    onSuccess: async () => {
      // Remove cached browsing content before navigating away; old posts must not flash back.
      await client.cancelQueries({ predicate: q => CONTENT_KEYS.has(String(q.queryKey[0])) });
      client.removeQueries({ predicate: q => CONTENT_KEYS.has(String(q.queryKey[0])) });
      void client.invalidateQueries({ queryKey: ['blocked-organisations'] });
      router.replace('/(tabs)/home');
      Alert.alert('Organisation blocked', 'Their profile, food needs, and updates are hidden from your browsing. Existing pledges remain in Activity. You can unblock them from Profile.');
    },
    onError: () => Alert.alert('Could not block organisation', 'Please try again.'),
  });
  return (
    <View style={{ padding: 20, gap: 12 }}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: '/report', params: { targetType, targetId } })} style={{ paddingVertical: 12 }}>
        <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Report this {targetType === 'NGO' ? 'organisation' : targetType === 'UPDATE' ? 'update' : 'food need'}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={block.isPending} style={{ paddingVertical: 12 }} onPress={() => Alert.alert('Block this organisation?', 'Hide this organisation and its posts from your browsing. Existing pledges will not be cancelled.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Block', style: 'destructive', onPress: () => block.mutate() },
      ])}>
        <Text style={{ color: COLORS.error, fontWeight: '600' }}>{block.isPending ? 'Blocking…' : 'Block organisation'}</Text>
      </TouchableOpacity>
    </View>
  );
}
