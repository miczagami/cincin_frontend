import { create } from 'zustand';
import { scan as scanApi } from '../services/api';

// Backend scan responses are { scanId, confidence, bottle, alternatives, noteRange }.
// The confirm screen reads topCandidate / candidates, so normalise here.
function toScanResult(res) {
  const top = res.bottle ? { ...res.bottle, confidence: res.confidence } : null;
  return { ...res, topCandidate: top, candidates: [top, ...(res.alternatives || [])].filter(Boolean) };
}

async function fileToBase64(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

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
      const imageBase64 = await fileToBase64(imageFile);
      const data = toScanResult(await scanApi.label({ imageBase64, mimeType: imageFile.type || 'image/jpeg' }));
      if (!data.topCandidate) {
        set({ isScanning: false, scanError: 'No matching bottle found' });
        return { success: false, error: 'No matching bottle found' };
      }
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
      const data = toScanResult(await scanApi.barcode({ barcode: barcodeData }));
      if (!data.topCandidate) {
        set({ isScanning: false, scanError: 'No matching bottle found' });
        return { success: false, error: 'No matching bottle found' };
      }
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
      const results = await scanApi.search({ q: query });
      set({ searchResults: Array.isArray(results) ? results : [], isSearching: false });
    } catch { set({ isSearching: false, searchResults: [] }); }
  },

  confirmBottle: async (bottleId) => {
    set({ isSourcing: true });
    try {
      const data = await scanApi.confirm(bottleId);
      set({ confirmedBottle: { ...data.bottle, noteRange: data.noteRange }, isSourcing: false });
      return { success: true, data };
    } catch (err) {
      set({ isSourcing: false });
      return { success: false, error: err.message };
    }
  },

  sourceNotes: async (bottleId) => {
    set({ isSourcing: true });
    try {
      const data = await scanApi.sourceNotes(bottleId);
      // Only keep the count — note content stays sealed until the game ends
      set((s) => ({
        confirmedBottle: s.confirmedBottle ? { ...s.confirmedBottle, noteCount: data.totalNotes } : null,
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
    try { const tree = await scanApi.taxonomyTree(); set({ taxonomyTree: tree }); } catch {}
  },

  searchTaxonomy: async (query) => {
    try { const results = await scanApi.taxonomySearch({ q: query }); return Array.isArray(results) ? results : []; } catch { return []; }
  },

  reset: () => set({
    scanResult: null, confirmedBottle: null, searchResults: [], searchQuery: '',
    isScanning: false, isSearching: false, isSourcing: false, scanError: null,
  }),
}));

export default useScanStore;
