import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { NotificationType } from "@/types";

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  createdAt: string;
  isRead: boolean;
  donationId?: string;
}

interface NotificationSettings {
  allowNotifications: boolean;
}
interface NotifyDonationCreatedParams {
  donationId: string;
  donorName: string;
}
interface NotificationStore {
  notifications: Notification[];
  settings: NotificationSettings;

  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;

  updateSettings: (settings: Partial<NotificationSettings>) => void;

  notifyDonationCreated: (donorName: string, donationId: string) => void;
  notifyDonationNearby: (
    donationTitle: string,
    distance: string,
    donationId: string,
  ) => void;
  notifyDonationAccepted: (donationName: string) => void;

  notifyDonationReceived: (donationName: string) => void;

  notifyDonationCancelled: (donationName: string) => void;
}

export const useNotificationsStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],

      settings: {
        allowNotifications: true,
      },

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter(
            (notification) => notification.id !== id,
          ),
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === id
              ? {
                  ...notification,
                  isRead: true,
                }
              : notification,
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((notification) => ({
            ...notification,
            isRead: true,
          })),
        })),

      clearNotifications: () =>
        set({
          notifications: [],
        }),

      updateSettings: (settings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...settings,
          },
        })),

      notifyDonationCreated: (donorName, donationId) =>
        set((state) => ({
          notifications: [
            {
              id: crypto.randomUUID(),
              title: "Nova doação disponível 🍎",
              description: `${donorName} cadastrou uma nova doação.`,
              donationId,
              type: NotificationType.NEW_DONATION,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),

      notifyDonationAccepted: (donationName) =>
        set((state) => ({
          notifications: [
            {
              id: crypto.randomUUID(),
              title: "Solicitação aceita 🎉",
              description: `Sua solicitação para ${donationName} foi aceita.`,
              type: NotificationType.DONATION_ACCEPTED,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),

      notifyDonationReceived: (donationName) =>
        set((state) => ({
          notifications: [
            {
              id: crypto.randomUUID(),
              title: "Doação recebida ✅",
              description: `Você recebeu ${donationName}.`,
              type: NotificationType.DONATION_RECEIVED,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),
      notifyDonationNearby: (donationTitle, distance, donationId) =>
        set((state) => ({
          notifications: [
            {
              id: crypto.randomUUID(),
              title: "Nova doação por perto 🍎",
              description: `${donationTitle} disponível a ${distance} de você.`,
              donationId,
              type: NotificationType.NEW_DONATION,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),
      notifyDonationCancelled: (donationName) =>
        set((state) => ({
          notifications: [
            {
              id: crypto.randomUUID(),
              title: "Doação cancelada ⚠️",
              description: `${donationName} foi cancelada.`,
              type: NotificationType.DONATION_CANCELLED,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),
    }),
    {
      name: "notifications-storage",

      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
