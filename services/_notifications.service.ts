import { NotificationType } from "@/types";

import { useNotificationsStore } from "@/store/notifications.store";

export class NotificationService {
  static newDonation(donorName: string, donationId: string) {
    useNotificationsStore.getState().addNotification({
      id: crypto.randomUUID(),

      title: "Nova doação disponível 🍎",

      description: `${donorName} cadastrou uma nova doação.`,

      donationId,

      type: NotificationType.NEW_DONATION,

      isRead: false,

      createdAt: new Date().toISOString(),
    });
  }

  static donationAccepted(donationName: string) {
    useNotificationsStore.getState().addNotification({
      id: crypto.randomUUID(),

      title: "Solicitação aceita 🎉",

      description: `Sua solicitação para ${donationName} foi aceita.`,

      type: NotificationType.DONATION_ACCEPTED,

      isRead: false,

      createdAt: new Date().toISOString(),
    });
  }

  static donationReceived(donationName: string) {
    useNotificationsStore.getState().addNotification({
      id: crypto.randomUUID(),

      title: "Doação recebida ✅",

      description: `Você recebeu ${donationName}.`,

      type: NotificationType.DONATION_RECEIVED,

      isRead: false,

      createdAt: new Date().toISOString(),
    });
  }

  static donationCancelled(donationName: string) {
    useNotificationsStore.getState().addNotification({
      id: crypto.randomUUID(),

      title: "Doação cancelada ⚠️",

      description: `${donationName} foi cancelada.`,

      type: NotificationType.DONATION_CANCELLED,

      isRead: false,

      createdAt: new Date().toISOString(),
    });
  }
}
