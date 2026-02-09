import { create } from "zustand";
import type { CartItem } from "./cart-store";

export type ShareVessel = {
  id: string;
  name: string | null;
  registration_number: string | null;
  latitude: string | null;
  longitude: string | null;
  type?: string | null;
  user_id?: string | null;
  port_registry?: string | null;
  current_zone?: string | null;
};

type ShareFlowStatus = "idle" | "initiated" | "confirming" | "completed" | "cancelled";

type ShareFlowState = {
  open: boolean;
  status: ShareFlowStatus;
  currentVessel: ShareVessel | null;
  otherVessel: ShareVessel | null;
  distanceKm: number | null;
  cartItems: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  createdAt: number | null;
  setOpen: (open: boolean) => void;
  startFlow: (payload: {
    currentVessel: ShareVessel | null;
    otherVessel: ShareVessel;
    distanceKm: number | null;
    cartItems: CartItem[];
    totalQuantity: number;
    totalPrice: number;
  }) => void;
  updateFlow: (partial: Partial<Omit<ShareFlowState, "setOpen" | "startFlow" | "updateFlow" | "completeFlow" | "cancelFlow" | "resetFlow">>) => void;
  completeFlow: () => void;
  cancelFlow: () => void;
  resetFlow: () => void;
};

export const useShareFlowStore = create<ShareFlowState>((set) => ({
  open: false,
  status: "idle",
  currentVessel: null,
  otherVessel: null,
  distanceKm: null,
  cartItems: [],
  totalQuantity: 0,
  totalPrice: 0,
  createdAt: null,
  setOpen: (open) => set({ open }),
  startFlow: ({ currentVessel, otherVessel, distanceKm, cartItems, totalQuantity, totalPrice }) =>
    set({
      open: true,
      status: "initiated",
      currentVessel,
      otherVessel,
      distanceKm,
      cartItems,
      totalQuantity,
      totalPrice,
      createdAt: Date.now(),
    }),
  updateFlow: (partial) => set((state) => ({ ...state, ...partial })),
  completeFlow: () => set({ status: "completed" }),
  cancelFlow: () => set({ status: "cancelled", open: false }),
  resetFlow: () =>
    set({
      open: false,
      status: "idle",
      currentVessel: null,
      otherVessel: null,
      distanceKm: null,
      cartItems: [],
      totalQuantity: 0,
      totalPrice: 0,
      createdAt: null,
    }),
}));