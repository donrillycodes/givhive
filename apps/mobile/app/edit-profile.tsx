import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Redirect, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isAxiosError } from 'axios';
import { UserAvatar } from '../components/shared/UserAvatar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { userApi } from '../lib/api';
import { COLORS, FONT, SPACE } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const editingUserId = useRef(user?.id);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null | undefined>();
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const picking = useRef(false);
  const validName = (name: string) => name.trim().length >= 2 && name.trim().length <= 100 && !/[\u0000-\u001f\u007f]/.test(name);
  const dirty = firstName.trim() !== user?.firstName || lastName.trim() !== user?.lastName || photo !== undefined;

  if (!user || user.id !== editingUserId.current) return <Redirect href="/(auth)/welcome" />;

  const choosePhoto = async () => {
    if (inFlight.current || picking.current) return;
    picking.current = true;
    setChoosingPhoto(true);
    setError('');
    try {
      // The system picker grants access only to the photo the user chooses.
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true,
        aspect: [1, 1], quality: 1, exif: false, allowsMultipleSelection: false });
      if (result.canceled || !result.assets[0]) return;
      const rendered = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: 512 }).renderAsync();
      const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (!image.base64 || image.base64.length > 4 * Math.ceil(1024 * 1024 / 3)) {
        throw new Error('This photo is too large. Please choose a different image.');
      }
      if (mounted.current) setPhoto({ uri: image.uri, base64: image.base64 });
    } catch {
      if (mounted.current) setError('Could not prepare this photo. Please try a different image and allow photo access if prompted.');
    } finally {
      picking.current = false;
      if (mounted.current) setChoosingPhoto(false);
    }
  };

  const save = async () => {
    if (inFlight.current || picking.current) return;
    if (!validName(firstName) || !validName(lastName)) {
      setError('First and last names must each be between 2 and 100 characters.');
      return;
    }
    if (useAuthStore.getState().user?.id !== editingUserId.current) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      const response = await userApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(),
        ...(photo !== undefined ? { photoBase64: photo?.base64 ?? null } : {}) });
      const current = useAuthStore.getState().user;
      // A response from an old session must not restore that session's profile.
      if (current?.id !== editingUserId.current) return;
      useAuthStore.getState().setUser({ ...current, ...response.data.data.user });
      if (mounted.current) router.back();
    } catch (failure) {
      if (mounted.current) setError(isAxiosError<{ message?: string }>(failure)
        ? failure.response?.data?.message ?? 'Could not save your profile. Check your connection and try again.'
        : 'Could not save your profile. Please try again.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit profile', headerTintColor: COLORS.primary }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.photo}>
            <UserAvatar user={{ ...user, avatarUrl: photo === undefined ? user.avatarUrl : photo?.uri ?? null }} size={88} />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose profile photo"
              disabled={saving || choosingPhoto} onPress={() => { void choosePhoto(); }}>
              <Text style={styles.photoAction}>{choosingPhoto ? 'Preparing photo…' : (photo?.uri || (photo === undefined && user.avatarUrl)) ? 'Change photo' : 'Add photo'}</Text>
            </TouchableOpacity>
            {!!(photo?.uri || (photo === undefined && user.avatarUrl)) && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove profile photo" disabled={saving || choosingPhoto}
                onPress={() => { setPhoto(user.avatarUrl ? null : undefined); setError(''); }}>
                <Text style={styles.hint}>Remove photo</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.hint}>Your photo is uploaded when you save.</Text>
            <Text style={[styles.hint, { textAlign: 'center' }]}>Visible on your profile and to organisations handling your pledges.</Text>
          </View>
          <Input label="First name" accessibilityLabel="First name" value={firstName}
            onChangeText={setFirstName} maxLength={100} autoComplete="given-name" textContentType="givenName" editable={!saving} />
          <Input label="Last name" accessibilityLabel="Last name" value={lastName}
            onChangeText={setLastName} maxLength={100} autoComplete="family-name" textContentType="familyName" editable={!saving} />
          <View style={{ gap: SPACE.sm }}>
            <Input label="Email address" accessibilityLabel="Email address, read only" value={user.email} editable={false}
              icon="lock-closed-outline" style={{ color: COLORS.textSub }} />
            <Text style={styles.hint}>Your email address is used to sign in and cannot be changed here.</Text>
          </View>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Button label="Save changes" loadingLabel="Saving…" loading={saving} disabled={!dirty || choosingPhoto}
            onPress={() => { void save(); }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACE.xl, gap: SPACE.lg },
  photo: { alignItems: 'center', paddingVertical: SPACE.lg, gap: SPACE.sm },
  photoAction: { color: COLORS.primary, fontSize: FONT.base, fontWeight: '600', padding: SPACE.sm },
  hint: { color: COLORS.textSub, fontSize: FONT.sm, lineHeight: 20 },
  error: { color: COLORS.error, fontSize: FONT.sm, lineHeight: 20 },
});
