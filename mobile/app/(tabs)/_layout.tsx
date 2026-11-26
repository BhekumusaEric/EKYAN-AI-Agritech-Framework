import { Redirect, Tabs } from "expo-router";
import { useEffect, useState } from "react";
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
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("Today"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={String(color)} size={size} />,
          tabBarAccessibilityLabel: t("Today"),
        }}
      />
      <Tabs.Screen
        name="follow-up"
        options={{
          title: t("Follow up"),
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" color={String(color)} size={size} />,
          tabBarAccessibilityLabel: t("Follow up"),
        }}
      />
      <Tabs.Screen
        name="field-log"
        options={{
          title: t("Record"),
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" color={String(color)} size={size} />,
          tabBarAccessibilityLabel: t("Record a need"),
        }}
      />
      <Tabs.Screen
        name="business-book"
        options={{
          title: t("Business book"),
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={String(color)} size={size} />,
          tabBarAccessibilityLabel: t("Business book"),
        }}
      />
    </Tabs>
  );
}
