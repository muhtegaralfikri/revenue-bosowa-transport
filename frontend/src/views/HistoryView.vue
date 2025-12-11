<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import Card from 'primevue/card';
import Select from 'primevue/select';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Skeleton from 'primevue/skeleton';
import { useRevenueStore } from '@/stores/revenue.store';
import apiClient from '@/services/api';

const revenueStore = useRevenueStore();

const isMobile = ref(window.innerWidth <= 576);

function handleResize() {
  isMobile.value = window.innerWidth <= 576;
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const currentDate = new Date();
const selectedMonth = ref(currentDate.getMonth() + 1);
const selectedYear = ref(currentDate.getFullYear());
const selectedCompanyId = ref<number | null>(null);

const realizations = ref<any[]>([]);
const targets = ref<any[]>([]);
const loadingRealizations = ref(false);
const loadingTargets = ref(false);

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

const companyOptions = computed(() => {
  const all: { label: string; value: number | null }[] = [
    { label: isMobile.value ? 'Semua' : 'Semua Entity', value: null }
  ];
  return all.concat(
    revenueStore.companies.map((c) => ({
      label: isMobile.value ? c.code : c.name,
      value: c.id,
    }))
  );
});

onMounted(() => {
  revenueStore.fetchCompanies();
  fetchData();
  window.addEventListener('resize', handleResize);
});

watch([selectedMonth, selectedYear, selectedCompanyId], () => {
  fetchData();
});

async function fetchData() {
  await Promise.all([fetchRealizations(), fetchTargets()]);
}

async function fetchRealizations() {
  loadingRealizations.value = true;
  try {
    const params: any = {
      year: selectedYear.value,
      month: selectedMonth.value,
    };
    if (selectedCompanyId.value) params.companyId = selectedCompanyId.value;
    const { data } = await apiClient.get('/revenue/realizations', { params });
    realizations.value = data;
  } catch (err) {
    console.error('Failed to fetch realizations:', err);
  } finally {
    loadingRealizations.value = false;
  }
}

async function fetchTargets() {
  loadingTargets.value = true;
  try {
    const params: any = {
      year: selectedYear.value,
      month: selectedMonth.value,
    };
    if (selectedCompanyId.value) params.companyId = selectedCompanyId.value;
    const { data } = await apiClient.get('/revenue/targets', { params });
    targets.value = data;
  } catch (err) {
    console.error('Failed to fetch targets:', err);
  } finally {
    loadingTargets.value = false;
  }
}

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getMonthName = (month: number) => {
  return months.find((m) => m.value === month)?.label || '';
};
</script>

<template>
  <div class="history-container">
    <Card>
      <template #title>
        <span class="card-title">Riwayat Data Revenue</span>
      </template>
      <template #content>
        <div class="filter-section">
          <div class="filter-item">
            <label>Bulan</label>
            <Select
              v-model="selectedMonth"
              :options="months"
              optionLabel="label"
              optionValue="value"
              class="filter-select"
            />
          </div>
          <div class="filter-item">
            <label>Tahun</label>
            <Select
              v-model="selectedYear"
              :options="years"
              optionLabel="label"
              optionValue="value"
              class="filter-select"
            />
          </div>
          <div class="filter-item">
            <label>Entity</label>
            <Select
              v-model="selectedCompanyId"
              :options="companyOptions"
              optionLabel="label"
              optionValue="value"
              class="filter-select"
            />
          </div>
        </div>

        <TabView>
          <TabPanel header="Realisasi" value="0">
            <div v-if="loadingRealizations" class="loading-skeleton">
              <Skeleton height="2rem" class="mb-2" />
              <Skeleton height="2rem" class="mb-2" />
              <Skeleton height="2rem" />
            </div>
            <div v-else-if="realizations.length === 0" class="empty-state">
              Tidak ada data realisasi untuk periode ini.
            </div>
            <div v-else class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Entity</th>
                    <th class="text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in realizations" :key="item.id">
                    <td>{{ formatDate(item.date) }}</td>
                    <td>{{ item.company?.name || '-' }}</td>
                    <td class="text-right">{{ formatRupiah(item.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabPanel>

          <TabPanel header="Target" value="1">
            <div v-if="loadingTargets" class="loading-skeleton">
              <Skeleton height="2rem" class="mb-2" />
              <Skeleton height="2rem" class="mb-2" />
              <Skeleton height="2rem" />
            </div>
            <div v-else-if="targets.length === 0" class="empty-state">
              Tidak ada data target untuk periode ini.
            </div>
            <div v-else class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th>Entity</th>
                    <th class="text-right">Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in targets" :key="item.id">
                    <td>{{ getMonthName(item.month) }} {{ item.year }}</td>
                    <td>{{ item.company?.name || '-' }}</td>
                    <td class="text-right">{{ formatRupiah(item.targetAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabPanel>
        </TabView>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.history-container {
  padding: 1rem;
  max-width: 900px;
  margin: 0 auto;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 150px;
}

.filter-item label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--surface-700);
}

.filter-select {
  width: 100%;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  text-align: left;
}

.data-table th {
  font-weight: 600;
  color: var(--surface-600);
  background: var(--surface-50);
}

.text-right {
  text-align: right !important;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--surface-500);
}

.loading-skeleton {
  padding: 1rem 0;
}

@media (max-width: 576px) {
  .history-container {
    padding: 0.75rem;
  }

  .filter-section {
    flex-direction: column;
  }

  .filter-item {
    width: 100%;
  }

  .data-table th,
  .data-table td {
    padding: 0.5rem;
    font-size: 0.875rem;
  }
}
</style>
