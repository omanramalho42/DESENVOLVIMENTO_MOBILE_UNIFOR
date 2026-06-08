import { useMemo } from "react";

import { NotificationItem } from "@/types";

import { useNotificationsStore } from "@/store/notifications.store";

export const useNotifications = () => {
  const store = useNotificationsStore();

  const unreadCount = useMemo(
    () => store.notifications.filter((n) => !n.isRead).length,
    [store.notifications],
  );

  const createNotification = (
    notification: Omit<NotificationItem, "id" | "createdAt">,
  ) => {
    store.addNotification({
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
  };

  return {
    ...store,

    unreadCount,

    createNotification,
  };
};
