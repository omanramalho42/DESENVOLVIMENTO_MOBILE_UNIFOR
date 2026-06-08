import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useNotificationsStore } from "@/store/notifications.store";

const notificationsSchema = z.object({
  allowNotifications: z.boolean(),
});

type NotificationsSchemaType = z.infer<typeof notificationsSchema>;

interface ShowNotificationsDialogProps {
  trigger?: React.ReactNode;
  loading?: boolean;
  onSuccessCallback?: () => void;
}

export const ShowNotificationsDialog: React.FC<
  ShowNotificationsDialogProps
> = ({ trigger, loading, onSuccessCallback }) => {
  const [open, setOpen] = useState(false);

  const {
    notifications,
    settings,
    markAsRead,
    markAllAsRead,
    updateSettings,

    // Funções globais
    notifyDonationNearby,
    notifyDonationAccepted,
    notifyDonationCreated,
  } = useNotificationsStore();

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const { control, handleSubmit } = useForm<NotificationsSchemaType>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      allowNotifications: settings.allowNotifications,
    },
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (data: NotificationsSchemaType) => {
      updateSettings({
        allowNotifications: data.allowNotifications,
      });

      return data;
    },

    onSuccess: () => {
      setOpen(false);
      onSuccessCallback?.();
    },
  });

  const onSubmit = (data: NotificationsSchemaType) => {
    savePreferencesMutation.mutate(data);
  };

  return (
    <>
      {trigger || (
        <Pressable
          onPress={() => setOpen(true)}
          disabled={loading}
          className="relative"
        >
          <MaterialCommunityIcons
            name={unreadCount > 0 ? "bell-badge" : "bell-outline"}
            size={24}
            color={unreadCount > 0 ? "#65C90F" : "#A3A3A3"}
          />

          {unreadCount > 0 && (
            <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#65C90F]">
              <Text className="text-[10px] font-bold text-black">
                {unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-center bg-black/70 px-6">
          <Pressable
            className="absolute inset-0"
            onPress={() => setOpen(false)}
          />

          <View className="rounded-[24px] border border-[#1F2937] bg-black px-6 py-5">
            {/* HEADER */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[20px] font-semibold text-white">
                  Notificações
                </Text>

                <Text className="mt-1 text-sm text-[#A3A3A3]">
                  {unreadCount} não lidas
                </Text>
              </View>

              <Pressable onPress={() => setOpen(false)}>
                <Text className="text-[22px] text-[#A3A3A3]">×</Text>
              </Pressable>
            </View>

            {/* CONFIGURAÇÕES */}
            <View className="mt-5">
              <Controller
                control={control}
                name="allowNotifications"
                render={({ field: { value, onChange } }) => (
                  <View className="flex-row items-center justify-between rounded-xl border border-[#27303A] p-4">
                    <Text className="text-white">Receber notificações</Text>

                    <Switch value={value} onValueChange={onChange} />
                  </View>
                )}
              />
            </View>

            {/* AÇÕES DE TESTE */}
            {/* {__DEV__ && (
              <View className="mt-4 gap-2">
                <Pressable
                  className="rounded-xl bg-[#1F2937] p-3"
                  onPress={() =>
                    notifyDonationNearby("123", "Frutas Frescas", "500m")
                  }
                >
                  <Text className="text-center text-white">
                    Simular Doação Próxima
                  </Text>
                </Pressable>

                <Pressable
                  className="rounded-xl bg-[#1F2937] p-3"
                  onPress={() => notifyDonationAccepted("Pães Caseiros")}
                >
                  <Text className="text-center text-white">
                    Simular Aceitação
                  </Text>
                </Pressable>

                <Pressable
                  className="rounded-xl bg-[#1F2937] p-3"
                  onPress={() =>
                    notifyDonationCreated(
                      "Legumes Orgânicos",
                      "Disponível agora",
                    )
                  }
                >
                  <Text className="text-center text-white">
                    Simular Nova Doação
                  </Text>
                </Pressable>
              </View>
            )} */}

            {/* LISTA */}
            <ScrollView
              className="mt-5 max-h-[300px]"
              showsVerticalScrollIndicator={false}
            >
              {notifications.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => markAsRead(item.id)}
                  className={`mb-3 rounded-xl border p-4 ${
                    item.isRead ? "border-[#1F2937]" : "border-[#65C90F]"
                  }`}
                >
                  <Text className="font-semibold text-white">{item.title}</Text>

                  <Text className="mt-1 text-[#A3A3A3]">
                    {item.description}
                  </Text>

                  <Text className="mt-2 text-xs text-[#71717A]">
                    {item.createdAt}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* FOOTER */}
            <View className="mt-6 flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center rounded-2xl border border-[#27303A] px-4 py-4"
                onPress={markAllAsRead}
              >
                <Text className="text-white">Marcar todas</Text>
              </Pressable>

              <Pressable
                className="flex-1 items-center justify-center rounded-2xl bg-[#65C90F] px-4 py-4"
                onPress={handleSubmit(onSubmit)}
              >
                <Text className="font-semibold text-[#071100]">Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
