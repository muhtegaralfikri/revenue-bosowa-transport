<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useStockStore } from '@/stores/stock.store';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import BaseChart from '@/components/BaseChart.vue';
import type { ChartData, ChartOptions } from 'chart.js';

const stockStore = useStockStore();
const {
  summary,
  loading,
  error,
  trend,
  trendLoading,
  trendError,
  inOutTrend,
  inOutTrendLoading,
  inOutTrendError,
} = storeToRefs(stockStore);

onMounted(() => {
  stockStore.fetchTrend(7);
  stockStore.fetchInOutTrend(7);
});

const formatLiters = (value?: number | null) => {
  if (value === undefined || value === null) return '0 Liter';
  return `${value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} Liter`;
};

const summaryCards = computed(() => {
  const data = summary.value;
  return [
    {
      key: 'opening',
      title: 'Stok Awal Hari Ini',
      accent: 'text-gray-700',
      value: data?.todayInitialStock ?? null,
    },
    {
      key: 'in',
      title: 'Input Hari Ini',
      accent: 'text-green-600',
      value: data?.todayStockIn ?? null,
    },
    {
      key: 'out',
      title: 'Output Hari Ini',
      accent: 'text-orange-600',
      value: data?.todayStockOut ?? data?.todayUsage ?? null,
    },
    {
      key: 'closing',
      title: 'Stok Akhir Hari Ini',
      accent: 'text-blue-600',
      value: data?.todayClosingStock ?? data?.currentStock ?? null,
    },
  ];
});

const trendChartData = computed<ChartData<'line'> | null>(() => {
  if (!trend.value?.points?.length) return null;
  return {
    labels: trend.value.points.map((point) => point.label),
    datasets: [
      {
        label: 'Stok Akhir',
        data: trend.value.points.map((point) => point.closingStock),
        tension: 0.35,
        fill: true,
        borderColor: '#1e468c',
        backgroundColor: 'rgba(30, 70, 140, 0.15)',
        pointRadius: 3,
        pointBackgroundColor: '#1e468c',
        pointBorderColor: '#ffffff',
        borderWidth: 2,
        type: 'line' as const,
      },
    ],
  };
});

const trendChartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const value = ctx.parsed.y ?? 0;
          return `Stok: ${value.toLocaleString('id-ID')} L`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: any) =>
          `${Number(value).toLocaleString('id-ID')} L`,
      },
    },
  },
}));
const inOutChartData = computed<ChartData<'bar'> | null>(() => {
  if (!inOutTrend.value?.points?.length) return null;
  return {
    labels: inOutTrend.value.points.map((point) => point.label),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Penambahan (IN)',
        data: inOutTrend.value.points.map((point) => point.totalIn),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgba(22, 163, 74, 1)',
        borderWidth: 1,
      },
      {
        type: 'bar' as const,
        label: 'Pemakaian (OUT)',
        data: inOutTrend.value.points.map((point) => point.totalOut),
        backgroundColor: 'rgba(249, 115, 22, 0.7)',
        borderColor: 'rgba(234, 88, 12, 1)',
        borderWidth: 1,
      },
    ],
  };
});

const inOutChartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const label = ctx.dataset.label || '';
          const value = ctx.parsed.y ?? ctx.parsed ?? 0;
          return `${label}: ${value.toLocaleString('id-ID')} L`;
        },
      },
    },
  },
  scales: {
    x: {
      stacked: false,
    },
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: any) =>
          `${Number(value).toLocaleString('id-ID')} L`,
      },
    },
  },
}));
</script>

<template>
  <div class="p-4">
    <div class="grid summary-grid">
      <div
        v-for="metric in summaryCards"
        :key="metric.key"
        class="col-12 sm:col-6 lg:col-3"
      >
        <Card>
          <template #title>{{ metric.title }}</template>
          <template #content>
            <div v-if="loading">
              <Skeleton height="2rem" class="mb-2" />
            </div>
            <div v-else-if="summary">
              <h2 class="text-3xl font-bold" :class="metric.accent">
                {{ formatLiters(metric.value) }}
              </h2>
            </div>
            <div v-else>
              <small class="text-color-secondary">Belum ada data stok.</small>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <div v-if="error" class="col-12 mt-4">
      <Message severity="error">{{ error }}</Message>
      </div>

    <div class="grid mt-4">
      <div class="col-12">
        <Card>
          <template #title>Tren Stok 7 Hari Terakhir</template>
          <template #content>
            <div v-if="trendLoading">
              <Skeleton height="260px" />
            </div>
            <div v-else-if="trendError">
              <Message severity="warn">{{ trendError }}</Message>
            </div>
            <div v-else-if="trendChartData">
              <div class="trend-chart-wrapper">
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
      </div>

      <div class="col-12">
        <Card>
          <template #title>Perbandingan Penambahan vs Pemakaian (7 Hari)</template>
          <template #content>
            <div v-if="inOutTrendLoading">
              <Skeleton height="260px" />
            </div>
            <div v-else-if="inOutTrendError">
              <Message severity="warn">{{ inOutTrendError }}</Message>
            </div>
            <div v-else-if="inOutChartData">
              <div class="trend-chart-wrapper">
                <BaseChart
                  type="bar"
                  :data="inOutChartData"
                  :options="inOutChartOptions"
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
  </div>
</template>

<style scoped>
/* Kita bisa tambahkan style kustom di sini jika perlu */
.p-card {
  /* Memberi bayangan & tepian bulat yang konsisten */
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}
h2 {
  margin: 0; /* Hapus margin default browser */
}

.trend-chart-wrapper {
  width: 100%;
  height: 260px;
}
</style>
