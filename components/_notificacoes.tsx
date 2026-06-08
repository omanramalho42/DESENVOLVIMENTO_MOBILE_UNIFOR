import {
  buscarNotificacoesDoUsuario,
  contarNotificacoesNaoLidas,
  marcarNotificacaoComoLida,
} from "@/services";
import { AppNotificationDocument } from "@/types";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function NotificacoesButton() {
  const [notificacoes, setNotificacoes] = useState<(AppNotificationDocument & { id: string })[]>([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [selecionada, setSelecionada] = useState<(AppNotificationDocument & { id: string }) | null>(null);
  const [modalMotivoVisivel, setModalMotivoVisivel] = useState(false);

  const carregar = useCallback(async () => {
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const [lista, count] = await Promise.all([
      buscarNotificacoesDoUsuario(user.uid),
      contarNotificacoesNaoLidas(user.uid),
    ]);
    setNotificacoes(lista);
    setNaoLidas(count);
  }, []);

  useEffect(() => {
    carregar();
    const interval = setInterval(carregar, 15000);
    return () => clearInterval(interval);
  }, [carregar]);

  const handlePress = async (notif: AppNotificationDocument & { id: string }) => {
    if (!notif.lida) {
      await marcarNotificacaoComoLida(notif.id);
      setNotificacoes((prev) => prev.map((n) => (n.id === notif.id ? { ...n, lida: true } : n)));
      setNaoLidas((prev) => Math.max(0, prev - 1));
    }

    if (notif.tipo === "rejeitada" && notif.motivoRecusa) {
      setSelecionada(notif);
      setModalMotivoVisivel(true);
      return;
    }

    setModalVisivel(false);

    if (notif.tipo === "reivindicacao") {
      router.push("/(tabs)/solicitacoes-recebidas" as any);
    } else {
      router.push("/(tabs)/historico" as any);
    }
  };

  const getIcon = (tipo: AppNotificationDocument["tipo"]) => {
    switch (tipo) {
      case "reivindicacao":
        return { name: "bell-outline" as const, color: "#FACC15" };
      case "aprovada":
        return { name: "check-circle-outline" as const, color: "#7DE11B" };
      case "rejeitada":
        return { name: "close-circle-outline" as const, color: "#F87171" };
      case "concluida":
        return { name: "check-circle" as const, color: "#4ADE80" };
      case "cancelada":
        return { name: "minus-circle-outline" as const, color: "#D1D5DB" };
      default:
        return { name: "bell-outline" as const, color: "#A3A3A3" };
    }
  };

  return (
    <>
      <Pressable
        className="h-10 w-10 items-center justify-center"
        onPress={() => {
          carregar();
          setModalVisivel(true);
        }}
      >
        <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        {naoLidas > 0 && (
          <View className="absolute -right-[2px] -top-[2px] min-w-[18px] h-[18px] rounded-full border border-black bg-[#F87171] items-center justify-center px-1">
            <Text className="text-[10px] font-bold text-white">
              {naoLidas > 9 ? "9+" : naoLidas}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Modal de Notificações */}
      <Modal
        visible={modalVisivel}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisivel(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="absolute inset-0" onPress={() => setModalVisivel(false)} />
          <View className="overflow-hidden rounded-t-[28px] border-t border-white/10 bg-[#111615] max-h-[80%]">
            <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
              <Text className="text-[20px] font-semibold text-white">Notificações</Text>
              <Pressable onPress={() => setModalVisivel(false)} className="h-10 w-10 items-center justify-center">
                <Feather name="x" size={22} color="#A3A3A3" />
              </Pressable>
            </View>

            {notificacoes.length === 0 ? (
              <View className="items-center justify-center py-16">
                <View className="w-16 h-16 rounded-full bg-[#18181B] items-center justify-center mb-4">
                  <Ionicons name="notifications-off-outline" size={28} color="#71717A" />
                </View>
                <Text className="text-[16px] font-semibold text-white">Nenhuma notificação</Text>
                <Text className="mt-2 px-10 text-center text-[13px] text-[#71717A]">
                  Você não tem notificações no momento.
                </Text>
              </View>
            ) : (
              <ScrollView className="px-5 pb-6" showsVerticalScrollIndicator={false}>
                {notificacoes.map((notif) => {
                  const icon = getIcon(notif.tipo);
                  return (
                    <Pressable
                      key={notif.id}
                      onPress={() => handlePress(notif)}
                      className={`flex-row items-start rounded-[18px] border px-4 py-4 mb-3 ${
                        notif.lida
                          ? "border-white/5 bg-[#0D120F]"
                          : "border-[#65C90F]/20 bg-[#65C90F]/5"
                      }`}
                    >
                      <View
                        className="h-10 w-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: `${icon.color}15` }}
                      >
                        <MaterialCommunityIcons name={icon.name} size={20} color={icon.color} />
                      </View>
                      <View className="flex-1 pr-2">
                        <Text className="text-[14px] font-semibold text-white">{notif.titulo}</Text>
                        <Text className="text-[13px] text-[#A3A3A3] mt-[2px]">{notif.mensagem}</Text>
                        {notif.tipo === "rejeitada" && (
                          <Text className="text-[12px] text-[#F87171] mt-1">Toque para ver o motivo</Text>
                        )}
                      </View>
                      {!notif.lida && <View className="h-[8px] w-[8px] rounded-full bg-[#65C90F] mt-2" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de motivo da rejeição */}
      <Modal
        visible={modalMotivoVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalMotivoVisivel(false)}
      >
        <View className="flex-1 justify-end bg-black/60 px-4 pb-6">
          <Pressable className="absolute inset-0" onPress={() => setModalMotivoVisivel(false)} />
          <View className="overflow-hidden rounded-[24px] border border-white/10 bg-[#111615] px-5 pb-5 pt-5">
            <Text className="text-[18px] font-semibold text-white">Motivo da rejeição</Text>
            <Text className="mt-1 text-[13px] text-[#A3A3A3]">
              Sua solicitação foi rejeitada pelo seguinte motivo:
            </Text>
            <View className="mt-4 rounded-[16px] border border-[#F87171]/20 bg-[#F87171]/5 px-4 py-4">
              <Text className="text-[15px] text-[#F87171] font-semibold">
                {selecionada?.motivoRecusa || "Não informado"}
              </Text>
            </View>
            <Pressable
              onPress={() => setModalMotivoVisivel(false)}
              className="mt-4 h-12 items-center justify-center rounded-[18px] bg-[#65C90F]"
            >
              <Text className="text-[15px] font-semibold text-[#081106]">Entendi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
