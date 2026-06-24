"use client";

import { create } from "zustand";

export interface ToastItem {
  id: string;
  title: string;
  description: string;
  type: "success" | "warning" | "critical" | "info";
  duration?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: "critical" | "warning" | "system" | "prediction" | "maintenance" | "simulation";
  timestamp: Date;
  read: boolean;
  metadata?: Record<string, any>;
}

type NotificationStore = {
  // Sound settings
  soundEnabled: boolean;
  soundVolume: number;
  soundMuted: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setSoundMuted: (muted: boolean) => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;

  // Notifications feed
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, "id" | "timestamp" | "read"> & { id?: string }) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
};

// Simple load helpers for client-side state persistence
const getStored = (key: string, fallback: any) => {
  if (typeof window === "undefined") return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setStored = (key: string, val: any) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  soundEnabled: getStored("nextwin_sound_enabled", true),
  soundVolume: getStored("nextwin_sound_volume", 0.5),
  soundMuted: getStored("nextwin_sound_muted", false),

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    setStored("nextwin_sound_enabled", enabled);
  },
  setSoundVolume: (volume) => {
    set({ soundVolume: volume });
    setStored("nextwin_sound_volume", volume);
  },
  setSoundMuted: (muted) => {
    set({ soundMuted: muted });
    setStored("nextwin_sound_muted", muted);
  },

  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  notifications: getStored("nextwin_notifications_feed", []),
  addNotification: (item) => {
    const newNotification: NotificationItem = {
      id: item.id || Math.random().toString(36).substring(2, 9),
      title: item.title,
      description: item.description,
      category: item.category,
      timestamp: new Date(),
      read: false,
      metadata: item.metadata
    };

    set((state) => {
      // Limit to 50 entries
      const updated = [newNotification, ...state.notifications].slice(0, 50);
      setStored("nextwin_notifications_feed", updated);
      return { notifications: updated };
    });
  },
  markAllAsRead: () => {
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      setStored("nextwin_notifications_feed", updated);
      return { notifications: updated };
    });
  },
  clearNotifications: () => {
    set(() => {
      setStored("nextwin_notifications_feed", []);
      return { notifications: [] };
    });
  }
}));
