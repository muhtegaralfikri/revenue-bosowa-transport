// /frontend/src/stores/stock.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/services/api';

export interface StockSummary {
  currentStock: number;
  todayUsage: number;
  todayInitialStock: number;
}

export const useStockStore = defineStore('stock', () => {
  const summary = ref<StockSummary | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  let hasLoadedOnce = false;
  let isFetching = false;
  let pendingForceRefresh = false;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;

  const fetchSummary = async (options: { force?: boolean } = {}) => {
    const { force = false } = options;
    if (isFetching) {
      if (force) {
        pendingForceRefresh = true;
      }
      return;
    }

    isFetching = true;
    if (!hasLoadedOnce) {
      loading.value = true;
    }
    error.value = null;

    try {
      const response = await apiClient.get<StockSummary>('/stock/summary');
      summary.value = response.data;
    } catch (err) {
      console.error('Failed to fetch stock summary:', err);
      error.value =
        'Gagal memuat data ringkasan. Pastikan backend berjalan.';
    } finally {
      isFetching = false;
      if (!hasLoadedOnce) {
        loading.value = false;
        hasLoadedOnce = true;
      }
      if (pendingForceRefresh) {
        pendingForceRefresh = false;
        fetchSummary();
      }
    }
  };

  const startPolling = (intervalMs = 5000) => {
    if (pollingTimer) return;
    fetchSummary(); // initial fetch
    pollingTimer = setInterval(() => {
      fetchSummary();
    }, intervalMs);
  };

  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };

  const refreshAfterTransaction = () => {
    fetchSummary({ force: true });
  };

  return {
    summary,
    loading,
    error,
    fetchSummary,
    startPolling,
    stopPolling,
    refreshAfterTransaction,
  };
});
