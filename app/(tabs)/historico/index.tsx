import NotificacoesButton from "@/components/_notificacoes";
import useAuth from "@/hooks/_useAuth";
import {
  db,
  marcarColetaReceptor,
  marcarEntregaDoador,
} from "@/services";
import { useLoading, useUser } from "@/store";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AbaHistorico = "doador" | "receptor";

type DonationHistory = {
  id: string;
  solicitacaoId?: string;
  tipoAlimento?: string;
  categoria?: string;
  quantidade?: string;
  descricao?: string;
  validade?: string;
  localizacao?: string;
  disponibilidade?: string;
  dataRetirada?: string;
  horarioInicio?: string;
  horarioFim?: string;
  tipoRetirada?: string;
  status?: string;
  donorId?: string;
  reivindicadoPor?: string;
  coletadoPeloReceptor?: boolean;
  coletadoPeloDoador?: boolean;
  fotos?: any[];
  createdAt?: any;
};

const GREEN = "#65C90F";

const filtrosDoador = [
  { label: "Todos", value: "todos" },
  { label: "Em análise", value: "em_analise" },
  { label: "Aprovado", value: "aprovado" },
  { label: "Concluído", value: "concluido" },
  { label: "Rejeitado", value: "rejeitado" },
  { label: "Cancelado", value: "cancelado" },
  { label: "Disponível", value: "disponivel" },
];

const filtrosReceptor = [
  { label: "Todos", value: "todos" },
  { label: "Em análise", value: "em_analise" },
  { label: "Aprovado", value: "aprovado" },
  { label: "Concluído", value: "concluido" },
  { label: "Rejeitado", value: "rejeitado" },
  { label: "Cancelado", value: "cancelado" },
];

const normalizarStatus = (status?: string) => {
  const value = String(status || "").trim().toLowerCase();

  if (["em analise", "em_análise", "em análise", "pendente", "em_analise"].includes(value)) {
    return "em_analise";
  }

  if (["aprovado", "aprovada"].includes(value)) {
    return "aprovado";
  }

  if (["rejeitado", "rejeitada"].includes(value)) {
    return "rejeitado";
  }

  if (["cancelado", "cancelada"].includes(value)) {
    return "cancelado";
  }

  if (["disponivel", "disponível"].includes(value)) {
    return "disponivel";
  }

  if (["concluido", "concluído", "concluida", "concluída"].includes(value)) {
    return "concluido";
  }

  return value || "em_analise";
};

const statusLabel = (status?: string) => {
  const value = normalizarStatus(status);

  const labels: Record<string, string> = {
    em_analise: "Em análise",
    aprovado: "Aprovado",
    concluido: "Concluído",
    rejeitado: "Rejeitado",
    cancelado: "Cancelado",
    disponivel: "Disponível",
  };

  return labels[value] ?? "Em análise";
};

const statusStyle = (status?: string) => {
  const value = normalizarStatus(status);

  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    em_analise: {
      bg: "rgba(250, 204, 21, 0.13)",
      text: "#FACC15",
      icon: "clock-outline",
    },
    aprovado: {
      bg: "rgba(101, 201, 15, 0.14)",
      text: "#7DE11B",
      icon: "check-circle-outline",
    },
    rejeitado: {
      bg: "rgba(248, 113, 113, 0.13)",
      text: "#F87171",
      icon: "close-circle-outline",
    },
    cancelado: {
      bg: "rgba(156, 163, 175, 0.14)",
      text: "#D1D5DB",
      icon: "minus-circle-outline",
    },
    disponivel: {
      bg: "rgba(59, 130, 246, 0.13)",
      text: "#60A5FA",
      icon: "gift-outline",
    },
    concluido: {
      bg: "rgba(34, 197, 94, 0.13)",
      text: "#4ADE80",
      icon: "check-circle",
    },
  };

  return styles[value] ?? styles.em_analise;
};

const getImagem = (fotos?: any[]) => {
  if (!Array.isArray(fotos) || fotos.length === 0) return null;

  const primeira = fotos[0];

  if (typeof primeira === "string") return primeira;
  if (primeira?.secureUrl) return primeira.secureUrl;
  if (primeira?.url) return primeira.url;
  if (primeira?.uri) return primeira.uri;

  return null;
};

export default function HistoricoDoacoes() {
  const { user, initializing } = useAuth();

  const isDoador = useUser((s) => s.isDoador);
  const [aba, setAba] = useState<AbaHistorico>("receptor");
  const [filtro, setFiltro] = useState("todos");
  const [doacoesDoador, setDoacoesDoador] = useState<DonationHistory[]>([]);
  const [doacoesReceptor, setDoacoesReceptor] = useState<DonationHistory[]>([]);
  const { startLoading, stopLoading } = useLoading();
  const [refreshing, setRefreshing] = useState(false);

  const filtros = aba === "doador" ? filtrosDoador : filtrosReceptor;

  const [modalItem, setModalItem] = useState<DonationHistory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [processandoAcao, setProcessandoAcao] = useState(false);

  const abrirModal = (item: DonationHistory) => {
    setModalItem(item);
    setModalVisible(true);
  };

  const handleMarcarColetaReceptor = async (item: DonationHistory) => {
    if (!item.solicitacaoId) return;
    Alert.alert(
      "Confirmar coleta",
      "Você confirma que já coletou esta doação?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setProcessandoAcao(true);
              await marcarColetaReceptor(item.solicitacaoId!);
              await carregarHistorico();
              setModalVisible(false);
              Alert.alert("Sucesso", "Coleta confirmada! Aguardando confirmação do doador.");
            } catch {
              Alert.alert("Erro", "Não foi possível confirmar a coleta.");
            } finally {
              setProcessandoAcao(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmarEntregaDoador = async (item: DonationHistory) => {
    if (!item.solicitacaoId) return;
    Alert.alert(
      "Confirmar entrega",
      "Você confirma que entregou esta doação?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setProcessandoAcao(true);
              await marcarEntregaDoador(item.solicitacaoId!);
              await carregarHistorico();
              setModalVisible(false);
              Alert.alert("Sucesso", "Entrega confirmada! Doação concluída.");
            } catch (err: any) {
              Alert.alert("Erro", err?.message || "Não foi possível confirmar a entrega.");
            } finally {
              setProcessandoAcao(false);
            }
          },
        },
      ]
    );
  };

  const carregarHistorico = useCallback(async () => {
    if (!user?.uid || !db) {
      setDoacoesDoador([]);
      setDoacoesReceptor([]);
      stopLoading();
      return;
    }

    try {
      const donationsRef = collection(db, "donations");
      const solicitacoesRef = collection(db, "solicitacoes");

      const [doadorDonationsSnap, doadorSolicitacoesSnap, receptorSolicitacoesSnap] =
        await Promise.all([
          getDocs(query(donationsRef, where("donorId", "==", user.uid))),
          getDocs(query(solicitacoesRef, where("doadorId", "==", user.uid))),
          getDocs(query(solicitacoesRef, where("solicitanteId", "==", user.uid))),
        ]);

      // mapa doacaoId → dados mais recentes da solicitação
      const solicitacaoMap = new Map<
        string,
        { status: string; id: string; coletadoPeloReceptor?: boolean; coletadoPeloDoador?: boolean }
      >();
      doadorSolicitacoesSnap.docs.forEach((docItem) => {
        const data = docItem.data();
        const existing = solicitacaoMap.get(data.doacaoId);
        // prefere status ativo (pendente/aprovada) sobre rejeitada
        if (!existing || data.status !== "rejeitada") {
          solicitacaoMap.set(data.doacaoId, {
            status: data.status,
            id: docItem.id,
            coletadoPeloReceptor: data.coletadoPeloReceptor,
            coletadoPeloDoador: data.coletadoPeloDoador,
          });
        }
      });

      const sortByDate = (a: DonationHistory, b: DonationHistory) =>
        (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);

      // aba doador: todas as doações + status real da solicitação
      const doadorHistory: DonationHistory[] = doadorDonationsSnap.docs
        .map((docItem) => {
          const sol = solicitacaoMap.get(docItem.id);
          return {
            id: docItem.id,
            ...(docItem.data() as Omit<DonationHistory, "id">),
            solicitacaoId: sol?.id,
            status: sol?.status ?? docItem.data().status,
            coletadoPeloReceptor: sol?.coletadoPeloReceptor,
            coletadoPeloDoador: sol?.coletadoPeloDoador,
          };
        })
        .sort(sortByDate);

      // aba receptor: solicitações feitas pelo usuário + dados completos da doação
      const receptorHistory: DonationHistory[] = (
        await Promise.all(
          receptorSolicitacoesSnap.docs.map(async (docItem) => {
            const sol = docItem.data();
            const doacaoSnap = sol.doacaoId
              ? await getDoc(doc(db!, "donations", sol.doacaoId))
              : null;
            const doacao = doacaoSnap?.exists() ? doacaoSnap.data() : null;

            return {
              id: doacaoSnap?.exists() ? doacaoSnap.id : docItem.id,
              solicitacaoId: docItem.id,
              tipoAlimento: doacao?.tipoAlimento ?? sol.doacaoTitulo,
              categoria: doacao?.categoria ?? sol.doacaoCategoria,
              quantidade: doacao?.quantidade ?? sol.doacaoQuantidade,
              validade: doacao?.validade ?? sol.doacaoValidade,
              localizacao: doacao?.localizacao,
              dataRetirada: doacao?.dataRetirada,
              horarioInicio: doacao?.horarioInicio,
              horarioFim: doacao?.horarioFim,
              tipoRetirada: doacao?.tipoRetirada,
              fotos: doacao?.fotos,
              status: sol.status,
              coletadoPeloReceptor: sol.coletadoPeloReceptor,
              coletadoPeloDoador: sol.coletadoPeloDoador,
              createdAt: sol.criadoEm,
            } as DonationHistory;
          }),
        )
      ).sort(sortByDate);

      setDoacoesDoador(doadorHistory);
      setDoacoesReceptor(receptorHistory);
    } catch (error) {
      console.log("ERRO AO CARREGAR HISTÓRICO:", error);
    } finally {
      stopLoading();
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (initializing) return;
    startLoading();
    carregarHistorico();
  }, [initializing, carregarHistorico]);

  const doacoesFiltradas = useMemo(() => {
    const lista = aba === "doador" ? doacoesDoador : doacoesReceptor;

    if (filtro === "todos") return lista;

    return lista.filter((item) => normalizarStatus(item.status) === filtro);
  }, [aba, filtro, doacoesDoador, doacoesReceptor]);

  const onRefresh = () => {
    setRefreshing(true);
    carregarHistorico();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050807]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
       <View className="px-5 pt-4">
       <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-[28px] font-bold">
            Histórico
          </Text>
          <Text className="text-[#A3A3A3] mt-1">
            Acompanhe suas doações realizadas e recebidas.
          </Text>
        </View>
        <NotificacoesButton />
      </View>

          <View className="flex-row bg-[#101514] border border-white/10 rounded-2xl p-1 mb-5">
            <Pressable
              onPress={() => {
                setAba("doador");
                setFiltro("todos");
              }}
              className={`flex-1 h-11 rounded-xl items-center justify-center ${
                aba === "doador" ? "bg-[#65C90F]" : ""
              }`}
            >
              <Text
                className={`font-semibold ${
                  aba === "doador" ? "text-[#081106]" : "text-[#A3A3A3]"
                }`}
              >
                Doador
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setAba("receptor");
                setFiltro("todos");
              }}
              className={`flex-1 h-11 rounded-xl items-center justify-center ${
                aba === "receptor" ? "bg-[#65C90F]" : ""
              }`}
            >
              <Text
                className={`font-semibold ${
                  aba === "receptor" ? "text-[#081106]" : "text-[#A3A3A3]"
                }`}
              >
                Receptor
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-5"
          >
            <View className="flex-row gap-2">
              {filtros.map((item) => {
                const active = filtro === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setFiltro(item.value)}
                    className={`px-4 h-10 rounded-full items-center justify-center border ${
                      active
                        ? "bg-[#65C90F] border-[#65C90F]"
                        : "bg-[#101514] border-white/10"
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-semibold ${
                        active ? "text-[#081106]" : "text-[#D1D5DB]"
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className="mb-4 rounded-[22px] border border-[#2B4F17] bg-[#101A0F] px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white text-[16px] font-semibold">
                  {aba === "doador"
                    ? "Doações abertas por você"
                    : "Doações recebidas"}
                </Text>
                <Text className="text-[#A3A3A3] text-[13px] mt-1">
                  {doacoesFiltradas.length} registro(s) encontrado(s)
                </Text>
              </View>

              <View className="w-11 h-11 rounded-full bg-[#18340D] items-center justify-center">
                <MaterialCommunityIcons
                  name={aba === "doador" ? "gift-outline" : "archive-outline"}
                  size={23}
                  color={GREEN}
                />
              </View>
            </View>
          </View>

          {aba === "doador" && !isDoador ? (
            <View className="items-center justify-center rounded-[28px] border border-white/10 bg-[#101514] px-6 py-12">
              <View className="w-16 h-16 rounded-full bg-[#18340D] items-center justify-center mb-4">
                <MaterialCommunityIcons name="leaf" size={32} color={GREEN} />
              </View>
              <Text className="text-white text-[20px] font-bold text-center">
                Você ainda não é doador
              </Text>
              <Text className="text-[#A3A3A3] text-center mt-2 mb-6">
                Cadastre-se como doador para começar a doar alimentos e acompanhar seu histórico aqui.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push("/(tabs)/become-donor" as any)}
                className="bg-[#65C90F] rounded-[18px] px-8 py-4 items-center justify-center"
              >
                <Text className="text-[#081106] text-[15px] font-semibold">
                  Tornar-se doador
                </Text>
              </TouchableOpacity>
            </View>
          ) : doacoesFiltradas.length === 0 ? (
            <View className="items-center justify-center rounded-[28px] border border-white/10 bg-[#101514] px-6 py-12">
              <View className="w-16 h-16 rounded-full bg-[#18340D] items-center justify-center mb-4">
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={32}
                  color={GREEN}
                />
              </View>
              <Text className="text-white text-[20px] font-bold text-center">
                Nenhum histórico encontrado
              </Text>
              <Text className="text-[#A3A3A3] text-center mt-2">
                Quando houver registros com esse filtro, eles aparecerão aqui.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {doacoesFiltradas.map((item) => (
                <HistoricoCard key={item.id} item={item} onPress={() => abrirModal(item)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60 px-4 pb-6">
          <Pressable
            className="absolute inset-0"
            onPress={() => setModalVisible(false)}
          />
          {modalItem && (
            <View className="overflow-hidden rounded-[24px] border border-white/10 bg-[#111615] px-5 pb-5 pt-5 max-h-[85%]">
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-[18px] font-semibold text-white flex-1 pr-2">
                    {modalItem.tipoAlimento || "Doação de alimento"}
                  </Text>
                  <View
                    className="px-3 py-1 rounded-full flex-row items-center"
                    style={{ backgroundColor: statusStyle(modalItem.status).bg }}
                  >
                    <MaterialCommunityIcons
                      name={statusStyle(modalItem.status).icon as any}
                      size={14}
                      color={statusStyle(modalItem.status).text}
                    />
                    <Text
                      className="text-[12px] font-semibold ml-1"
                      style={{ color: statusStyle(modalItem.status).text }}
                    >
                      {statusLabel(modalItem.status)}
                    </Text>
                  </View>
                </View>

                <View className="rounded-[18px] overflow-hidden bg-[#182018] border border-white/10 mb-4">
                  {getImagem(modalItem.fotos) ? (
                    <Image
                      source={{ uri: getImagem(modalItem.fotos)! }}
                      className="w-full h-40"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-40 items-center justify-center">
                      <MaterialCommunityIcons
                        name="food-apple-outline"
                        size={48}
                        color={GREEN}
                      />
                    </View>
                  )}
                </View>

                <View className="gap-3 mb-5">
                  <InfoLine
                    icon="tag-outline"
                    text={modalItem.categoria || "Categoria não informada"}
                  />
                  <InfoLine
                    icon="weight-kilogram"
                    text={modalItem.quantidade || "Quantidade não informada"}
                  />
                  <InfoLine
                    icon="calendar-outline"
                    text={modalItem.validade || "Validade não informada"}
                  />
                  <InfoLine
                    icon="map-marker-outline"
                    text={modalItem.localizacao || "Local não informado"}
                  />
                  <InfoLine
                    icon="clock-outline"
                    text={
                      modalItem.dataRetirada
                        ? `${modalItem.dataRetirada} ${modalItem.horarioInicio ? `(${modalItem.horarioInicio} - ${modalItem.horarioFim})` : ""}`
                        : "Data não informada"
                    }
                  />
                  <InfoLine
                    icon="truck-delivery-outline"
                    text={
                      modalItem.tipoRetirada === "doador"
                        ? "Entrega pelo doador"
                        : modalItem.tipoRetirada === "buscador"
                          ? "Retirada pelo receptor"
                          : "Tipo de retirada não informado"
                    }
                  />
                  {modalItem.descricao ? (
                    <InfoLine
                      icon="text-box-outline"
                      text={modalItem.descricao}
                    />
                  ) : null}
                </View>

                {aba === "receptor" &&
                  normalizarStatus(modalItem.status) === "aprovado" && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={processandoAcao}
                      onPress={() => handleMarcarColetaReceptor(modalItem)}
                      className="bg-[#65C90F] rounded-[18px] h-14 items-center justify-center mb-3"
                    >
                      <Text className="text-[#081106] text-[15px] font-semibold">
                        {processandoAcao
                          ? "Processando..."
                          : "Marcar como coletado"}
                      </Text>
                    </TouchableOpacity>
                  )}

                {normalizarStatus(modalItem.status) === "concluido" && (
                  <View className="rounded-[14px] border border-white/5 bg-[#0D120F] px-4 py-3 mb-3">
                    <Text className="text-[13px] text-[#4ADE80] text-center">
                      Doação concluída com sucesso!
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setModalVisible(false)}
                  className="h-12 items-center justify-center"
                >
                  <Text className="text-[15px] text-[#A3A3A3]">Fechar</Text>
                </Pressable>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
 );
}

function HistoricoCard({
  item,
  onPress,
  aba,
}: {
  item: DonationHistory;
  onPress: () => void;
  aba: AbaHistorico;
}) {
  const imagem = getImagem(item.fotos);
  const status = statusStyle(item.status);

  return (
    <Pressable
      onPress={onPress}
      className="rounded-[26px] border border-white/10 bg-[#101514] overflow-hidden"
      android_ripple={{ color: "rgba(255,255,255,0.05)" }}
    >
      <View className="flex-row p-4">
        <View className="w-[96px] h-[96px] rounded-[22px] overflow-hidden bg-[#182018] border border-white/10">
          {imagem ? (
            <Image
              source={{ uri: imagem }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <MaterialCommunityIcons
                name="food-apple-outline"
                size={34}
                color={GREEN}
              />
            </View>
          )}
        </View>

        <View className="flex-1 ml-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-white text-[18px] font-bold" numberOfLines={1}>
                {item.tipoAlimento || "Doação de alimento"}
              </Text>

              <Text className="text-[#A3A3A3] text-[13px] mt-1" numberOfLines={1}>
                {item.categoria || "Categoria não informada"}
              </Text>
            </View>

            <View
              className="px-3 py-1 rounded-full flex-row items-center"
              style={{ backgroundColor: status.bg }}
            >
              <MaterialCommunityIcons
                name={status.icon as any}
                size={14}
                color={status.text}
              />
              <Text
                className="text-[12px] font-semibold ml-1"
                style={{ color: status.text }}
              >
                {statusLabel(item.status)}
              </Text>
            </View>
          </View>

          <View className="mt-3 gap-2">
            <InfoLine
              icon="weight-kilogram"
              text={item.quantidade || "Quantidade não informada"}
            />

            <InfoLine
              icon="calendar-outline"
              text={item.disponibilidade || item.dataRetirada || "Data não informada"}
            />

            <InfoLine
              icon="map-marker-outline"
              text={item.localizacao || "Local não informado"}
            />
          </View>
        </View>
      </View>

      <View className="border-t border-white/5 px-4 py-3 flex-row items-center justify-between">
        <Text className="text-[#A3A3A3] text-[13px]">
          Retirada:{" "}
          <Text className="text-white font-semibold">
            {item.tipoRetirada === "doador"
              ? "pelo doador"
              : item.tipoRetirada === "buscador"
                ? "pelo buscador"
                : "não informado"}
          </Text>
        </Text>

        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color="#A3A3A3"
        />
      </View>
    </Pressable>
  );
}

function InfoLine({
  icon,
  text,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
}) {
  return (
    <View className="flex-row items-center">
      <MaterialCommunityIcons name={icon} size={16} color={GREEN} />
      <Text className="text-[#D1D5DB] text-[13px] ml-2 flex-1" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}