import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../src/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.medium },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          height: 62,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.terracotta,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, size }) => <Ionicons name="file-tray" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
