import { Ionicons } from "@expo/vector-icons";
import { settings } from "@/settings";
import { auth } from "@/services/_firebase";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
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
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail.")
    .email("Informe um e-mail valido."),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

const resetPasswordSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail para recuperar a senha.")
  .email("Informe um e-mail valido.");

const getAuthErrorMessage = (error: unknown) => {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-mail ou senha incorretos.";
    case "auth/invalid-email":
      return "Informe um e-mail valido.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente mais tarde.";
    case "auth/network-request-failed":
      return "Falha de conexao. Verifique sua internet.";
    case "auth/configuration-not-found":
      return "Ative o Firebase Authentication e o provedor Google no console do Firebase.";
    case "auth/operation-not-allowed":
      return "Este metodo de login ainda nao esta ativado no Firebase Authentication.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela do Google. Permita pop-ups para continuar.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Login com Google cancelado.";
    case "auth/unauthorized-domain":
      return "Adicione este dominio aos dominios autorizados do Firebase Authentication.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "As configuracoes do Firebase nao estao validas.";
    default:
      return "Nao foi possivel entrar. Tente novamente.";
  }
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const parsed = loginSchema.safeParse({ email, senha });

    if (!parsed.success) {
      Alert.alert(
        "Dados invalidos",
        parsed.error.issues[0]?.message ?? "Verifique os dados informados.",
      );
      return;
    }

    if (!settings.hasFirebaseSettings || !auth) {
      Alert.alert(
        "Firebase nao configurado",
        "Preencha as variaveis EXPO_PUBLIC_FB_* no arquivo .env para usar o login.",
      );
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(
        auth,
        parsed.data.email,
        parsed.data.senha,
      );
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Erro no login", getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const parsedEmail = resetPasswordSchema.safeParse(email);

    if (!parsedEmail.success) {
      Alert.alert(
        "Dados invalidos",
        parsedEmail.error.issues[0]?.message ?? "Informe o e-mail.",
      );
      return;
    }

    if (!settings.hasFirebaseSettings || !auth) {
      Alert.alert(
        "Firebase nao configurado",
        "Preencha as variaveis EXPO_PUBLIC_FB_* no arquivo .env para recuperar a senha.",
      );
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, parsedEmail.data);
      Alert.alert(
        "E-mail enviado",
        "Enviamos as instrucoes de recuperacao para o e-mail informado.",
      );
    } catch (error) {
      Alert.alert("Erro", getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const showUnavailableSocialLogin = (provider: string) => {
    Alert.alert(
      "Login social",
      `O login com ${provider} ainda nao foi configurado.`,
    );
  };

  const handleGoogleLogin = async () => {
    if (!settings.hasFirebaseSettings || !auth) {
      Alert.alert(
        "Firebase nao configurado",
        "Preencha as variaveis EXPO_PUBLIC_FB_* no arquivo .env para usar o login com Google.",
      );
      return;
    }

    if (Platform.OS !== "web") {
      Alert.alert(
        "Google no mobile",
        "No Android/iOS, o Google exige configuracao com expo-auth-session e IDs de cliente por plataforma.",
      );
      return;
    }

    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await signInWithPopup(auth, provider);
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Erro no Google", getAuthErrorMessage(error));
    } finally {
      setLoading(false);
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
          <View className="px-6 pt-2 flex-1">
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="items-center mt-4">
              <View className="w-[180px] h-[180px] items-center justify-center -mb-2">
                <Image
                  source={require("../../assets/images/Alimenta-logo.png")}
                  style={{ width: 180, height: 180 }}
                  resizeMode="contain"
                />
              </View>
              <Text
                className="text-white mt-1"
                style={{
                  fontSize: 44,
                  fontFamily: "System",
                  fontWeight: "bold",
                  letterSpacing: -0.5,
                }}
              >
                Alimenta<Text className="text-[#6FC72C]">+</Text>
              </Text>
            </View>

            <View className="mt-8 mb-6">
              <Text
                className="text-white text-center"
                style={{
                  fontSize: 28,
                  fontFamily: "System",
                  fontWeight: "bold",
                }}
              >
                Bem-vindo de volta!
              </Text>
              <Text
                className="text-[#A1A1AA] text-center mt-2 text-[15px] font-normal"
                style={{ fontFamily: "System" }}
              >
                Acesse sua conta para continuar
              </Text>
            </View>

            <View className="mt-2">
              <Text
                className="text-white text-sm font-medium mb-2 ml-1"
                style={{ fontFamily: "System" }}
              >
                E-mail
              </Text>
              <View className="flex-row items-center h-[56px] bg-[#0A0A0A] border border-[#27272A] rounded-2xl px-4">
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
                  className="flex-1 text-white ml-3 text-[16px] font-normal"
                  style={{ fontFamily: "System" }}
                />
              </View>

              <Text
                className="text-white text-sm font-medium mb-2 ml-1 mt-5"
                style={{ fontFamily: "System" }}
              >
                Senha
              </Text>
              <View className="flex-row items-center h-[56px] bg-[#0A0A0A] border border-[#27272A] rounded-2xl px-4">
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color="#6FC72C"
                />
                <TextInput
                  value={senha}
                  onChangeText={setSenha}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#71717A"
                  secureTextEntry={!show}
                  editable={!loading}
                  className="flex-1 text-white ml-3 mr-2 text-[16px] font-normal"
                  style={{ fontFamily: "System" }}
                />
                <TouchableOpacity
                  onPress={() => setShow((current) => !current)}
                  disabled={loading}
                  hitSlop={10}
                >
                  <Ionicons
                    name={show ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color="#A1A1AA"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="self-end mt-4 mb-2"
                disabled={loading}
                hitSlop={10}
                onPress={handlePasswordReset}
              >
                <Text
                  className="text-[#6FC72C] text-[14px] font-medium"
                  style={{ fontFamily: "System" }}
                >
                  Esqueceu a senha?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-4"
                activeOpacity={0.85}
                disabled={loading}
                onPress={handleLogin}
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
                      className="text-white text-[17px] font-semibold"
                      style={{ fontFamily: "System", letterSpacing: 0.3 }}
                    >
                      Entrar
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View className="flex-row items-center my-8">
                <View className="flex-1 h-[1px] bg-[#27272A]" />
                <Text
                  className="text-[#71717A] mx-4 text-[14px] font-medium"
                  style={{ fontFamily: "System" }}
                >
                  ou continue com
                </Text>
                <View className="flex-1 h-[1px] bg-[#27272A]" />
              </View>

              <TouchableOpacity
                className="h-[56px] bg-transparent border border-[#27272A] rounded-2xl flex-row items-center justify-center mb-4"
                disabled={loading}
                onPress={handleGoogleLogin}
              >
                <Image
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png",
                  }}
                  style={{ width: 22, height: 22, marginRight: 12 }}
                />
                <Text
                  className="text-white font-medium text-[16px]"
                  style={{ fontFamily: "System" }}
                >
                  Entrar com Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="h-[56px] bg-transparent border border-[#27272A] rounded-2xl flex-row items-center justify-center mb-8"
                onPress={() => showUnavailableSocialLogin("Apple")}
              >
                <Ionicons
                  name="logo-apple"
                  size={24}
                  color="white"
                  style={{ marginRight: 10, marginTop: -2 }}
                />
                <Text
                  className="text-white font-medium text-[16px]"
                  style={{ fontFamily: "System" }}
                >
                  Entrar com Apple
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-center mt-auto mb-6">
              <Text
                className="text-[#A1A1AA] text-[15px] font-normal"
                style={{ fontFamily: "System" }}
              >
                Nao tem uma conta?{" "}
              </Text>
              <TouchableOpacity
                hitSlop={10}
                onPress={() =>
                  Alert.alert("Cadastro", "A tela de cadastro ainda nao foi criada.")
                }
              >
                <Text
                  className="text-[#6FC72C] text-[15px] font-semibold"
                  style={{ fontFamily: "System" }}
                >
                  Criar conta
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
