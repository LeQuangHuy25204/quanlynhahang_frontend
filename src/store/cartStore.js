import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.menuItemId === item.menuItemId);
    if (existing) {
      if (item.isWeightBased) {
        // Weight based items are added separately or just qty=0? The prompt says quantity=0 for weight based when ordering.
        // But for cart UI, maybe we just record the item and note.
        return { items: [...state.items, { ...item, quantity: 1, cartId: Date.now() }] };
      }
      return {
        items: state.items.map(i => 
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        )
      };
    }
    return { items: [...state.items, { ...item, quantity: item.quantity || 1, cartId: Date.now() }] };
  }),
  removeItem: (cartId) => set((state) => ({
    items: state.items.filter(i => i.cartId !== cartId && i.menuItemId !== cartId)
  })),
  updateQuantity: (menuItemId, delta) => set((state) => ({
    items: state.items.map(i => {
      if (i.menuItemId === menuItemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    })
  })),
  clearCart: () => set({ items: [] }),
  getCartTotal: () => {
    const items = get().items;
    return items.reduce((total, item) => total + (item.finalPrice * (item.isWeightBased ? 1 : item.quantity)), 0);
  }
}));
