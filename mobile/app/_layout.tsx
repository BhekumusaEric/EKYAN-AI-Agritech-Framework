import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider } from "@/src/i18n";
import { colors } from "@/src/theme";
import { GrowingLoader } from "@/src/ui";

SplashScreen.setOptions({ duration: 500, fade: true });

export default function RootLayout() {
  const [showBrandSplash, setShowBrandSplash] = useState(true);
  const [fade] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => setShowBrandSplash(false));
    }, 850);
    return () => clearTimeout(timer);
  }, [fade]);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        {showBrandSplash && <Animated.View style={[styles.splash, { opacity: fade }]} pointerEvents="none">
          <View style={styles.brandMark}><Ionicons name="leaf" size={33} color="#FFFFFF" /></View>
          <Text style={styles.brandName}>EKYAN Connect</Text>
          <Text style={styles.brandLine}>GROWING TOGETHER</Text>
          <View style={styles.loader}><GrowingLoader color="#F3D17B" size={20} /></View>
        </Animated.View>}
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { ...StyleSheet.absoluteFill, zIndex: 20, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  brandMark: { height: 70, width: 70, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF24", borderWidth: 1, borderColor: "#FFFFFF45" },
  brandName: { color: "#FFFFFF", fontSize: 21, fontWeight: "800", marginTop: 16 },
  brandLine: { color: "#D6E4D9", fontSize: 9, letterSpacing: 2.2, fontWeight: "700", marginTop: 5 },
  loader: { position: "absolute", bottom: 64 },
});
