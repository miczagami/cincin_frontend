import { create } from 'zustand';
import { auth as authApi, ageVerify as ageApi, setAuth, clearAuth, getToken } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  ageVerified: false,
  ageVerifyStatus: null,

  init: async () => {
    const token = getToken();
    if (!token) { set({ isLoading: false, isAuthenticated: false }); return; }
    try {
      const result = await authApi.me();
      set({ user: result.user, token, isAuthenticated: true, ageVerified: result.user.ageVerified || false, isLoading: false });
    } catch {
      clearAuth();
      set({ isLoading: false, isAuthenticated: false, token: null, user: null });
    }
  },

  register: async ({ displayName, email, password }) => {
    set({ isLoading: true });
    try {
      const result = await authApi.register({ displayName, email, password });
      setAuth({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      set({ user: result.user, token: result.accessToken, isAuthenticated: true, ageVerified: result.user.ageVerified || false, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await authApi.login({ email, password });
      setAuth({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      set({ user: result.user, token: result.accessToken, isAuthenticated: true, ageVerified: result.user.ageVerified || false, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  socialLogin: async (provider, providerToken) => {
    set({ isLoading: true });
    try {
      const result = await authApi.socialLogin({ provider, token: providerToken });
      setAuth({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      set({ user: result.user, token: result.accessToken, isAuthenticated: true, ageVerified: result.user.ageVerified || false, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.error || err.message };    }
  },

  initiateAgeVerify: async (region) => {
    set({ ageVerifyStatus: 'pending' });
    try {
      const result = await ageApi.initiate({ region });
      return { success: true, data: result };
    } catch (err) {
      set({ ageVerifyStatus: 'failed' });
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  checkAgeVerifyStatus: async () => {
    try {
      const result = await ageApi.status();
      const verified = result.status === 'verified';
      set({ ageVerified: verified, ageVerifyStatus: result.status, user: get().user ? { ...get().user, ageVerified: verified } : null });
      return result.status;
    } catch { return null; }
  },

  devVerify: async (dateOfBirth) => {
    try {
      await ageApi.devVerify({ dateOfBirth });
      set({ ageVerified: true, ageVerifyStatus: 'verified', user: get().user ? { ...get().user, ageVerified: true } : null });
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    set({ user: null, token: null, isAuthenticated: false, ageVerified: false, ageVerifyStatus: null });
  },

  setUser: (user) => set({ user }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('cin:auth-expired', () => useAuthStore.getState().logout());
}

export default useAuthStore;