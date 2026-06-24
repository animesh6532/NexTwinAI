import { create } from "zustand";

type InterfaceState = {
  commandOpen: boolean;
  searchOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
};

export const useInterfaceStore = create<InterfaceState>((set) => ({
  commandOpen: false,
  searchOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
}));
