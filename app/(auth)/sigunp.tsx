import { getAuthAlertData, signUpEmail } from "@/services/_auth";
import { useLoading } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { startLoading, stopLoading, loading } = useLoading();

  const handleSignUp = async () => {
    if (!name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe seu nome para criar a conta.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Senhas diferentes", "As senhas precisam ser iguais.");
      return;
    }

    try {
      startLoading()
      await signUpEmail(email, password, name.trim());
      router.replace("/(auth)/termos");
    } catch (error) {
      const { title, message } = getAuthAlertData(error, "Erro no cadastro");
      Alert.alert(title, message);
    } finally {
      stopLoading()
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#000000]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-2">
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="items-center">
              <View className="h-[180px] w-[180px] items-center justify-center">
                <Image
                  source={require("../../assets/images/Alimenta-logo.png")}
                  style={{ width: 180, height: 180 }}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View className="mb-6">
              <Text
                className="text-center text-white"
                style={{
                  fontSize: 28,
                  fontFamily: "System",
                  fontWeight: "bold",
                }}
              >
                Crie sua conta
              </Text>
              <Text
                className="mt-2 text-center text-[15px] font-normal text-[#A1A1AA]"
                style={{ fontFamily: "System" }}
              >
                Preencha seus dados para comecar
              </Text>
            </View>

            <View className="mt-2">
              <Text
                className="mb-2 ml-1 text-sm font-medium text-white"
                style={{ fontFamily: "System" }}
              >
                Nome
              </Text>
              <View className="h-[56px] flex-row items-center rounded-2xl border border-[#27272A] bg-[#0A0A0A] px-4">
                <Ionicons name="person-outline" size={22} color="#6FC72C" />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Seu nome"
                  placeholderTextColor="#71717A"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={loading <= 0}
                  className="ml-3 flex-1 text-[16px] font-normal text-white"
                  style={{ fontFamily: "System" }}
                />
              </View>

              <Text
                className="mb-2 ml-1 mt-5 text-sm font-medium text-white"
                style={{ fontFamily: "System" }}
              >
                E-mail
              </Text>
              <View className="h-[56px] flex-row items-center rounded-2xl border border-[#27272A] bg-[#0A0A0A] px-4">
                <Ionicons name="mail-outline" size={22} color="#6FC72C" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  placeholderTextColor="#71717A"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  className="ml-3 flex-1 text-[16px] font-normal text-white"
                  style={{ fontFamily: "System" }}
                />
              </View>

              <Text
                className="mb-2 ml-1 mt-5 text-sm font-medium text-white"
                style={{ fontFamily: "System" }}
              >
                Senha
              </Text>
              <View className="h-[56px] flex-row items-center rounded-2xl border border-[#27272A] bg-[#0A0A0A] px-4">
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color="#6FC72C"
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Crie uma senha"
                  placeholderTextColor="#71717A"
                  secureTextEntry={!showPassword}
                  editable={loading <= 0}
                  className="ml-3 mr-2 flex-1 text-[16px] font-normal text-white"
                  style={{ fontFamily: "System" }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((current) => !current)}
                  disabled={loading > 0}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color="#A1A1AA"
                  />
                </TouchableOpacity>
              </View>

              <Text
                className="mb-2 ml-1 mt-5 text-sm font-medium text-white"
                style={{ fontFamily: "System" }}
              >
                Confirmar senha
              </Text>
              <View className="h-[56px] flex-row items-center rounded-2xl border border-[#27272A] bg-[#0A0A0A] px-4">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color="#6FC72C"
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repita sua senha"
                  placeholderTextColor="#71717A"
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                  className="ml-3 mr-2 flex-1 text-[16px] font-normal text-white"
                  style={{ fontFamily: "System" }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((current) => !current)}
                  disabled={loading > 0}
                  hitSlop={10}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={24}
                    color="#A1A1AA"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="mt-8"
                activeOpacity={0.85}
                disabled={loading > 0}
                onPress={handleSignUp}
              >
                <LinearGradient
                  colors={
                    loading ? ["#3F7F2C", "#2B641F"] : ["#5ED62A", "#33A61A"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: 56,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      className="text-[17px] font-semibold text-white"
                      style={{ fontFamily: "System", letterSpacing: 0.3 }}
                    >
                      Criar conta
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
