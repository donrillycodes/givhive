import { BrandLogo } from "../../components/shared/BrandLogo";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT, SPACE, RADII } from "../../lib/utils";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface Slide {
  tag: string;
  headline: string;
  body: string;
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
}

const slides: Slide[] = [
  {
    tag: "WINNIPEG GIVING, SIMPLIFIED",
    headline: "Turn extra food\ninto real help.",
    body: "GivHive connects donors with reviewed organisations so meals, supplies, and cash donations reach people faster.",
    icon: "heart-outline",
    iconBg: COLORS.primaryLight,
    iconColor: COLORS.primary,
  },
  {
    tag: "FOR DONORS",
    headline: "Find urgent food\nneeds nearby.",
    body: "See what local NGOs need, pledge items in seconds, and keep every donation organized in one place.",
    icon: "location-outline",
    iconBg: COLORS.accentLight,
    iconColor: COLORS.accent,
  },
  {
    tag: "FOR CHARITIES",
    headline: "Post needs.\nTrack impact.",
    body: "Organizations can manage food requests, pledges, and donation activity from one trusted network.",
    icon: "business-outline",
    iconBg: "#EEF2FF",
    iconColor: COLORS.blue,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      router.push("/(auth)/register");
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <BrandLogo width={180} />
        {!isLast && (
          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slide content */}
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: slide.iconBg }]}>
          <Ionicons name={slide.icon} size={52} color={slide.iconColor} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.tag}>{slide.tag}</Text>
          <Text style={styles.headline}>{slide.headline}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {isLast ? "Get started" : "Continue"}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.surface} />
        </TouchableOpacity>

        {/* Sign-in link — last slide only */}
        {isLast ? (
          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            style={styles.signInLink}
          >
            <Text style={styles.signInText}>Already have an account? </Text>
            <Text style={[styles.signInText, styles.signInCta]}>Sign in</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.signInLink} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.sm,
  },
  skip: {
    fontSize: FONT.base,
    color: COLORS.textSub,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACE["2xl"],
    justifyContent: "center",
    gap: SPACE["3xl"],
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: RADII.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    gap: SPACE.md,
  },
  tag: {
    fontSize: FONT.xs,
    fontWeight: "700",
    letterSpacing: 2,
    color: COLORS.accent,
  },
  headline: {
    fontSize: FONT["3xl"],
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 36,
  },
  body: {
    fontSize: FONT.base,
    color: COLORS.textSub,
    lineHeight: 24,
  },
  bottom: {
    paddingHorizontal: SPACE.xl,
    paddingBottom: SPACE["3xl"],
    gap: SPACE.lg,
  },
  dots: {
    flexDirection: "row",
    gap: SPACE.sm,
  },
  dot: {
    height: 5,
    borderRadius: RADII.full,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: COLORS.border,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.lg,
    paddingVertical: SPACE.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
  },
  btnText: {
    fontSize: FONT.base,
    fontWeight: "700",
    color: COLORS.surface,
  },
  signInLink: {
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 22,
  },
  signInText: {
    fontSize: FONT.md,
    color: COLORS.textSub,
  },
  signInCta: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
