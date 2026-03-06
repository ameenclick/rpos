import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  buyerId: string;
  buyerName: string;
}

/** Buyer session — pre-seeded from env vars, persisted to localStorage */
export const useAuthStore = create<AuthState>()(
  persist(
    () => ({
      buyerId: import.meta.env['VITE_BUYER_ID'] ?? 'buyer-001',
      buyerName: import.meta.env['VITE_BUYER_NAME'] ?? 'Alex Morgan',
    }),
    { name: 'rpos-auth' },
  ),
);
