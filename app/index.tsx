import useAuth from "@/hooks/_useAuth";
import { Redirect } from "expo-router";

export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  return <Redirect href={user ? "/(tabs)/home" : "/(auth)/login"} />;
}