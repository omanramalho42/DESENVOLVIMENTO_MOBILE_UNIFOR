import { Box, HStack, Text, VStack } from "@/components/ui";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, TouchableOpacity } from "react-native";

// Tipagem para simular as notificações
export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
};

type ShowNotificationsDialogProps = {
  trigger?: React.ReactNode;
  onSuccessCallback?: () => void;
};

export const ShowNotificationsDialog = ({
  trigger,
  onSuccessCallback,
}: ShowNotificationsDialogProps) => {
  const [open, setOpen] = useState(false);

  // Hook de estado local simulando o banco de dados de notificações
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "Nova doação por perto! 🍎",
      description: "Um lote de frutas frescas foi cadastrado a 500m de você.",
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
      description: "Não se esqueça de buscar as verduras hoje até as 18h.",
      createdAt: "Ontem",
      isRead: true,
    },
  ]);

  // Computa se existem notificações não lidas para o Badge do Sino
  const hasUnread = notifications.some((n) => !n.isRead);

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n)),
    );
    if (onSuccessCallback) onSuccessCallback();
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (onSuccessCallback) onSuccessCallback();
  };

  const handleOpenFullPage = () => {
    setOpen(false);
    // Redireciona para a tela dedicada de notificações
    router.push("/(tabs)/notificacoes" as any);
  };

  return (
    <>
      {/* TRIGGER CONTROLLER */}
      {trigger ? (
        <TouchableOpacity activeOpacity={0.7} onPress={() => setOpen(true)}>
          {trigger}
        </TouchableOpacity>
      ) : (
        // Trigger Padrão (Sino com Badge Dinâmico) caso não venha por propriedade
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setOpen(true)}
          className="relative p-2"
        >
          <MaterialCommunityIcons
            name={hasUnread ? "bell-badge" : "bell-outline"}
            size={24}
            color={hasUnread ? "#65C90F" : "#A3A3A3"}
          />
          {hasUnread && (
            <Box className="absolute right-2 top-2 w-2.5 h-2.5 bg-[#65C90F] rounded-full border border-[#0B0F0C]" />
          )}
        </TouchableOpacity>
      )}

      {/* DIALOG DE NOTIFICAÇÕES */}
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <ModalBackdrop />
        <ModalContent className="bg-[#141416] border border-[#1E1E21] rounded-[28px] mx-4 max-h-[80%]">
          <ModalHeader className="pt-6 px-4 flex-row justify-between items-center border-b border-[#1E1E21] pb-3">
            <VStack>
              <Text className="text-white text-lg font-bold">Notificações</Text>
              <Text className="text-[#A1A1AA] text-xs">
                As mais recentes primeiro
              </Text>
            </VStack>
            {hasUnread && (
              <TouchableOpacity onPress={handleMarkAllAsRead}>
                <Text className="text-[#65C90F] text-xs font-semibold">
                  Limpar não lidas
                </Text>
              </TouchableOpacity>
            )}
          </ModalHeader>

          <ModalBody className="p-0">
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="px-4 py-2"
            >
              {notifications.length === 0 ? (
                <Box className="items-center justify-center py-12">
                  <MaterialCommunityIcons
                    name="bell-off-outline"
                    size={32}
                    color="#71717A"
                  />
                  <Text className="text-[#71717A] text-sm mt-2">
                    Nenhuma notificação por aqui.
                  </Text>
                </Box>
              ) : (
                notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.9}
                    onPress={() => handleToggleRead(item.id)}
                    className={`py-3.5 border-b border-[#1E1E21]/50 flex-row items-start gap-x-3`}
                  >
                    {/* Indicador de Bolinha Verde para Não Lidas */}
                    <Box className="pt-1.5">
                      <Box
                        className={`w-2 h-2 rounded-full ${
                          item.isRead ? "bg-transparent" : "bg-[#65C90F]"
                        }`}
                      />
                    </Box>

                    <VStack className="flex-1">
                      <HStack className="justify-between items-baseline mb-0.5">
                        <Text
                          className={`text-sm flex-1 mr-2 ${
                            item.isRead
                              ? "text-[#A1A1AA]"
                              : "text-white font-semibold"
                          }`}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text className="text-[#71717A] text-[11px]">
                          {item.createdAt}
                        </Text>
                      </HStack>
                      <Text
                        className={`text-xs ${
                          item.isRead ? "text-[#71717A]" : "text-[#A1A1AA]"
                        }`}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    </VStack>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </ModalBody>

          <ModalFooter className="flex-col pb-6 pt-3 px-4 border-t border-[#1E1E21]">
            <TouchableOpacity
              onPress={handleOpenFullPage}
              className="w-full bg-[#1E3A0A] h-11 rounded-xl flex-row items-center justify-center border border-[#27272A]/30"
            >
              <Text className="text-[#65C90F] font-semibold text-sm mr-2">
                Ver todas as notificações
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={16}
                color="#65C90F"
              />
            </TouchableOpacity>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
