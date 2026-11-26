import { Redirect, Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/src/i18n";
import { colors } from "@/src/theme";
import { apiRequest, signOut } from "@/src/api";

export default function TabLayout() {
  const { t } = useLanguage();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void apiRequest<{ role: string }>("/api/v1/me").then(async (actor) => {
      if (actor.role !== "agripreneur") await signOut();
      if (active) setAuthenticated(actor.role === "agripreneur");
    })
      .catch(() => { if (active) setAuthenticated(false); });
    return () => { active = false; };
  }, []);

  if (authenticated === null) return null;
  if (!authenticated) return <Redirect href="/auth" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.greenDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 9,
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: colors.forest,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -3 },
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("Today"),
          tabBarIcon: ({ color, size, focused }) => <View style={[styles.iconWell, focused && styles.iconWellActive]}><Ionicons name={focused ? "home" : "home-outline"} color={String(color)} size={size} /></View>,
          tabBarAccessibilityLabel: t("Today"),
        }}
      />
      <Tabs.Screen
        name="follow-up"
        options={{
          title: t("Follow up"),
          tabBarIcon: ({ color, size, focused }) => <View style={[styles.iconWell, focused && styles.iconWellActive]}><Ionicons name={focused ? "list" : "list-outline"} color={String(color)} size={size} /></View>,
          tabBarAccessibilityLabel: t("Follow up"),
        }}
      />
      <Tabs.Screen
        name="field-log"
        options={{
          title: t("Record"),
          tabBarIcon: ({ color, size, focused }) => <View style={[styles.iconWell, focused && styles.iconWellActive]}><Ionicons name={focused ? "leaf" : "leaf-outline"} color={String(color)} size={size} /></View>,
          tabBarAccessibilityLabel: t("Record a need"),
        }}
      />
      <Tabs.Screen
        name="business-book"
        options={{
          title: t("Business book"),
          tabBarIcon: ({ color, size, focused }) => <View style={[styles.iconWell, focused && styles.iconWellActive]}><Ionicons name={focused ? "book" : "book-outline"} color={String(color)} size={size} /></View>,
          tabBarAccessibilityLabel: t("Business book"),
        }}
      />
    </Tabs>
  );
}

const styles = {
  iconWell: { width: 38, height: 30, borderRadius: 99, alignItems: "center" as const, justifyContent: "center" as const },
  iconWellActive: { backgroundColor: colors.greenSoft },
};
