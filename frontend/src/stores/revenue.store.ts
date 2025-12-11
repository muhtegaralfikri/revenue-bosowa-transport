import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/services/api';

interface Company {
  id: number;
  name: string;
  code: string;
}

interface RevenueSummaryItem {
  company: Company;
  today: {
    realisasi: number;
    target: number;
    percentage: number;
  };
  month: {
    realisasi: number;
    target: number;
    percentage: number;
  };
}

interface RevenueSummary {
  year: number;
  month: number;
  date: string;
  companies: RevenueSummaryItem[];
}

interface TrendDataset {
  company: string;
  companyName: string;
  data: number[];
}

interface RevenueTrend {
  year: number;
  month: number;
  labels: string[];
  datasets: TrendDataset[];
}

export const useRevenueStore = defineStore('revenue', () => {
  const summary = ref<RevenueSummary | null>(null);
  const trend = ref<RevenueTrend | null>(null);
  const companies = ref<Company[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchCompanies() {
    try {
      const { data } = await apiClient.get('/revenue/companies');
      companies.value = data;
    } catch (err: any) {
      console.error('Failed to fetch companies:', err);
    }
  }

  async function fetchSummary(year?: number, month?: number) {
    loading.value = true;
    error.value = null;
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const { data } = await apiClient.get('/revenue/summary', { params });
      summary.value = data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Gagal mengambil data summary';
      console.error('Failed to fetch summary:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchTrend(year?: number, month?: number) {
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const { data } = await apiClient.get('/revenue/trend', { params });
      trend.value = data;
    } catch (err: any) {
      console.error('Failed to fetch trend:', err);
    }
  }

  return {
    summary,
    trend,
    companies,
    loading,
    error,
    fetchCompanies,
    fetchSummary,
    fetchTrend,
  };
});
