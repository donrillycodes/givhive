import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import type { User } from '../../types';
import { COLORS, getInitials } from '../../lib/utils';

export function UserAvatar({ user, size = 60 }: {
  user: Pick<User, 'firstName' | 'lastName' | 'avatarUrl'> | null;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const uri = user?.avatarUrl;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2,
      backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {uri && failedUrl !== uri ? (
        <Image source={{ uri }} accessibilityLabel="Profile photo"
          style={{ width: size, height: size }} onError={() => setFailedUrl(uri)} />
      ) : (
        <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: size / 3 }}>
          {user ? getInitials(user.firstName, user.lastName) : 'U'}
        </Text>
      )}
    </View>
  );
}
