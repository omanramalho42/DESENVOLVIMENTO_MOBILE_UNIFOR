import NotificacoesButton from "@/components/_notificacoes";
import { Box, HStack, Text, VStack } from "@/components/ui";
import useAuth from "@/hooks/_useAuth";
import {
  buscarDoacao,
  buscarPerfilUsuario,
  FirestoreServiceError,
  solicitarDoacao,
} from "@/services";
import { useLoading } from "@/store";
import { UserProfile } from "@/types";
import { formatarData, formatarHorario } from "@/utils";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const fallbackImage = require("@/assets/images/pao.jpg");
const DONATION_TERMS_KEY = "alimenta_plus_donation_terms_accepted_v1";
const USER_COORDS_KEY = "@user_last_coords";

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceMeters = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) => {
  const earthRadius = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

const formatDistance = (meters: number) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  const precision = km < 10 ? 1 : 0;
  return `${km.toFixed(precision)} km`;
};

const TERMO_DOACAO = `Ao solicitar esta doação, você declara que:

1. Origem dos Alimentos
Você reconhece que os alimentos foram cadastrados por terceiros e que o Alimenta+ não produz, armazena, transporta nem inspeciona os itens ofertados.

2. Qualidade Sanitária
O Alimenta+ não realiza controle sanitário. Você é responsável por verificar as condições dos itens no momento da retirada e por decidir sobre o seu recebimento.

3. Responsabilidade pela Retirada
Você se compromete a comparecer ao local e horário combinados. O não comparecimento injustificado poderá impactar sua reputação na plataforma.

4. Uso Adequado
Você se compromete a utilizar os alimentos exclusivamente para consumo próprio ou finalidade social, sendo proibida a revenda ou comercialização dos itens recebidos.

5. Conduta Ética
Você concorda em agir de boa-fé, não utilizando identidade falsa, não praticando golpes e não tentando obter vantagem indevida.

6. Registro da Solicitação
A plataforma registrará os dados desta solicitação, incluindo data, horário e usuários envolvidos, para fins de segurança e auditoria.

7. Limitação de Responsabilidade
O Alimenta+ atua exclusivamente como intermediador digital e não se responsabiliza por danos decorrentes do consumo dos alimentos ou do não cumprimento de acordos entre as partes.

8. Cancelamento
Caso não possa retirar a doação, cancele a solicitação com antecedência pelo aplicativo.`;

const InfoCell = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <VStack className="flex-1">
    <HStack className="flex-row items-center mb-1">
      <FontAwesome5 name={icon} size={13} color="#65A30D" />
      <Text className="text-[#71717A] text-xs ml-2">{label}</Text>
    </HStack>
    <Text className="text-white text-base font-semibold" numberOfLines={2}>
      {value}
    </Text>
  </VStack>
);

export default function DonationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const { startLoading, stopLoading } = useLoading();
  const [donation, setDonation] = useState<Awaited<ReturnType<typeof buscarDoacao>>>(null);
  const [donorProfile, setDonorProfile] = useState<UserProfile | null>(null);
  const [loadingDonor, setLoadingDonor] = useState(false);
  const [dataAgendada, setDataAgendada] = useState("");
  const [horarioAgendado, setHorarioAgendado] = useState("");
  const [reivindicando, setReivindicando] = useState(false);
  const [termoModalVisible, setTermoModalVisible] = useState(false);
  const [termoAceito, setTermoAceito] = useState(false);
  const [distanceText, setDistanceText] = useState<string | null>(null);
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    if (!id) return;
    startLoading();
    buscarDoacao(id)
      .then(async (data) => {
        setDonation(data);
        if (data?.donorId) {
          setLoadingDonor(true);
          buscarPerfilUsuario(data.donorId)
            .then(setDonorProfile)
            .finally(() => setLoadingDonor(false));
        }

        const coordsJson = await AsyncStorage.getItem(USER_COORDS_KEY);
        if (!coordsJson || !data) {
          setDistanceText(null);
          return;
        }

        const userCoords = JSON.parse(coordsJson) as { latitude: number; longitude: number };

        let donationCoords: { latitude: number; longitude: number } | null = null;

        if (typeof data.latitude === "number" && typeof data.longitude === "number") {
          donationCoords = { latitude: data.latitude, longitude: data.longitude };
        } else if (data.localizacao) {
          try {
            const [result] = await Location.geocodeAsync(data.localizacao);
            if (result) {
              donationCoords = { latitude: result.latitude, longitude: result.longitude };
            }
          } catch {
            donationCoords = null;
          }
        }

        if (donationCoords) {
          const distance = calculateDistanceMeters(userCoords, donationCoords);
          setDistanceText(`${formatDistance(distance)} de você`);
        } else {
          setDistanceText(null);
        }
      })
      .finally(stopLoading);
  }, [id, startLoading, stopLoading]);

  const handleReivindicarPress = async () => {
    if (!user) {
      Alert.alert("Atenção", "Você precisa estar logado para reivindicar uma doação.");
      return;
    }
    if (!donation) return;

    const jaAceitou = await AsyncStorage.getItem(DONATION_TERMS_KEY);
    if (jaAceitou === "true") {
      await executarReivindicacao();
    } else {
      setTermoAceito(false);
      setTermoModalVisible(true);
    }
  };

  const handleConfirmarTermo = async () => {
    if (!termoAceito) {
      Alert.alert("Atenção", "Você precisa aceitar os termos para continuar.");
      return;
    }
    await AsyncStorage.setItem(DONATION_TERMS_KEY, "true");
    setTermoModalVisible(false);
    await executarReivindicacao();
  };

  const executarReivindicacao = async () => {
    if (!user || !donation) return;

    setReivindicando(true);
    try {
      await solicitarDoacao(
        donation.id,
        user.uid,
        {
          titulo: donation.tipoAlimento,
          quantidade: donation.quantidade,
          validade: donation.validade,
          categoria: donation.categoria,
          doadorId: donation.donorId ?? "",
          solicitanteNome: user.displayName ?? user.email ?? "Usuário",
          solicitanteAvatar: user.photoURL ?? null,
        },
        dataAgendada,
        horarioAgendado,
      );
      setDonation((prev) =>
        prev ? { ...prev, status: "indisponivel", reivindicadoPor: user.uid, dataAgendada, horarioAgendado } : prev
      );
      Alert.alert("Sucesso!", "Doação reivindicada com sucesso.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      const message =
        error instanceof FirestoreServiceError
          ? error.message
          : "Não foi possível reivindicar a doação. Tente novamente.";
      Alert.alert("Erro", message);
    } finally {
      setReivindicando(false);
    }
  };

  const firstPhoto = donation?.fotos?.[0]?.secureUrl ?? null;
  const isOwnDonation = !!donation && donation.donorId === user?.uid;
  const canClaim = donation?.status === "disponivel" && !isOwnDonation;
  const isClaimed = donation?.status === "indisponivel";
  const tipoRetiradaLabel =
    donation?.tipoRetirada === "doador" ? "Entrega pelo doador" : "Retirada pelo receptor";
  const tipoRetiradaIcon = donation?.tipoRetirada === "doador" ? "truck" : "walking";
  const isScheduleValid = dataAgendada.length === 10 && horarioAgendado.length === 5;

  return (
    <SafeAreaView className="flex-1 bg-[#09090B]">
      <HStack className="flex-row items-center px-5 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} className="mr-3">
          <FontAwesome5 name="arrow-left" size={18} color="#A1A1AA" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold flex-1" numberOfLines={1}>
          {donation?.tipoAlimento ?? "Doação"}
        </Text>
        <NotificacoesButton />
      </HStack>

      {!donation ? (
        <Box className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-lg font-semibold mb-2">Doação não encontrada</Text>
          <Text className="text-[#71717A] text-center">Esta doação pode ter sido removida.</Text>
        </Box>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            <Image
              source={firstPhoto ? { uri: firstPhoto } : fallbackImage}
              style={{ width: "100%", height: 220, borderRadius: 20, marginBottom: 16 }}
              resizeMode="cover"
            />

            <HStack className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
              <Box className="bg-[#1E3A0A] rounded-full px-3 py-1">
                <Text className="text-[#84CC16] text-xs font-semibold">{donation.categoria}</Text>
              </Box>
              {donation.perecivel && (
                <Box
                  className="border rounded-full px-3 py-1"
                  style={{ backgroundColor: "rgba(127,29,29,0.2)", borderColor: "rgba(127,29,29,0.4)" }}
                >
                  <Text className="text-red-400 text-xs font-semibold">Perecível</Text>
                </Box>
              )}
              <Box className="bg-[#27272A] rounded-full px-3 py-1 flex-row items-center" style={{ gap: 5 }}>
                <FontAwesome5 name={tipoRetiradaIcon} size={10} color="#A1A1AA" />
                <Text className="text-[#A1A1AA] text-xs">{tipoRetiradaLabel}</Text>
              </Box>
            </HStack>

            <Box className="bg-[#141416] rounded-2xl p-4 mb-3">
              <HStack style={{ gap: 16 }}>
                <InfoCell icon="weight" label="Quantidade" value={donation.quantidade} />
                <Box className="w-px bg-[#27272A]" />
                <InfoCell icon="calendar-alt" label="Validade" value={donation.validade} />
              </HStack>
            </Box>

            <Box className="bg-[#141416] rounded-2xl px-4 py-3 mb-3">
              <HStack className="flex-row items-center" style={{ gap: 10 }}>
                <FontAwesome5 name="map-marker-alt" size={14} color="#65A30D" />
                <VStack className="flex-1">
                  <Text className="text-white text-sm" numberOfLines={2}>
                    {donation.localizacao || "Localização não informada"}
                  </Text>
                  {distanceText && (
                    <Text className="text-[#84CC16] text-xs mt-1 font-semibold">
                      {distanceText}
                    </Text>
                  )}
                </VStack>
              </HStack>
            </Box>

            <Box className="bg-[#141416] rounded-2xl px-4 py-3 mb-4">
              <HStack className="flex-row items-center" style={{ gap: 10 }}>
                <FontAwesome5 name="calendar-check" size={14} color="#65A30D" />
                <Text className="text-white text-sm">{donation.dataRetirada}</Text>
                <Text className="text-[#52525B]">·</Text>
                <FontAwesome5 name="clock" size={12} color="#65A30D" />
                <Text className="text-white text-sm">
                  {donation.horarioInicio} – {donation.horarioFim}
                </Text>
              </HStack>
            </Box>

            {!!donation.descricao && (
              <Box className="mb-4">
                <Text className="text-[#71717A] text-xs mb-1.5 uppercase tracking-widest">Descrição</Text>
                <Text className="text-white text-sm leading-6">{donation.descricao}</Text>
              </Box>
            )}

            {!!donation.observacoes && (
              <Box className="mb-4">
                <Text className="text-[#71717A] text-xs mb-1.5 uppercase tracking-widest">Observações</Text>
                <Text className="text-white text-sm leading-6">{donation.observacoes}</Text>
              </Box>
            )}

            <Box className="h-px bg-[#27272A] my-4" />

            {loadingDonor ? (
              <ActivityIndicator size="small" color="#65A30D" />
            ) : (
              <HStack className="flex-row items-center" style={{ gap: 12 }}>
                <Box className="w-11 h-11 rounded-full bg-[#1E3A0A] items-center justify-center overflow-hidden">
                  {donorProfile?.fotoPerfil ? (
                    <Image
                      source={{ uri: donorProfile.fotoPerfil }}
                      style={{ width: 44, height: 44 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <FontAwesome5 name="user" size={18} color="#84CC16" />
                  )}
                </Box>
                <VStack>
                  <Text className="text-[#71717A] text-xs uppercase tracking-widest">Doador</Text>
                  <Text className="text-white text-base font-semibold">
                    {donorProfile?.nome || "Doador"}
                  </Text>
                </VStack>
              </HStack>
            )}

            {canClaim && (
              <>
                <Box className="h-px bg-[#27272A] my-4" />
                <Text className="text-[#71717A] text-xs mb-3 uppercase tracking-widest">
                  Agendar retirada
                </Text>

                <HStack style={{ gap: 12 }}>
                  <Box className="flex-1">
                    <Text className="text-[#A1A1AA] text-xs mb-2">Data</Text>
                    <HStack className="items-center bg-[#27272A] rounded-xl px-3 h-12 border border-[#3F3F46]">
                      <FontAwesome5 name="calendar-alt" size={12} color="#65A30D" />
                      <TextInput
                        value={dataAgendada}
                        onChangeText={(t) => setDataAgendada(formatarData(t))}
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor="#52525B"
                        keyboardType="numeric"
                        maxLength={10}
                        style={{ flex: 1, color: "white", marginLeft: 8, fontSize: 14 }}
                      />
                    </HStack>
                  </Box>

                  <Box className="flex-1">
                    <Text className="text-[#A1A1AA] text-xs mb-2">Horário</Text>
                    <HStack className="items-center bg-[#27272A] rounded-xl px-3 h-12 border border-[#3F3F46]">
                      <FontAwesome5 name="clock" size={12} color="#65A30D" />
                      <TextInput
                        value={horarioAgendado}
                        onChangeText={(t) => setHorarioAgendado(formatarHorario(t))}
                        placeholder="HH:MM"
                        placeholderTextColor="#52525B"
                        keyboardType="numeric"
                        maxLength={5}
                        style={{ flex: 1, color: "white", marginLeft: 8, fontSize: 14 }}
                      />
                    </HStack>
                  </Box>
                </HStack>

                <Text className="text-[#52525B] text-xs mt-2">
                  Disponível de {donation.horarioInicio} às {donation.horarioFim}
                </Text>
              </>
            )}
          </ScrollView>

          <Box className="px-5 pt-3" style={{ paddingBottom: tabBarHeight + 12 }}>
            {isOwnDonation ? (
              <Box className="bg-[#27272A] rounded-2xl h-14 items-center justify-center">
                <Text className="text-[#71717A] text-base">Sua doação</Text>
              </Box>
            ) : canClaim ? (
              <TouchableOpacity
                onPress={handleReivindicarPress}
                disabled={reivindicando || !isScheduleValid}
                activeOpacity={isScheduleValid ? 0.8 : 1}
              >
                <Box
                  className={`rounded-2xl h-14 items-center justify-center ${
                    isScheduleValid ? "bg-[#65A30D]" : "bg-[#27272A]"
                  }`}
                >
                  {reivindicando ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text
                      className={`font-semibold text-base ${
                        isScheduleValid ? "text-white" : "text-[#71717A]"
                      }`}
                    >
                      {isScheduleValid ? "Reivindicar doação" : "Preencha data e horário"}
                    </Text>
                  )}
                </Box>
              </TouchableOpacity>
            ) : isClaimed ? (
              <Box className="bg-[#27272A] rounded-2xl h-14 items-center justify-center">
                <Text className="text-[#71717A] text-base">Já reivindicada</Text>
              </Box>
            ) : (
              <Box className="bg-[#27272A] rounded-2xl h-14 items-center justify-center">
                <Text className="text-[#71717A] text-base">Doação indisponível</Text>
              </Box>
            )}
          </Box>
        </KeyboardAvoidingView>
      )}

      <Modal
        visible={termoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTermoModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
          onPress={() => setTermoModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: "#111615",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              padding: 24,
              maxHeight: "85%",
            }}
            onPress={() => {}}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "600", marginBottom: 4 }}>
              Termo de aceite para doações
            </Text>
            <Text style={{ color: "#A3A3A3", fontSize: 13, marginBottom: 16 }}>
              Leia antes de solicitar uma doação. Este aceite é válido para todas as solicitações futuras.
            </Text>

            <ScrollView
              style={{
                backgroundColor: "#0D120F",
                borderRadius: 16,
                padding: 16,
                maxHeight: 300,
                marginBottom: 20,
              }}
              showsVerticalScrollIndicator
            >
              <Text style={{ color: "#E5E7EB", fontSize: 13, lineHeight: 22 }}>
                {TERMO_DOACAO}
              </Text>
            </ScrollView>

            <HStack className="flex-row items-center justify-between mb-5">
              <VStack style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "500" }}>
                  Li e concordo com os termos
                </Text>
                <Text style={{ color: "#A3A3A3", fontSize: 12, marginTop: 2 }}>
                  Este aceite será salvo para solicitações futuras.
                </Text>
              </VStack>
              <Switch
                value={termoAceito}
                onValueChange={setTermoAceito}
                trackColor={{ false: "#1F2A18", true: "rgba(101,201,15,0.4)" }}
                thumbColor={termoAceito ? "#65C90F" : "#A1A1AA"}
                ios_backgroundColor="#1F2A18"
              />
            </HStack>

            <Pressable
              onPress={handleConfirmarTermo}
              disabled={!termoAceito}
              style={{
                height: 52,
                borderRadius: 16,
                backgroundColor: termoAceito ? "#65C90F" : "#1F2A18",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: termoAceito ? "#081106" : "#A3A3A3", fontSize: 16, fontWeight: "600" }}>
                Confirmar e solicitar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTermoModalVisible(false)}
              style={{ height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#A3A3A3", fontSize: 15 }}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}