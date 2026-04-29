import { SocialLoginButton } from "@/components";
import ForgotPasswordDialog from "@/components/forgot-password-dialog";
import {
  getAuthAlertData,
  loginWithEmail,
  loginWithGoogle,
  resetPassword,
} from "@/services/_auth";
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

export default function Login() {
  const [openForgotPass, setOpenForgotPass] = useState<boolean>(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginWithEmail(email, password);
      router.replace("/(tabs)/home");
    } catch (error) {
      const { title, message } = getAuthAlertData(error, "Erro no login");
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setLoading(true);
      await resetPassword(email);
      Alert.alert(
        "E-mail enviado",
        "Enviamos as instrucoes de recuperacao para o e-mail informado.",
      );
    } catch (error) {
      const { title, message } = getAuthAlertData(error, "Erro");
      Alert.alert(title, message);
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
    try {
      setLoading(true);
      await loginWithGoogle();
      router.replace("/(tabs)/home");
    } catch (error) {
      const { title, message } = getAuthAlertData(error, "Erro no Google");
      Alert.alert(title, message);
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
            <View className="items-center mt-4">
              <View className="w-[180px] h-[180px] items-center justify-center -mb-2">
                <Image
                  source={require("../../../assets/images/Alimenta-logo.png")}
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
                  value={password}
                  onChangeText={setPassword}
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
              <ForgotPasswordDialog
                open={openForgotPass}
                setOpen={setOpenForgotPass}
                onSuccessCallback={handlePasswordReset}
                trigger={
                  <TouchableOpacity
                    className="self-end mt-4 mb-2"
                    disabled={loading}
                    hitSlop={10}
                    onPress={(event) => {
                      event.preventDefault();
                      setOpenForgotPass(true);
                    }}
                  >
                    <Text
                      className="text-[#6FC72C] text-[14px] font-medium"
                      style={{ fontFamily: "System" }}
                    >
                      Esqueceu a senha?
                    </Text>
                  </TouchableOpacity>
                }
              />

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

              <SocialLoginButton
                label="Entrar com Google"
                disabled={loading}
                onPress={handleGoogleLogin}
                className="mb-4"
                icon={
                  <Image
                    source={{
                      uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png",
                    }}
                    style={{ width: 22, height: 22 }}
                  />
                }
              />

              <SocialLoginButton
                label="Entrar com Apple"
                onPress={() => showUnavailableSocialLogin("Apple")}
                className="mb-8"
                icon={
                  <Ionicons
                    name="logo-apple"
                    size={24}
                    color="white"
                    style={{ marginTop: -2 }}
                  />
                }
              />
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
                onPress={() => router.push("../signup")}
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
