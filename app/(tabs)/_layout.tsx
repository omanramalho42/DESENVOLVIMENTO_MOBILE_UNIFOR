import useAuth from "@/hooks/_useAuth";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Redirect, Tabs } from "expo-router";

export default function TabLayout() {
  const { user, initializing } = useAuth();

  if (initializing) return null;

  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#65C90F",
        tabBarInactiveTintColor: "#A3A3A3",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 86,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopWidth: 0,
          backgroundColor: "#0B0F0C",
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              size={24}
              name={focused ? "home" : "home-outline"}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="buscar/index"
        options={{
          title: "Buscar",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={24} name="magnify" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="doar/index"
        options={{
          title: "Doar",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={22}
              name="heart-outline"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="conversas/index"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={22}
              name="clipboard-text-outline"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil/index"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              size={23}
              name={focused ? "account" : "account-outline"}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="become-donor/index"
        options={{
          href: null,
          title: "Tornar-se Doador",
        }}
      />

      <Tabs.Screen
        name="doacoes"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="cadastrardoacoes"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}