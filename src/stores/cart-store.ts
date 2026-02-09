import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  tank: string | number;
  productName: string;
  productId: string;
  size: number | string;
  stock: number;
  quantityLoad: number;
  price: number;
  imageUrl?: string;
  fishSize?: string;
  sourceRecordIds?: string[];
  // Per-record deductions applied when adding to cart, used to restore on clear
  deductions?: { id: string; amount: number }[];
  // Transport metadata
  tripId?: string;
  vesselId?: string;
  toPortId?: string;
}

interface CartState {
  items: CartItem[];
  type: string; // Track cart origin: "4SaleAuction" or "2ShareLoading"
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCartType: (type: string) => void;
  isItemInCart: (id: string) => boolean;
  getTotalQuantity: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      type: "2ShareLoading", // Default type
      
      addItem: (item) => 
        set((state) => {
          // Check if item already exists
          const existingItemIndex = state.items.findIndex(i => i.id === item.id);
          
          if (existingItemIndex >= 0) {
            // Update existing item
            const updatedItems = [...state.items];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantityLoad: item.quantityLoad,
              price: item.price,
              stock: item.stock,
              // merge sourceRecordIds if provided
              sourceRecordIds: Array.from(
                new Set([...(updatedItems[existingItemIndex].sourceRecordIds || []), ...(item.sourceRecordIds || [])])
              ),
              // merge deductions: sum amounts by id
              deductions: (() => {
                const existing = updatedItems[existingItemIndex].deductions || [];
                const incoming = item.deductions || [];
                const map = new Map<string, number>();
                for (const d of existing) {
                  map.set(d.id, (map.get(d.id) || 0) + Number(d.amount || 0));
                }
                for (const d of incoming) {
                  map.set(d.id, (map.get(d.id) || 0) + Number(d.amount || 0));
                }
                return Array.from(map.entries()).map(([id, amount]) => ({ id, amount }));
              })(),
              // update transport metadata if provided
              tripId: item.tripId ?? updatedItems[existingItemIndex].tripId,
              vesselId: item.vesselId ?? updatedItems[existingItemIndex].vesselId,
              toPortId: item.toPortId ?? updatedItems[existingItemIndex].toPortId,
            };
            return { items: updatedItems };
          } else {
            // Add new item
            return { items: [...state.items, item] };
          }
        }),
      
      removeItem: (id) => 
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        })),
      
      clearCart: () => set({ items: [], type: "2ShareLoading" }), // Reset type on clear
      
      setCartType: (type) => set({ type }),
      
      isItemInCart: (id) => {
        return get().items.some(item => item.id === id);
      },
      
      getTotalQuantity: () => {
        return get().items.reduce((total, item) => total + Number(item.quantityLoad), 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          return total + (Number(item.size) * Number(item.price) * Number(item.quantityLoad));
        }, 0);
      }
    }),
    {
      name: "cart-storage",
    }
  )
);