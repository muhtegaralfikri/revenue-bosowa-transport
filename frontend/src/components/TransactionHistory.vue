<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import * as XLSX from 'xlsx';
import apiClient from '@/services/api';

interface TransactionUser {
  id: string;
  username: string;
  email: string;
}

interface TransactionHistoryItem {
  id: string;
  timestamp: string;
  type: 'IN' | 'OUT';
  amount: number;
  description: string | null;
  user: TransactionUser;
}

interface HistoryResponse {
  data: TransactionHistoryItem[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
}

const MAKASSAR_TIME_ZONE = 'Asia/Makassar';

const props = withDefaults(
  defineProps<{
    type: 'IN' | 'OUT';
    title: string;
    description?: string;
    limit?: number;
    timeZone?: string;
  }>(),
  {
    description: '',
    limit: 10,
    timeZone: MAKASSAR_TIME_ZONE,
  },
);

// Always use Makassar timezone unless component caller overrides via prop.
const resolvedTimeZone = computed(() => props.timeZone || MAKASSAR_TIME_ZONE);

const history = ref<TransactionHistoryItem[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const page = ref(1);
const paginationMeta = ref<HistoryResponse['meta']>({
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: props.limit,
  currentPage: 1,
  totalPages: 1,
});
type DateRangeValue = [Date | null, Date | null] | null;
const selectedRange = ref<DateRangeValue>(null);
const appliedRange = ref<{ start: Date; end: Date } | null>(null);

const formatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatDate = (value: string | number | Date) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: resolvedTimeZone.value,
  }).format(new Date(value));

const startOfDayIso = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const endOfDayIso = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

const fetchHistory = async () => {
  loading.value = true;
  errorMessage.value = null;
  try {
    const params: Record<string, unknown> = {
      limit: props.limit,
      type: props.type,
      page: page.value,
    };

    if (appliedRange.value) {
      params.startDate = startOfDayIso(appliedRange.value.start);
      params.endDate = endOfDayIso(appliedRange.value.end);
    }

    const { data } = await apiClient.get<HistoryResponse>('/stock/history', {
      params,
    });
    history.value = (data?.data || []).map((item) => ({
      ...item,
      amount: Number(item.amount),
    }));
    if (data?.meta) {
      paginationMeta.value = data.meta;
      page.value = data.meta.currentPage;
    }
  } catch (error: any) {
    console.error('Failed to load history', error);
    errorMessage.value =
      error.response?.data?.message ||
      'Gagal memuat riwayat transaksi. Coba lagi beberapa saat.';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchHistory);

const refresh = () => fetchHistory();

const canApplyRange = computed(() => {
  if (!selectedRange.value) return false;
  const [start, end] = selectedRange.value;
  return Boolean(start && end);
});

const applyDateFilter = () => {
  if (!canApplyRange.value || !selectedRange.value) {
    return;
  }
  const [start, end] = selectedRange.value as [Date, Date];
  appliedRange.value = { start, end };
  page.value = 1;
  fetchHistory();
};

const clearDateFilter = () => {
  selectedRange.value = null;
  appliedRange.value = null;
  page.value = 1;
  fetchHistory();
};

const activeRangeLabel = computed(() => {
  if (!appliedRange.value) return '';
  const { start, end } = appliedRange.value;
  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  });
  return `${dateFormatter.format(start)} — ${dateFormatter.format(end)}`;
});

const goToPage = (target: number) => {
  if (
    target < 1 ||
    target > paginationMeta.value.totalPages ||
    target === page.value ||
    loading.value
  ) {
    return;
  }
  page.value = target;
  fetchHistory();
};

const canGoPrev = computed(() => page.value > 1);
const canGoNext = computed(() => page.value < paginationMeta.value.totalPages);

type PageToken =
  | { type: 'page'; value: number; key: string }
  | { type: 'ellipsis'; key: string };

const displayedPages = computed<PageToken[]>(() => {
  const total = paginationMeta.value.totalPages;
  if (total <= 1) return [];

  const dynamicSet = new Set<number>();
  dynamicSet.add(1);
  dynamicSet.add(total);

  if (total <= 5) {
    for (let i = 2; i < total; i += 1) {
      dynamicSet.add(i);
    }
  } else {
    for (let i = page.value - 1; i <= page.value + 1; i += 1) {
      if (i > 1 && i < total) {
        dynamicSet.add(i);
      }
    }
  }

  const sorted = Array.from(dynamicSet).sort((a, b) => a - b);
  const result: PageToken[] = [];
  let prev: number | null = null;

  for (const p of sorted) {
    if (prev !== null && p - prev > 1) {
      result.push({ type: 'ellipsis', key: `ellipsis-${prev}-${p}` });
    }
    result.push({ type: 'page', value: p, key: `page-${p}` });
    prev = p;
  }

  return result;
});

const exportToExcel = () => {
  if (!history.value.length) {
    return;
  }

  const now = new Date();
  const exportTime = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: resolvedTimeZone.value,
  }).format(now);

  const periodDescription = appliedRange.value
    ? `Periode: ${activeRangeLabel.value}`
    : 'Periode: Semua data';

  const rows: (string | number)[][] = [];
  const titleRow =
    props.title ||
    (props.type === 'IN'
      ? 'Riwayat Penambahan Stok'
      : 'Riwayat Pemakaian Bahan Bakar');

  rows.push([titleRow]);
  rows.push([periodDescription]);
  rows.push([`Diekspor: ${exportTime}`]);
  rows.push([]);
  rows.push(['No', 'Tanggal', 'Petugas', 'Jumlah (L)', 'Keterangan']);

  let totalAmount = 0;
  history.value.forEach((item, index) => {
    const amount = Number(item.amount) || 0;
    totalAmount += amount;
    rows.push([
      index + 1,
      formatDate(item.timestamp),
      item.user?.username || '-',
      amount,
      item.description || '-',
    ]);
  });

  rows.push([]);
  rows.push(['', 'Total', '', totalAmount, '']);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat');

  const filename = `riwayat-${
    props.type === 'IN' ? 'tambah-stok' : 'pemakaian'
  }-${new Date().toISOString().split('T')[0]}.xlsx`;

  XLSX.writeFile(workbook, filename);
};

defineExpose({
  refresh,
});
</script>

<template>
  <Card class="history-card dashboard-card">
    <template #title>
      <div class="history-header">
        <div>
          <p class="eyebrow mb-2">
            {{ type === 'IN' ? 'Penambahan Stok' : 'Pemakaian Bahan Bakar' }}
          </p>
          <h3 class="m-0">
            {{ title || (type === 'IN' ? 'Riwayat Penambahan Stok' : 'Riwayat Pemakaian Bahan Bakar') }}
          </h3>
        </div>
        <div class="history-actions">
          <Button
            icon="pi pi-refresh"
            label="Muat Ulang"
            size="small"
            outlined
            :loading="loading"
            @click="refresh"
          />
          <Button
            icon="pi pi-file-excel"
            label="Export Excel"
            size="small"
            severity="success"
            :disabled="!history.length"
            @click="exportToExcel"
          />
        </div>
      </div>
    </template>

    <template #content>
      <p v-if="description" class="history-description">
        {{ description }}
      </p>

      <div v-if="loading" class="history-state">
        <i class="pi pi-spin pi-spinner" aria-hidden="true" />
        <span>Memuat riwayat...</span>
      </div>

      <div v-else-if="errorMessage" class="history-state error">
        <i class="pi pi-times-circle" aria-hidden="true" />
        <span>{{ errorMessage }}</span>
        <Button label="Coba Lagi" link @click="refresh" />
      </div>

      <div v-else-if="!history.length" class="history-state empty">
        <i class="pi pi-inbox" aria-hidden="true" />
        <span>Belum ada riwayat untuk jenis transaksi ini.</span>
      </div>

      <div v-else>
        <div class="history-filters">
          <div class="filter-field">
            <label class="filter-label" for="history-range">Periode</label>
            <DatePicker
              id="history-range"
              v-model="selectedRange"
              selectionMode="range"
              dateFormat="dd M yy"
              :maxDate="new Date()"
              :disabled="loading"
              showButtonBar
              placeholder="Pilih rentang tanggal"
            />
          </div>
          <div class="filter-actions">
            <Button
              label="Terapkan"
              size="small"
              :disabled="!canApplyRange || loading"
              @click="applyDateFilter"
            />
            <Button
              v-if="appliedRange"
              label="Reset"
              size="small"
              link
              severity="secondary"
              :disabled="loading"
              @click="clearDateFilter"
            />
          </div>
        </div>

        <p v-if="appliedRange" class="active-range-label">
          Menampilkan transaksi antara {{ activeRangeLabel }}
        </p>

        <div class="history-table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Petugas</th>
                <th>Jumlah (L)</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in history" :key="item.id">
                <td>{{ index + 1 }}</td>
                <td>{{ formatDate(item.timestamp) }}</td>
                <td>{{ item.user?.username || '-' }}</td>
                <td class="amount-cell">
                  {{ formatter.format(item.amount) }}
                </td>
                <td>{{ item.description || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="paginationMeta.totalPages > 1"
          class="history-pagination"
          role="navigation"
          aria-label="Pagination riwayat"
        >
          <button
            class="page-btn nav"
            type="button"
            :disabled="!canGoPrev"
            @click="goToPage(page - 1)"
            aria-label="Halaman sebelumnya"
          >
            <i class="pi pi-chevron-left" aria-hidden="true" />
          </button>

          <template v-for="token in displayedPages" :key="token.key">
            <button
              v-if="token.type === 'page'"
              class="page-btn"
              type="button"
              :class="{ active: token.value === page }"
              @click="goToPage(token.value)"
            >
              {{ token.value }}
            </button>
            <span v-else class="pagination-ellipsis">…</span>
          </template>

          <button
            class="page-btn nav"
            type="button"
            :disabled="!canGoNext"
            @click="goToPage(page + 1)"
            aria-label="Halaman berikutnya"
          >
            <i class="pi pi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.history-card {
  margin-top: 1.5rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.history-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.history-description {
  color: var(--surface-600);
  margin-bottom: 1rem;
}

.history-table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.history-table th,
.history-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.history-table th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--surface-500);
}

.history-table tbody tr:hover {
  background: rgba(15, 23, 42, 0.03);
}

.amount-cell {
  font-weight: 600;
  color: var(--surface-900);
}

.history-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: var(--surface-700);
}

.history-state i {
  font-size: 1.35rem;
}

.history-state.error {
  color: #dc2626;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.history-state.empty {
  color: var(--surface-500);
}

.history-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 0.75rem;
}

.filter-field {
  flex: 1 1 240px;
  min-width: 220px;
}

.filter-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--surface-600);
  margin-bottom: 0.3rem;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
}

.active-range-label {
  font-size: 0.85rem;
  color: var(--surface-500);
  margin-bottom: 0.5rem;
}

.history-pagination {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 0.35rem;
}

.page-btn {
  border: 1px solid rgba(15, 23, 42, 0.15);
  background: #ffffff;
  color: #1e468c;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

.page-btn.nav {
  padding-inline: 0.65rem;
}

.page-btn.active {
  background: #1e468c;
  color: #ffffff;
  border-color: #1e468c;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pagination-ellipsis {
  padding: 0.35rem 0.5rem;
  color: var(--surface-500);
}
</style>
