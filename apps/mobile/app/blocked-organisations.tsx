import { Alert, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { safetyApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { CONTENT_KEYS } from '../components/safety/SafetyActions';

export default function BlockedOrganisations() {
  const userId = useAuthStore(s => s.user?.id);
  const client = useQueryClient();
  const list = useQuery({ queryKey: ['blocked-organisations', userId], queryFn: async () => (await safetyApi.blocks()).data.data.items, enabled: !!userId });
  const unblock = useMutation({ mutationFn: safetyApi.unblock,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['blocked-organisations'] });
      void client.invalidateQueries({ predicate: q => CONTENT_KEYS.has(String(q.queryKey[0])) });
    }, onError: () => Alert.alert('Could not unblock organisation', 'Please try again.') });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: true, title: 'Blocked organisations', headerTintColor: COLORS.primary }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Text style={{ color: COLORS.textSub }}>Blocked organisations are hidden from browsing. Existing pledges remain available in Activity so you can manage them.</Text>
        {list.isPending ? <ActivityIndicator /> : list.isError ? <Button label="Retry loading" onPress={() => { void list.refetch(); }} /> : list.data.length === 0 ? <Text>No blocked organisations.</Text> : list.data.map(item => (
          <View key={item.ngoId} style={{ padding: 16, borderRadius: 12, backgroundColor: COLORS.surface, gap: 12 }}>
            <Text style={{ fontWeight: '600', color: COLORS.text }}>{item.ngo.name}</Text>
            <Button label="Unblock" variant="secondary" loading={unblock.isPending && unblock.variables === item.ngoId} disabled={unblock.isPending} onPress={() => unblock.mutate(item.ngoId)} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
