// /frontend/src/stores/stock.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/services/api';

export interface StockSummary {
  currentStock: number;
  todayUsage: number;
  todayInitialStock: number;
  todayStockIn: number;
  todayStockOut: number;
  todayClosingStock: number;
}

export interface StockTrendPoint {
  date: string;
  label: string;
  openingStock: number;
  closingStock: number;
  delta: number;
}

export interface StockTrendResponse {
  timezone: string;
  startDate: string;
  endDate: string;
  days: number;
  points: StockTrendPoint[];
}

export interface StockInOutPoint {
  date: string;
  label: string;
  totalIn: number;
  totalOut: number;
}

export interface StockInOutTrendResponse {
  timezone: string;
  startDate: string;
  endDate: string;
  days: number;
  points: StockInOutPoint[];
}

export const useStockStore = defineStore('stock', () => {
  const summary = ref<StockSummary | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const trend = ref<StockTrendResponse | null>(null);
  const trendLoading = ref(false);
  const trendError = ref<string | null>(null);
  const trendDays = ref(7);
  const inOutTrend = ref<StockInOutTrendResponse | null>(null);
  const inOutTrendLoading = ref(false);
  const inOutTrendError = ref<string | null>(null);
  const inOutTrendDays = ref(7);

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

  const fetchTrend = async (days = trendDays.value) => {
    trendLoading.value = true;
    trendError.value = null;
    try {
      const { data } = await apiClient.get<StockTrendResponse>(
        '/stock/trend',
        {
          params: { days },
        },
      );
      trend.value = data;
      trendDays.value = days;
    } catch (err) {
      console.error('Failed to fetch stock trend:', err);
      trendError.value =
        'Gagal memuat tren stok. Coba lagi beberapa saat.';
    } finally {
      trendLoading.value = false;
    }
  };

  const fetchInOutTrend = async (days = inOutTrendDays.value) => {
    inOutTrendLoading.value = true;
    inOutTrendError.value = null;
    try {
      const { data } = await apiClient.get<StockInOutTrendResponse>(
        '/stock/trend/in-out',
        {
          params: { days },
        },
      );
      inOutTrend.value = data;
      inOutTrendDays.value = days;
    } catch (err) {
      console.error('Failed to fetch in/out trend:', err);
      inOutTrendError.value =
        'Gagal memuat data perbandingan. Coba lagi beberapa saat.';
    } finally {
      inOutTrendLoading.value = false;
    }
  };

  return {
    summary,
    loading,
    error,
    fetchSummary,
    startPolling,
    stopPolling,
    refreshAfterTransaction,
    trend,
    trendLoading,
    trendError,
    trendDays,
    fetchTrend,
    inOutTrend,
    inOutTrendLoading,
    inOutTrendError,
    inOutTrendDays,
    fetchInOutTrend,
  };
});
