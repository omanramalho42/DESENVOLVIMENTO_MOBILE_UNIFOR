import useAuth from "@/hooks/_useAuth";
import { FirestoreServiceError, salvarDoador } from "@/services";
import { apenasDigitos, formatarCNPJ, formatarCPF, validarCNPJ, validarCPF } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TipoDocumento = "cpf" | "cnpj";

const absoluteFill = {
  position: "absolute" as const,
  top: 0, right: 0, bottom: 0, left: 0,
};

export default function BecomeDonor() {
  const { user } = useAuth();

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("cpf");
  const [documento, setDocumento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleTipoChange = (tipo: TipoDocumento) => {
    setTipoDocumento(tipo);
    setDocumento("");
  };

  const handleDocumentoChange = (valor: string) => {
    setDocumento(
      tipoDocumento === "cpf" ? formatarCPF(valor) : formatarCNPJ(valor)
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Erro", "Você precisa estar logado para continuar.");
      return;
    }

    const digitos = apenasDigitos(documento);
    const valido = tipoDocumento === "cpf"
      ? validarCPF(digitos)
      : validarCNPJ(digitos);

    if (!valido) {
      Alert.alert(
        "Documento inválido",
        `Informe um ${tipoDocumento.toUpperCase()} válido.`
      );
      return;
    }

    if (!endereco.trim()) {
      Alert.alert("Endereço obrigatório", "Informe o endereço ou ponto de retirada.");
      return;
    }

    try {
      setSubmitting(true);
      await salvarDoador(user.uid, {
        documento: digitos,
        tipoDocumento,
        endereco: endereco.trim(),
      });
      setSubmitting(false);
      Alert.alert(
        "Cadastro realizado! 🎉",
        "Você agora é um doador do Alimenta+.",
        [{ text: "Continuar", onPress: () => router.replace("/(tabs)/home" as any) }]
      );
    } catch (error) {
      setSubmitting(false);
      const mensagem =
        error instanceof FirestoreServiceError
          ? error.message
          : "Não foi possível concluir o cadastro. Tente novamente.";
      Alert.alert("Erro no cadastro", mensagem);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050807]">
      <StatusBar style="light" />
      <LinearGradient
        colors={["rgba(12,20,12,0.96)", "rgba(5,8,7,1)"]}
        style={absoluteFill}
      />
      <View
        className="absolute -left-20 top-0 h-[260px] w-[260px] rounded-full"
        style={{ backgroundColor: "rgba(101,201,15,0.035)" }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-5 pt-2">
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={12}
              disabled={submitting}
              className="mb-6"
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="items-center mb-8">
              <View
                className="items-center justify-center rounded-full mb-5"
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: "#18340D",
                  borderWidth: 1.5,
                  borderColor: "#2B5718",
                }}
              >
                <MaterialCommunityIcons name="leaf" size={38} color="#65C90F" />
              </View>
              <Text
                className="text-white text-center text-[28px] font-semibold"
                style={{ letterSpacing: -0.4 }}
              >
                Tornar-se Doador
              </Text>
              <Text className="mt-2 text-center text-[15px] text-[#A3A3A3]">
                Preencha seus dados para começar a doar
              </Text>
            </View>

            <Text className="mb-2 ml-1 text-sm font-medium text-white">
              Tipo de documento
            </Text>
            <View
              className="flex-row rounded-[18px] mb-6 border border-white/5 bg-[#101514]"
              style={{ padding: 4 }}
            >
              {(["cpf", "cnpj"] as TipoDocumento[]).map((tipo) => {
                const ativo = tipoDocumento === tipo;
                return (
                  <TouchableOpacity
                    key={tipo}
                    onPress={() => handleTipoChange(tipo)}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: ativo ? "#65C90F" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: ativo ? "#081106" : "#A3A3A3",
                        fontWeight: ativo ? "700" : "400",
                        fontSize: 15,
                      }}
                    >
                      {tipo.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="mb-2 ml-1 text-sm font-medium text-white">
              {tipoDocumento === "cpf" ? "CPF" : "CNPJ"}
            </Text>
            <View className="h-[56px] flex-row items-center rounded-[18px] border border-white/5 bg-[#101514] px-4 mb-5">
              <MaterialCommunityIcons name="card-account-details-outline" size={22} color="#65C90F" />
              <TextInput
                value={documento}
                onChangeText={handleDocumentoChange}
                placeholder={tipoDocumento === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                editable={!submitting}
                className="ml-3 flex-1 text-[16px] text-white"
              />
            </View>

            <Text className="mb-2 ml-1 text-sm font-medium text-white">
              Endereço / Ponto de retirada
            </Text>
            <View
              className="flex-row items-start rounded-[18px] border border-white/5 bg-[#101514] px-4 mb-2"
              style={{ minHeight: 100, paddingTop: 14, paddingBottom: 14 }}
            >
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={22}
                color="#65C90F"
                style={{ marginTop: 2 }}
              />
              <TextInput
                value={endereco}
                onChangeText={setEndereco}
                placeholder="Ex: Rua das Flores, 123 – Centro, Fortaleza – CE"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={3}
                editable={!submitting}
                className="ml-3 flex-1 text-[16px] text-white"
                style={{ textAlignVertical: "top" }}
              />
            </View>
            <Text className="ml-1 mb-8 text-xs text-[#6B7280]">
              Informe onde os receptores poderão retirar as doações.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={submitting}
              onPress={handleSubmit}
              className="overflow-hidden rounded-[22px]"
            >
              <LinearGradient
                colors={["#7DE11B", "#58B50B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 56,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#081106" />
                ) : (
                  <Text
                    style={{
                      color: "#081106",
                      fontSize: 16,
                      fontWeight: "600",
                      letterSpacing: 0.2,
                    }}
                  >
                    Confirmar cadastro
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}