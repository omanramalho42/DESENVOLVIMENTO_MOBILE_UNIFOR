import { auth } from "@/services/_firebase";
import { settings } from "@/settings";
import { Redirect } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  const [checkingSession, setCheckingSession] = useState(
    settings.hasFirebaseSettings && Boolean(auth),
  );

  useEffect(() => {
    if (!settings.hasFirebaseSettings || !auth) {
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
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#6FC72C" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)/home" : "/(auth)/login"} />;
}
