import { auth } from "@/services/_firebase";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Redirect, Tabs } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function TabLayout() {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  const [checkingSession, setCheckingSession] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setCheckingSession(false);
    });

    return unsubscribe;
  }, []);

  if (checkingSession) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#6FC72C" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1976D2",
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="house" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
