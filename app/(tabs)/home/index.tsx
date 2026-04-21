import { auth } from "@/services/_firebase";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const handleLogout = async () => {
    if (!auth) {
      router.replace("/(auth)/login");
      return;
    }

    try {
      await signOut(auth);
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Erro", "Nao foi possivel sair da conta.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-4">
      <View className="w-full max-w-md items-center bg-slate-50 p-6 rounded-xl shadow-md">
        <Text className="text-3xl font-extrabold mb-2">Alimenta+</Text>
        <Text className="text-base text-slate-500 mb-4">Bem-vindo ao app!</Text>
        <Pressable
          className="bg-blue-600 px-4 py-2 rounded-md"
          onPress={handleLogout}
        >
          <Text className="text-white font-semibold">Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
