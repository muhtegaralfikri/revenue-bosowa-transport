<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import XLSX from 'xlsx-js-style';
import apiClient from '@/services/api';
import { useStockStore } from '@/stores/stock.store';

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
    allowTypeFilter?: boolean;
    allowUserFilter?: boolean;
  }>(),
  {
    description: '',
    limit: 10,
    timeZone: MAKASSAR_TIME_ZONE,
    allowTypeFilter: false,
    allowUserFilter: false,
  },
);

// Always use Makassar timezone unless component caller overrides via prop.
const resolvedTimeZone = computed(() => props.timeZone || MAKASSAR_TIME_ZONE);

const stockStore = useStockStore();
const { summary } = storeToRefs(stockStore);
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

type FilterType = 'ALL' | 'IN' | 'OUT';
const selectedType = ref<FilterType>(props.type);

const typeOptions = [
  { label: 'Penambahan', value: 'IN' as FilterType },
  { label: 'Pemakaian', value: 'OUT' as FilterType },
  { label: 'Semua', value: 'ALL' as FilterType },
];

const effectiveType = computed<FilterType>(() =>
  props.allowTypeFilter ? selectedType.value : props.type,
);

const showTypeColumn = computed(() => props.allowTypeFilter && selectedType.value === 'ALL');

interface UserOption {
  label: string;
  value: string;
  role: 'admin' | 'operasional' | string;
}

const userOptions = ref<UserOption[]>([]);
const availableUserOptions = computed(() => {
  if (!props.allowUserFilter) {
    return [];
  }
  if (effectiveType.value === 'IN') {
    return userOptions.value.filter((user) => user.role === 'admin');
  }
  if (effectiveType.value === 'OUT') {
    return userOptions.value.filter((user) => user.role === 'operasional');
  }
  return userOptions.value;
});
const selectedUser = ref<string | null>(null);

watch(
  () => props.type,
  (newType) => {
    if (!props.allowTypeFilter) {
      selectedType.value = newType;
    }
  },
);

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
      limit: selectedPageSize.value,
      page: page.value,
    };

    if (effectiveType.value !== 'ALL') {
      params.type = effectiveType.value;
    }

    if (appliedRange.value) {
      params.startDate = startOfDayIso(appliedRange.value.start);
      params.endDate = endOfDayIso(appliedRange.value.end);
    }

    if (props.allowUserFilter && selectedUser.value) {
      params.userId = selectedUser.value;
    }

    if (searchTerm.value.trim()) {
      params.q = searchTerm.value.trim();
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

const loadUsers = async () => {
  if (!props.allowUserFilter) return;
  try {
    const { data } = await apiClient.get<{ id: string; username: string; email: string }[]>(
      '/users',
    );
    userOptions.value = data.map((user: any) => ({
      label: user.username || user.email,
      value: user.id,
      role: user.role,
    }));
  } catch (error) {
    console.error('Failed to load users', error);
  }
};

onMounted(async () => {
  if (props.allowUserFilter) {
    await loadUsers();
  }
  fetchHistory();
});

const refresh = () => fetchHistory();

const canApplyRange = computed(() => {
  if (!selectedRange.value) return false;
  const [start, end] = selectedRange.value;
  return Boolean(start && end);
});

let dateDebounce: ReturnType<typeof setTimeout> | null = null;
const quickRange = ref<string>('');

const quickRangeOptions = [
  { label: '1 Hari', value: '1d' },
  { label: '7 Hari', value: '7d' },
  { label: '1 Bulan', value: '30d' },
  { label: '3 Bulan', value: '90d' },
  { label: '1 Tahun', value: '365d' },
];

const applyQuickRange = (value: string) => {
  if (!value) {
    selectedRange.value = null;
    return;
  }
  const days = Number(value.replace('d', ''));
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  selectedRange.value = [start, end];
};

watch(
  () => selectedRange.value,
  (range) => {
    if (dateDebounce) {
      clearTimeout(dateDebounce);
    }
    dateDebounce = setTimeout(() => {
      if (range && range[0] && range[1]) {
        appliedRange.value = { start: range[0], end: range[1] };
      } else {
        appliedRange.value = null;
        quickRange.value = '';
      }
      page.value = 1;
      fetchHistory();
    }, 400);
  },
);

watch(quickRange, (value) => {
  applyQuickRange(value);
});

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

  const roundAmount = (value: number) => Number(Number(value || 0).toFixed(2));

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
    (effectiveType.value === 'IN'
      ? 'Riwayat Penambahan Stok'
      : effectiveType.value === 'OUT'
        ? 'Riwayat Pemakaian Bahan Bakar'
        : 'Riwayat Transaksi Stok');

  rows.push([titleRow]);
  rows.push([periodDescription]);
  rows.push([`Diekspor: ${exportTime}`]);
  rows.push([]);
  const includeTypeColumn = effectiveType.value === 'ALL';
  const headerRow = ['No', 'Tanggal', 'Petugas'];
  if (includeTypeColumn) {
    headerRow.push('Jenis');
  }
  headerRow.push('Keterangan', 'Output');
  rows.push(headerRow);

  let totalAmount = 0;
  const uniqueDates = new Set<string>();
  history.value.forEach((item, index) => {
    const amount = roundAmount(Number(item.amount) || 0);
    totalAmount += amount;
    uniqueDates.add(new Date(item.timestamp).toDateString());
    const columns: (string | number)[] = [
      index + 1,
      formatDate(item.timestamp),
      item.user?.username || '-',
    ];
    if (includeTypeColumn) {
      columns.push(item.type === 'IN' ? 'IN' : 'OUT');
    }
    columns.push(item.description || '-');
    columns.push(amount);
    rows.push(columns);
  });

  rows.push([]);
  const keteranganColIndex = headerRow.indexOf('Keterangan');
  const amountColIndex = headerRow.indexOf('Output');
  const makeSummaryRow = (label: string, value: number) => {
    const row: (string | number)[] = Array(headerRow.length).fill('');
    if (keteranganColIndex >= 0) {
      row[keteranganColIndex] = label;
    }
    if (amountColIndex >= 0) {
      row[amountColIndex] = value;
    }
    return row;
  };

  rows.push(makeSummaryRow('Total', totalAmount));

  const dayCount = uniqueDates.size || 1;
  const averageValue = roundAmount(totalAmount / dayCount);
  rows.push(makeSummaryRow('Rata-rata/Hari', averageValue));

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const headerRowIndex = rows.findIndex((r) => r[0] === 'No');
  const totalRowIndex = rows.findIndex((r) => r.includes('Total'));
  const avgRowIndex = rows.findIndex((r) => r.includes('Rata-rata/Hari'));
  const dataStartRowIndex = headerRowIndex + 1;
  const dataEndRowIndex = totalRowIndex - 1;

  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 22 }, // Tanggal
    { wch: 18 }, // Petugas
    ...(includeTypeColumn ? [{ wch: 10 }] : []), // Jenis
    { wch: 28 }, // Keterangan
    { wch: 12 }, // Output
  ];

  worksheet['!rows'] = [
    { hpt: 22 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 22 }, // header
  ];

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: headerRow.length - 1 } },
  ];

  if (headerRowIndex >= 0) {
    worksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: headerRowIndex, c: 0 },
        e: { r: headerRowIndex, c: headerRow.length - 1 },
      }),
    };
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; R += 1) {
    for (let C = range.s.c; C <= range.e.c; C += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (!cell) continue;

      // Title styling
      if (R === 0 && C === 0) {
        cell.s = {
          font: { bold: true, sz: 15, color: { rgb: '0B5D3B' } },
          alignment: { horizontal: 'left', vertical: 'center' },
        };
      }
      if (R === 1 || R === 2) {
        cell.s = {
          font: { color: { rgb: '4A5568' }, sz: 11 },
          alignment: { horizontal: 'left', vertical: 'center' },
        };
      }

      // Header styling
      if (R === headerRowIndex) {
        cell.s = {
          fill: { fgColor: { rgb: '0B5D3B' } }, // deep green
          font: { color: { rgb: 'FFFFFF' }, bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'C7D5C4' } },
            bottom: { style: 'thin', color: { rgb: 'C7D5C4' } },
            left: { style: 'thin', color: { rgb: 'C7D5C4' } },
            right: { style: 'thin', color: { rgb: 'C7D5C4' } },
          },
        };
      }

      // Data rows styling
      if (R >= dataStartRowIndex && R <= dataEndRowIndex) {
        const isStripe = (R - dataStartRowIndex) % 2 === 0;
        cell.s = {
          alignment: {
            horizontal: C === amountColIndex ? 'right' : 'left',
            vertical: 'center',
          },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
          ...(isStripe
            ? { fill: { fgColor: { rgb: 'F7FAFC' } } }
            : {}),
        };
        if (C === amountColIndex) {
          cell.z = '#.##0,##';
        }
      }

      // Total row styling
      if (R === totalRowIndex && C === amountColIndex) {
        cell.s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E6F4EA' } },
          border: {
            top: { style: 'thin', color: { rgb: 'A0AEC0' } },
            bottom: { style: 'thin', color: { rgb: 'A0AEC0' } },
            left: { style: 'thin', color: { rgb: 'A0AEC0' } },
            right: { style: 'thin', color: { rgb: 'A0AEC0' } },
          },
        };
        cell.z = '#.##0,##';
      }

      // Average row styling
      if (R === avgRowIndex && C === amountColIndex) {
        cell.s = {
          font: { italic: true, color: { rgb: '0B5D3B' } },
          border: {
            top: { style: 'thin', color: { rgb: 'A0AEC0' } },
            bottom: { style: 'thin', color: { rgb: 'A0AEC0' } },
            left: { style: 'thin', color: { rgb: 'A0AEC0' } },
            right: { style: 'thin', color: { rgb: 'A0AEC0' } },
          },
        };
        cell.z = '#.##0,##';
      }
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat');

  const filenameType =
    effectiveType.value === 'IN'
      ? 'tambah-stok'
      : effectiveType.value === 'OUT'
        ? 'pemakaian'
        : 'semua';
  const filename = `riwayat-${filenameType}-${new Date().toISOString().split('T')[0]}.xlsx`;

  XLSX.writeFile(workbook, filename);
};

defineExpose({
  refresh,
});

if (props.allowTypeFilter) {
  watch(selectedType, () => {
    page.value = 1;
    fetchHistory();
  });
}

if (props.allowUserFilter) {
  watch(selectedUser, () => {
    page.value = 1;
    fetchHistory();
  });

  watch(
    () => availableUserOptions.value,
    (options) => {
      if (!selectedUser.value) return;
      const stillExists = options.some((opt) => opt.value === selectedUser.value);
      if (!stillExists) {
        selectedUser.value = null;
      }
    },
    { deep: true },
  );
}

const resetFilters = () => {
  if (props.allowTypeFilter) {
    selectedType.value = props.type;
  }
  if (props.allowUserFilter) {
    selectedUser.value = null;
  }
  selectedPageSize.value = props.limit;
  searchTerm.value = '';
  selectedRange.value = null;
  appliedRange.value = null;
  quickRange.value = '';
  page.value = 1;
  fetchHistory();
};

const showResetAll = computed(
  () =>
    props.allowTypeFilter ||
    props.allowUserFilter ||
    Boolean(appliedRange.value) ||
    selectedPageSize.value !== props.limit ||
    Boolean(searchTerm.value.trim()),
);

const pageSizeOptions = [10, 25, 50];
const selectedPageSize = ref(props.limit);
const searchTerm = ref('');
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

watch(selectedPageSize, () => {
  page.value = 1;
  fetchHistory();
});

watch(
  searchTerm,
  (value) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      page.value = 1;
      fetchHistory();
    }, 400);
  },
  { flush: 'post' },
);

const filterSummary = computed(() => {
  const summaries: string[] = [];
  if (props.allowTypeFilter) {
    summaries.push(`Jenis: ${
      effectiveType.value === 'ALL'
        ? 'Semua'
        : effectiveType.value === 'IN'
          ? 'Penambahan'
          : 'Pemakaian'
    }`);
  }
  if (props.allowUserFilter && selectedUser.value) {
    const userLabel = userOptions.value.find((opt) => opt.value === selectedUser.value)?.label;
    summaries.push(`Petugas: ${userLabel ?? 'Unknown'}`);
  }
  if (appliedRange.value) {
    summaries.push(`Periode: ${activeRangeLabel.value}`);
  }
  if (selectedPageSize.value !== props.limit) {
    summaries.push(`Jumlah/Halaman: ${selectedPageSize.value}`);
  }
  if (searchTerm.value.trim()) {
    summaries.push(`Pencarian: "${searchTerm.value.trim()}"`);
  }
  return summaries;
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
        <Button
          v-if="showResetAll"
          label="Reset filter"
          link
          size="small"
          @click="resetFilters"
        />
      </div>

      <div v-else>
        <div class="history-filters">
          <div
            v-if="props.allowTypeFilter"
            class="filter-field type-filter"
          >
            <label class="filter-label" for="history-type">Jenis</label>
            <Select
              id="history-type"
              v-model="selectedType"
              :options="typeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
          <div
            v-if="props.allowUserFilter"
            class="filter-field user-filter"
          >
            <label class="filter-label" for="history-user">Petugas</label>
            <Select
              id="history-user"
              v-model="selectedUser"
              :options="userOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Semua petugas"
              showClear
              class="w-full"
            />
          </div>
          <div class="filter-field search-filter">
            <label class="filter-label" for="history-search">Cari deskripsi/petugas</label>
            <InputText
              id="history-search"
              v-model="searchTerm"
              class="w-full"
              placeholder="Masukkan kata kunci"
            />
          </div>
          <div class="filter-field period-filter">
            <label class="filter-label" for="history-range">Periode</label>
            <DatePicker
              id="history-range"
              v-model="selectedRange"
              class="w-full"
              selectionMode="range"
              dateFormat="dd M yy"
              :maxDate="new Date()"
              :disabled="loading"
              showButtonBar
              inputClass="w-full"
              placeholder="Pilih rentang tanggal"
            />
          </div>
          <div class="filter-field quick-range-filter">
            <label class="filter-label" for="history-quick-range">Rentang Cepat</label>
            <Select
              id="history-quick-range"
              v-model="quickRange"
              :options="quickRangeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Pilih rentang cepat"
              class="w-full"
            />
          </div>
          <div class="filter-field page-size-filter">
            <label class="filter-label" for="history-page-size">Jumlah/Halaman</label>
            <Select
              id="history-page-size"
              v-model="selectedPageSize"
              :options="pageSizeOptions"
              class="w-full"
            />
          </div>
          <div class="filter-actions">
            <Button
              v-if="showResetAll"
              label="Reset Semua"
              size="small"
              link
              severity="secondary"
              :disabled="loading"
              @click="resetFilters"
            />
          </div>
        </div>

        <p v-if="appliedRange" class="active-range-label">
          Menampilkan transaksi antara {{ activeRangeLabel }}
        </p>
        <p v-if="filterSummary.length" class="active-filters">
          Filter aktif: {{ filterSummary.join(', ') }}
        </p>

        <div class="history-table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Petugas</th>
                <th v-if="showTypeColumn">Jenis</th>
                <th>Jumlah (L)</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in history" :key="item.id">
                <td>{{ index + 1 }}</td>
                <td>{{ formatDate(item.timestamp) }}</td>
                <td>{{ item.user?.username || '-' }}</td>
                <td v-if="showTypeColumn">{{ item.type === 'IN' ? 'IN' : 'OUT' }}</td>
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

@media screen and (min-width: 768px) {
  .filter-field {
    flex: 1 1 calc(33.33% - 1rem);
    min-width: 220px;
  }
}

@media screen and (max-width: 767px) {
  .filter-field {
    flex: 1 1 100%;
  }
}

.filter-field {
  flex: 1 1 220px;
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

.active-filters {
  font-size: 0.85rem;
  color: var(--surface-600);
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

.filter-field.quick-range-filter {
  flex: 1 1 220px;
}

@media screen and (max-width: 767px) {
  .filter-field.quick-range-filter {
    flex: 1 1 100%;
  }
}
</style>
