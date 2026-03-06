import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: nanoid() }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper — callable outside React components */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().add({ variant: 'success', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().add({ variant: 'error', title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().add({ variant: 'info', title, description }),
};
