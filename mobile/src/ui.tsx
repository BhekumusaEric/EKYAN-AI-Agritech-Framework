import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type ImageSourcePropType,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguage } from "./i18n";
import { colors } from "./theme";
import { signOut } from "./api";

export function GrowingLoader({ color = colors.greenDark, size = 20 }: { color?: string; size?: number }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 680, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 680, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [progress]);
  return <Animated.View accessibilityLabel="Loading" style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["-14deg", "14deg"] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.06] }) }] }}>
    <Ionicons name="leaf" size={size} color={color} />
  </Animated.View>;
}

export function ScreenFrame({
  children,
  refreshing = false,
  onRefresh,
  backgroundImage,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  backgroundImage?: ImageSourcePropType;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ImageBackground
        source={backgroundImage ?? require("../assets/images/auth-login.jpg")}
        style={styles.screenBackdrop}
        imageStyle={styles.screenBackdropImage}
        resizeMode="cover"
      >
        <ScrollView
          contentContainerStyle={styles.screenContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.greenDark} /> : undefined}
        >
          {children}
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { language, setLanguage, t, preferenceError } = useLanguage();
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Ionicons name="leaf" size={23} color={colors.greenDark} />
          <View style={styles.logoSun} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>EKYAN Connect</Text>
          <Text style={styles.brandMeta}>{t("Synthetic demo only")}</Text>
        </View>
        <View style={styles.headerActions}>
        <View style={styles.languageToggle} accessibilityLabel="Language">
          {(["en", "sw"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => void setLanguage(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: language === value }}
              style={[styles.languageOption, language === value && styles.languageOptionActive]}
            >
              <Text style={[styles.languageText, language === value && styles.languageTextActive]}>
                {value.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => void signOut().finally(() => router.replace("/auth"))} accessibilityRole="button" accessibilityLabel={t("Sign out")} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={17} color={colors.muted} />
        </Pressable>
        </View>
      </View>
      <View style={styles.pageHeading}>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {preferenceError ? <Text style={styles.preferenceError}>{preferenceError}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Notice({
  title,
  children,
  tone = "warning",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "warning" | "success" | "error" | "info";
}) {
  const toneStyle = {
    warning: styles.noticeWarning,
    success: styles.noticeSuccess,
    error: styles.noticeError,
    info: styles.noticeInfo,
  }[tone];
  const icon = {
    warning: "alert-circle-outline",
    success: "checkmark-circle-outline",
    error: "close-circle-outline",
    info: "information-circle-outline",
  }[tone] as keyof typeof Ionicons.glyphMap;
  return (
    <View style={[styles.notice, toneStyle]}>
      <Ionicons name={icon} size={19} color={tone === "warning" ? "#8C5A08" : tone === "error" ? colors.danger : colors.greenDark} />
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeBody}>{children}</Text>
      </View>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
}) {
  const secondary = variant === "secondary";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <GrowingLoader color={secondary ? colors.greenDark : "#FFFFFF"} />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={secondary ? colors.greenDark : "#FFFFFF"} />
      ) : null}
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {selected ? <Ionicons name="checkmark" size={13} color={colors.greenDark} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8A9B92"
        {...props}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
      />
    </View>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  tone = "green",
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "green" | "gold" | "blue";
}) {
  const tint = tone === "gold" ? colors.goldSoft : tone === "blue" ? colors.blueSoft : colors.greenSoft;
  const iconColor = tone === "gold" ? "#956616" : tone === "blue" ? colors.blue : colors.greenDark;
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screenBackdrop: { flex: 1, backgroundColor: colors.background },
  screenBackdropImage: { opacity: 0.055 },
  screenContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, gap: 20 },
  header: { gap: 20 },
  brandRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 11 },
  logoMark: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: colors.greenSoft,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  logoSun: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold, top: 8, right: 8 },
  brandCopy: { flex: 1 },
  brandName: { color: colors.ink, fontSize: 14, fontWeight: "800", letterSpacing: 0.1 },
  brandMeta: { color: colors.muted, fontSize: 10, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  signOutButton: { height: 40, width: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  languageToggle: { flexDirection: "row", padding: 3, borderRadius: 99, backgroundColor: "#E8E8DC", gap: 2 },
  languageOption: { minWidth: 39, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 99 },
  languageOptionActive: { backgroundColor: colors.surface, shadowColor: "#17352B", shadowOpacity: 0.08, shadowRadius: 5, elevation: 1 },
  languageText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  languageTextActive: { color: colors.greenDark },
  pageHeading: { gap: 4 },
  pageTitle: { color: colors.ink, fontSize: 29, fontWeight: "800", letterSpacing: -0.8 },
  pageSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  preferenceError: { color: colors.danger, fontSize: 11, lineHeight: 16 },
  card: {
    backgroundColor: "transparent",
    borderColor: colors.line,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 0,
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  sectionSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 17, borderWidth: 1 },
  noticeWarning: { backgroundColor: colors.goldSoft, borderColor: "#F0D8A5" },
  noticeSuccess: { backgroundColor: colors.greenSoft, borderColor: "#C9E2CC" },
  noticeError: { backgroundColor: colors.dangerSoft, borderColor: "#F2C9C4" },
  noticeInfo: { backgroundColor: colors.blueSoft, borderColor: "#CDE3E8" },
  noticeCopy: { flex: 1, gap: 3 },
  noticeTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  noticeBody: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  button: { minHeight: 52, borderRadius: 99, paddingHorizontal: 19, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  buttonPrimary: { backgroundColor: colors.greenDark, shadowColor: colors.forest, shadowOpacity: 0.16, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  buttonSecondary: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1 },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  buttonTextSecondary: { color: colors.greenDark },
  chip: { minHeight: 40, paddingHorizontal: 14, flexDirection: "row", gap: 5, justifyContent: "center", alignItems: "center", borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.greenSoft, borderColor: "#AFC3A8" },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  chipTextSelected: { color: colors.greenDark },
  field: { gap: 7 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 15, paddingVertical: 11, color: colors.ink, fontSize: 14 },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  metricCard: { flex: 1, minWidth: "46%", backgroundColor: "transparent", borderLeftWidth: 2, borderLeftColor: colors.green, borderRadius: 0, paddingVertical: 9, paddingLeft: 12, gap: 7 },
  metricIcon: { width: 31, height: 31, borderRadius: 99, justifyContent: "center", alignItems: "center" },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  metricValue: { color: colors.ink, fontSize: 16, fontWeight: "800" },
});
