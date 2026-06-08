import { useNotificationsStore } from "@/store/notifications.store";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from "react-native";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "Nova doação por perto! 🍎",
    description:
      "Um lote de frutas frescas foi cadastrado a apenas 500 metros da sua localização.",
    createdAt: "10 min atrás",
    isRead: false,
  },
  {
    id: "2",
    title: "Solicitação Aceita 🎉",
    description:
      "Sua solicitação para os Pães Caseiros foi aprovada pelo doador.",
    createdAt: "1 hora atrás",
    isRead: false,
  },
  {
    id: "3",
    title: "Lembrete de Retirada ⏰",
    description:
      "Não se esqueça de buscar as verduras hoje até as 18h para evitar o cancelamento da reserva.",
    createdAt: "Ontem",
    isRead: true,
  },
  {
    id: "4",
    title: "Nova oportunidade disponível 🥦",
    description:
      "Um novo doador disponibilizou hortaliças frescas próximas à sua região.",
    createdAt: "2 dias atrás",
    isRead: true,
  },
];

const NotificacoesScreen = () => {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const unreadCount = useNotificationsStore(
    (state) => state.notifications.filter((n) => !n.isRead).length,
  );

  const filteredNotifications = useMemo(() => {
    if (!showUnreadOnly) return notifications;

    return notifications.filter((item) => !item.isRead);
  }, [notifications, showUnreadOnly]);

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isRead: !item.isRead,
            }
          : item,
      ),
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        isRead: true,
      })),
    );
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Pressable
      onPress={() => handleToggleRead(item.id)}
      className={`mb-3 rounded-2xl border p-4 ${
        item.isRead
          ? "bg-[#141414] border-[#1F2937]"
          : "bg-[#17220E] border-[#65C90F]"
      }`}
    >
      <View className="flex-row">
        <View className="mr-3 mt-1">
          <View
            className={`h-3 w-3 rounded-full ${
              item.isRead ? "bg-[#525252]" : "bg-[#65C90F]"
            }`}
          />
        </View>

        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text
              className={`flex-1 text-base ${
                item.isRead ? "text-[#D4D4D4]" : "text-white font-semibold"
              }`}
            >
              {item.title}
            </Text>

            <Text className="ml-3 text-xs text-[#A3A3A3]">
              {item.createdAt}
            </Text>
          </View>

          <Text className="mt-2 text-sm leading-5 text-[#BDBDBD]">
            {item.description}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View className="border-b border-[#1F2937] px-5 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </Pressable>

          <Text className="text-xl font-bold text-white">Notificações</Text>

          <View />
        </View>

        <Text className="mt-2 text-sm text-[#A3A3A3]">
          Você possui {unreadCount} notificações não lidas
        </Text>
      </View>

      {/* FILTROS */}
      <View className="flex-row gap-3 px-5 py-4">
        <Pressable
          onPress={() => setShowUnreadOnly(false)}
          className={`rounded-xl px-4 py-2 ${
            !showUnreadOnly ? "bg-[#65C90F]" : "border border-[#27303A]"
          }`}
        >
          <Text
            className={
              !showUnreadOnly ? "font-semibold text-black" : "text-white"
            }
          >
            Todas
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowUnreadOnly(true)}
          className={`rounded-xl px-4 py-2 ${
            showUnreadOnly ? "bg-[#65C90F]" : "border border-[#27303A]"
          }`}
        >
          <Text
            className={
              showUnreadOnly ? "font-semibold text-black" : "text-white"
            }
          >
            Não lidas
          </Text>
        </Pressable>

        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllAsRead} className="ml-auto">
            <Text className="font-medium text-[#65C90F]">Marcar todas</Text>
          </Pressable>
        )}
      </View>

      {/* LISTA */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 30,
          flexGrow: filteredNotifications.length === 0 ? 1 : undefined,
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center">
            <MaterialCommunityIcons
              name="bell-off-outline"
              size={60}
              color="#525252"
            />

            <Text className="mt-4 text-lg font-medium text-[#A3A3A3]">
              Nenhuma notificação encontrada
            </Text>

            <Text className="mt-2 text-center text-sm text-[#737373]">
              Quando novas notificações chegarem, elas aparecerão aqui.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default NotificacoesScreen;
