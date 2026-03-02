import { create } from 'zustand';

interface ScrollState {
    offset: number;
    setOffset: (val: number) => void;
}

export const useScrollStore = create<ScrollState>((set) => ({
    offset: 0,
    setOffset: (val) => set({ offset: val }),
}));
