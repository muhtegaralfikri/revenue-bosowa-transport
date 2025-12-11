<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRevenueStore } from '@/stores/revenue.store';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import Select from 'primevue/select';
import BaseChart from '@/components/BaseChart.vue';
import type { ChartData, ChartOptions } from 'chart.js';

const revenueStore = useRevenueStore();
const { summary, trend, yearlyComparison, companies, loading } = storeToRefs(revenueStore);

// Filter bulan & tahun
const currentDate = new Date();
const selectedMonth = ref(currentDate.getMonth() + 1);
const selectedYear = ref(currentDate.getFullYear());
const selectedCompanyCode = ref<string | null>(null);

const companyFilterOptions = computed(() => {
  const all = [{ label: isMobile.value ? 'Semua' : 'Semua Entity', value: null }];
  return all.concat(
    companies.value.map((c) => ({
      label: isMobile.value ? c.code : c.name,
      value: c.code,
    }))
  );
});

const months = [
  { label: 'Januari', value: 1 },
  { label: 'Februari', value: 2 },
  { label: 'Maret', value: 3 },
  { label: 'April', value: 4 },
  { label: 'Mei', value: 5 },
  { label: 'Juni', value: 6 },
  { label: 'Juli', value: 7 },
  { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 },
  { label: 'Oktober', value: 10 },
  { label: 'November', value: 11 },
  { label: 'Desember', value: 12 },
];

const years = computed(() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({
    label: String(currentYear - i),
    value: currentYear - i,
  }));
});

// Mobile detection
const isMobile = ref(window.innerWidth <= 576);

function handleResize() {
  isMobile.value = window.innerWidth <= 576;
}

// Fetch data on mount and when filter changes
onMounted(() => {
  revenueStore.fetchCompanies();
  fetchData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

watch([selectedMonth, selectedYear], () => {
  fetchData();
});

function fetchData() {
  revenueStore.fetchSummary(selectedYear.value, selectedMonth.value);
  revenueStore.fetchTrend(selectedYear.value, selectedMonth.value);
  revenueStore.fetchYearlyComparison(selectedYear.value);
}

// Format Rupiah
const formatRupiah = (value?: number | null) => {
  if (value === undefined || value === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const accentColors: Record<string, string> = {
  BBI: 'text-blue-600',
  BBA: 'text-green-600',
  JAPELIN: 'text-orange-600',
};

const summaryCards = computed(() => {
  if (!summary.value?.companies) return [];
  return summary.value.companies.map((item) => ({
    key: item.company.code,
    title: item.company.name,
    realisasi: item.month.realisasi,
    target: item.month.target,
    percentage: item.month.percentage,
    accent: accentColors[item.company.code] || 'text-gray-600',
  }));
});

const chartColors: Record<string, string> = {
  BBI: '#3B82F6',
  BBA: '#22C55E',
  JAPELIN: '#F97316',
};

const trendChartData = computed<ChartData<'line'> | null>(() => {
  if (!trend.value?.labels) return null;
  return {
    labels: trend.value.labels,
    datasets: trend.value.datasets.map((ds) => ({
      label: isMobile.value ? ds.company : ds.companyName,
      data: ds.data,
      tension: 0.35,
      fill: false,
      borderColor: chartColors[ds.company] || '#6B7280',
      backgroundColor: chartColors[ds.company] || '#6B7280',
      pointRadius: 3,
      borderWidth: 2,
    })),
  };
});

const trendChartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const value = ctx.parsed.y ?? 0;
          return `${ctx.dataset.label}: Rp ${(value * 1000000).toLocaleString('id-ID')}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      title: {
        display: true,
        text: 'Tanggal',
      },
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Juta Rupiah',
      },
      ticks: {
        callback: (value: any) => `${Number(value).toLocaleString('id-ID')} Jt`,
      },
    },
  },
}));

// Chart perbandingan target vs realisasi per bulan (tahunan)
const comparisonChartData = computed<ChartData<'bar'> | null>(() => {
  if (!yearlyComparison.value?.datasets) return null;
  
  const datasets: any[] = [];
  const colors = {
    BBI: { target: 'rgba(59, 130, 246, 0.5)', realisasi: 'rgba(59, 130, 246, 1)' },
    BBA: { target: 'rgba(34, 197, 94, 0.5)', realisasi: 'rgba(34, 197, 94, 1)' },
    JAPELIN: { target: 'rgba(249, 115, 22, 0.5)', realisasi: 'rgba(249, 115, 22, 1)' },
  };

  const filteredDatasets = selectedCompanyCode.value
    ? yearlyComparison.value.datasets.filter((ds) => ds.company === selectedCompanyCode.value)
    : yearlyComparison.value.datasets;

  filteredDatasets.forEach((ds) => {
    const color = colors[ds.company as keyof typeof colors] || { target: 'rgba(156, 163, 175, 0.5)', realisasi: 'rgba(156, 163, 175, 1)' };
    datasets.push({
      label: `${ds.company} Target`,
      data: ds.target,
      backgroundColor: color.target,
      borderColor: color.realisasi,
      borderWidth: 1,
    });
    datasets.push({
      label: `${ds.company} Realisasi`,
      data: ds.realisasi,
      backgroundColor: color.realisasi,
      borderColor: color.realisasi,
      borderWidth: 1,
    });
  });

  return {
    labels: yearlyComparison.value.labels,
    datasets,
  };
});

const comparisonChartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        boxWidth: isMobile.value ? 10 : 40,
        font: {
          size: isMobile.value ? 9 : 12,
        },
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const label = ctx.dataset.label || '';
          const value = ctx.parsed.y ?? 0;
          return `${label}: Rp ${(value * 1000000).toLocaleString('id-ID')}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      title: {
        display: true,
        text: 'Bulan',
      },
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Juta Rupiah',
      },
      ticks: {
        callback: (value: any) => `${Number(value).toLocaleString('id-ID')} Jt`,
      },
    },
  },
}));
</script>

<template>
  <div class="home-container">
    <!-- Filter Bulan & Tahun -->
    <div class="filter-section">
      <div class="filter-item">
        <label class="font-medium">Bulan:</label>
        <Select
          v-model="selectedMonth"
          :options="months"
          optionLabel="label"
          optionValue="value"
          placeholder="Pilih Bulan"
          class="filter-select"
        />
      </div>
      <div class="filter-item">
        <label class="font-medium">Tahun:</label>
        <Select
          v-model="selectedYear"
          :options="years"
          optionLabel="label"
          optionValue="value"
          placeholder="Pilih Tahun"
          class="filter-select"
        />
      </div>
    </div>

    <!-- 3 Summary Cards -->
    <div class="summary-cards">
      <div
        v-for="metric in summaryCards"
        :key="metric.key"
        class="summary-card-item"
      >
        <Card>
          <template #title>
            <span class="card-title card-title-full">{{ metric.title }}</span>
            <span class="card-title card-title-short">{{ metric.key }}</span>
          </template>
          <template #content>
            <div v-if="loading">
              <Skeleton height="2rem" class="mb-2" />
            </div>
            <div v-else>
              <h2 class="realisasi-value" :class="metric.accent">
                {{ formatRupiah(metric.realisasi) }}
              </h2>
              <div class="today-info">
                <span class="text-color-secondary">Bulan ini:</span>
                <span 
                  class="font-semibold"
                  :class="metric.percentage >= 100 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ metric.percentage }}%
                </span>
                <i 
                  :class="metric.percentage >= 100 ? 'pi pi-arrow-up text-green-600' : 'pi pi-arrow-down text-red-600'"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-section">
      <Card>
        <template #title>
          <span class="card-title">Tren Realisasi Harian</span>
        </template>
        <template #content>
          <div v-if="trendChartData">
            <div class="chart-wrapper">
              <BaseChart
                type="line"
                :data="trendChartData"
                :options="trendChartOptions"
              />
            </div>
          </div>
          <div v-else>
            <small class="text-color-secondary">
              Belum ada data tren untuk ditampilkan.
            </small>
          </div>
        </template>
      </Card>

      <Card class="mt-3">
        <template #title>
          <div class="chart-header">
            <span class="card-title">Perbandingan Target vs Realisasi ({{ selectedYear }})</span>
            <Select
              v-model="selectedCompanyCode"
              :options="companyFilterOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Filter Entity"
              class="company-filter"
            />
          </div>
        </template>
        <template #content>
          <div v-if="comparisonChartData">
            <div class="chart-wrapper">
              <BaseChart
                type="bar"
                :data="comparisonChartData"
                :options="comparisonChartOptions"
              />
            </div>
          </div>
          <div v-else>
            <small class="text-color-secondary">
              Belum ada data perbandingan untuk ditampilkan.
            </small>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  padding: 1rem;
}

/* Filter Section */
.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  align-items: center;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-select {
  width: 8rem;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.summary-card-item {
  min-width: 0;
}

.p-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  height: 100%;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
}

.card-title-full {
  display: inline;
}

.card-title-short {
  display: none;
}

.realisasi-value {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  word-break: break-word;
}

.today-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  flex-wrap: wrap;
}

/* Charts Section */
.charts-section {
  margin-top: 1rem;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.company-filter {
  min-width: 150px;
}

.chart-wrapper {
  width: 100%;
  height: 260px;
}

/* Tablet */
@media (max-width: 992px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile */
@media (max-width: 576px) {
  .home-container {
    padding: 0.75rem;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item {
    justify-content: space-between;
  }

  .filter-select {
    width: 100%;
    flex: 1;
  }

  .summary-cards {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .card-title-full {
    display: none;
  }

  .card-title-short {
    display: inline;
    font-size: 0.9rem;
  }

  .realisasi-value {
    font-size: 1.1rem;
  }

  .today-info {
    font-size: 0.8rem;
  }

  .chart-wrapper {
    height: 220px;
  }

  :deep(.p-card-title) {
    font-size: 0.95rem;
  }

  :deep(.p-card-body) {
    padding: 0.75rem;
  }

  :deep(.p-card-content) {
    padding: 0;
  }
}
</style>
