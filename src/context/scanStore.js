import { create } from 'zustand';
import { scan as scanApi, taxonomy as taxApi } from '../services/api';

const useScanStore = create((set, get) => ({
  scanResult: null,
  confirmedBottle: null,
  searchResults: [],
  searchQuery: '',
  isScanning: false,
  isSearching: false,
  isSourcing: false,
  scanError: null,
  taxonomyTree: null,

  scanLabel: async (imageFile) => {
    set({ isScanning: true, scanError: null, scanResult: null });
    try {
      const { data } = await scanApi.label(imageFile);
      set({ scanResult: data, isScanning: false });
      return { success: true, data };
    } catch (err) {
      set({ isScanning: false, scanError: err.message });
      return { success: false, error: err.message };
    }
  },

  scanBarcode: async (barcodeData) => {
    set({ isScanning: true, scanError: null, scanResult: null });
    try {
      const { data } = await scanApi.barcode(barcodeData);
      set({ scanResult: data, isScanning: false });
      return { success: true, data };
    } catch (err) {
      set({ isScanning: false, scanError: err.message });
      return { success: false, error: err.message };
    }
  },

  search: async (query) => {
    if (!query || query.length < 2) { set({ searchResults: [], searchQuery: query }); return; }
    set({ isSearching: true, searchQuery: query });
    try {
      const { data } = await scanApi.search(query);
      set({ searchResults: data.results || [], isSearching: false });
    } catch { set({ isSearching: false, searchResults: [] }); }
  },

  confirmBottle: async (bottleId) => {
    set({ isSourcing: true });
    try {
      const { data } = await scanApi.confirm(bottleId);
      set({ confirmedBottle: data, isSourcing: false });
      return { success: true, data };
    } catch (err) {
      set({ isSourcing: false });
      return { success: false, error: err.message };
    }
  },

  sourceNotes: async (bottleId) => {
    set({ isSourcing: true });
    try {
      const { data } = await scanApi.sourceNotes(bottleId);
      set((s) => ({
        confirmedBottle: s.confirmedBottle ? { ...s.confirmedBottle, notes: data.notes, noteCount: data.count } : null,
        isSourcing: false,
      }));
      return { success: true, data };
    } catch (err) {
      set({ isSourcing: false });
      return { success: false, error: err.message };
    }
  },

  loadTaxonomy: async () => {
    if (get().taxonomyTree) return;
    try { const { data } = await taxApi.tree(); set({ taxonomyTree: data }); } catch {}
  },

  searchTaxonomy: async (query) => {
    try { const { data } = await taxApi.search(query); return data.results || []; } catch { return []; }
  },

  reset: () => set({
    scanResult: null, confirmedBottle: null, searchResults: [], searchQuery: '',
    isScanning: false, isSearching: false, isSourcing: false, scanError: null,
  }),
}));

export default useScanStore;
