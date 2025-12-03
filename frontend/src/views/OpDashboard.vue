<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useStockStore } from '@/stores/stock.store';
import apiClient from '@/services/api';

import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Divider from 'primevue/divider';
import { useToast } from 'primevue/usetoast';
import TransactionHistory from '@/components/TransactionHistory.vue';

const authStore = useAuthStore();
const stockStore = useStockStore();
const toast = useToast();

// State untuk form
const date = ref(new Date()); // Default hari ini
const amount = ref<number | null>(null);
const description = ref('');
const loading = ref(false);
const usageHistoryRef = ref<InstanceType<typeof TransactionHistory> | null>(null);

const formatLiters = (value?: number | null) => {
  if (value === undefined || value === null) {
    return 'Belum ada data';
  }
  return `${value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} L`;
};

const currentStock = computed(() => stockStore.summary?.currentStock ?? null);
const stockUpdatedAt = computed(() => stockStore.summary ? new Date().toLocaleTimeString('id-ID') : null);
const stockStatusClass = computed(() => {
  const value = currentStock.value ?? 0;
  if (value <= 0) return 'text-red-500';
  if (value < 500) return 'text-orange-500';
  return 'text-green-600';
});

const userMeta = computed(() => [
  {
    label: 'Hak Akses',
    value: authStore.user?.role?.toUpperCase() || 'OPERASIONAL',
    icon: 'pi pi-briefcase'
  },
  {
    label: 'Petugas',
    value: authStore.user?.username || '-',
    icon: 'pi pi-user'
  },
  {
    label: 'Tanggal Input',
    value: new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Makassar'
    }).format(new Date()),
    icon: 'pi pi-calendar'
  }
]);

onMounted(() => {
  stockStore.fetchSummary();
});

const handleSubmit = async () => {
  if (!amount.value || amount.value <= 0) {
    toast.add({
      severity: 'warn',
      summary: 'Gagal',
      detail: 'Jumlah liter harus lebih dari 0',
      life: 3000,
    });
    return;
  }
  if (!description.value) {
    toast.add({
      severity: 'warn',
      summary: 'Gagal',
      detail: 'Uraian pemakaian wajib diisi.',
      life: 3000,
    });
    return;
  }

  loading.value = true;
  try {
    const now = new Date();
    const usageDate = date.value ? new Date(date.value) : new Date();
    if (date.value) {
      usageDate.setHours(
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
      );
    }
    const payload = {
      amount: amount.value,
      description: description.value,
      timestamp: usageDate.toISOString(),
    };

    await apiClient.post('/stock/out', payload);

    // Berhasil!
    toast.add({
      severity: 'success',
      summary: 'Berhasil',
      detail: `Pemakaian ${amount.value} liter berhasil dicatat.`,
      life: 3000,
    });

    stockStore.refreshAfterTransaction();
    usageHistoryRef.value?.refresh();

    // Reset form
    amount.value = null;
    description.value = '';
    date.value = new Date();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Gagal Mencatat Pemakaian',
      detail: error.response?.data?.message || 'Terjadi kesalahan server.',
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <section class="page-shell">
    <div class="form-shell">
      <Card class="dashboard-card">
        <template #title>
          <div>
            <p class="eyebrow mb-2">Dashboard Operasional</p>
            <h2 class="m-0">Catat Pemakaian Lapangan</h2>
          </div>
        </template>

        <template #content>
          <p class="dashboard-subtitle">
            Hadirkan bukti pemakaian dengan detail tanggal, jumlah liter, dan keterangan aktivitas.
            Data otomatis tersinkron ke admin untuk approval stok.
          </p>

          <div class="meta-grid">
            <article class="meta-tile" v-for="meta in userMeta" :key="meta.label">
              <span class="meta-label">
                <i :class="meta.icon" />
                {{ meta.label }}
              </span>
              <div class="meta-value">{{ meta.value }}</div>
            </article>
            <article class="meta-tile stock-balance">
              <span class="meta-label">
                <i class="pi pi-database" /> Sisa Stok Lapangan
              </span>
              <div class="meta-value" :class="stockStatusClass">
                {{ formatLiters(currentStock) }}
              </div>
              <small class="meta-note" v-if="stockUpdatedAt">
                Pembaruan terakhir {{ stockUpdatedAt }}
              </small>
            </article>
          </div>

          <Divider />

          <form @submit.prevent="handleSubmit" class="form-stack">
            <div>
              <label for="date">Tanggal Pemakaian</label>
              <DatePicker
                id="date"
                v-model="date"
                dateFormat="dd/mm/yy"
                showIcon
                showButtonBar
                class="w-full"
              />
            </div>

            <div>
              <label for="amount">Jumlah Pemakaian (Liter)</label>
              <InputNumber
                id="amount"
                v-model="amount"
                placeholder="Masukkan jumlah liter"
                mode="decimal"
                locale="id-ID"
                decimalSeparator=","
                :useGrouping="false"
                groupSeparator="."
                :maxFractionDigits="2"
                :minFractionDigits="0"
                class="w-full"
              />
            </div>

            <div>
              <label for="description">Uraian Pemakaian (Wajib)</label>
              <Textarea
                id="description"
                v-model="description"
                rows="3"
                autoResize
                placeholder="Contoh: Pemakaian untuk Kapal X"
                class="w-full"
              />
            </div>

            <Button
              type="submit"
              label="Kirim Data Pemakaian"
              icon="pi pi-send"
              class="w-full"
              :loading="loading"
            />
          </form>
        </template>
      </Card>

      <TransactionHistory
        ref="usageHistoryRef"
        type="OUT"
        title="Riwayat Pemakaian"
        description="Pantau catatan pemakaian terakhir untuk memastikan aktivitas lapangan tercatat rapi."
      />
    </div>
  </section>
</template>

<style scoped>
:deep(.p-inputtext),
:deep(.p-inputnumber-input),
:deep(.p-inputtextarea) {
  width: 100%;
}

.stock-balance .meta-value {
  font-size: 1.5rem;
}

.meta-note {
  display: block;
  margin-top: 0.35rem;
  color: var(--surface-500);
}

</style>
