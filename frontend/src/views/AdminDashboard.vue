<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useStockStore } from '@/stores/stock.store';
import apiClient from '@/services/api';

import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import { useToast } from 'primevue/usetoast';
import TransactionHistory from '@/components/TransactionHistory.vue';
import DatePicker from 'primevue/datepicker';

const authStore = useAuthStore();
const stockStore = useStockStore();
const toast = useToast();

// State untuk form
const amount = ref<number | null>(null);
const description = ref('');
const date = ref<Date | null>(new Date());
const loading = ref(false);
const stockHistoryRef = ref<InstanceType<typeof TransactionHistory> | null>(null);

const userMeta = computed(() => [
  {
    label: 'Hak Akses',
    value: authStore.user?.role?.toUpperCase() || 'ADMIN',
    icon: 'pi pi-shield'
  },
  {
    label: 'Pengguna',
    value: authStore.user?.username || '-',
    icon: 'pi pi-user'
  },
  {
    label: 'Status Stok',
    value: 'Realtime',
    icon: 'pi pi-database'
  }
]);

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

  loading.value = true;
  try {
    const now = new Date();
    const purchaseDate = date.value ? new Date(date.value) : new Date();
    if (date.value) {
      purchaseDate.setHours(
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
      );
    }

    await apiClient.post('/stock/in', {
      amount: amount.value,
      description: description.value,
      timestamp: purchaseDate.toISOString(),
    });

    // Berhasil!
    toast.add({
      severity: 'success',
      summary: 'Berhasil',
      detail: `Stok berhasil ditambah ${amount.value} liter.`,
      life: 3000,
    });

    stockStore.refreshAfterTransaction();
    stockHistoryRef.value?.refresh();

    // Reset form
    amount.value = null;
    description.value = '';
    date.value = new Date();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Gagal Menambah Stok',
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
            <p class="eyebrow mb-2">Dashboard Admin</p>
            <h2 class="m-0">Tambah Stok Bahan Bakar</h2>
          </div>
        </template>

        <template #content>
          <p class="dashboard-subtitle">
            Input pembelian atau penyesuaian stok terbaru. Sistem otomatis mencatat audit trail
            beserta pengguna yang melakukan perubahan.
          </p>

          <div class="meta-grid">
            <article class="meta-tile" v-for="meta in userMeta" :key="meta.label">
              <span class="meta-label">
                <i :class="meta.icon" />
                {{ meta.label }}
              </span>
              <div class="meta-value">{{ meta.value }}</div>
            </article>
          </div>

          <Divider />

          <form @submit.prevent="handleSubmit" class="form-stack">
            <div>
              <label for="date">Tanggal Pembelian</label>
              <DatePicker
                id="date"
                v-model="date"
                dateFormat="dd/mm/yy"
                showIcon
                showButtonBar
                class="w-full"
                inputClass="w-full"
              />
            </div>

            <div>
              <label for="amount">Jumlah (Liter)</label>
              <InputNumber
                id="amount"
                v-model="amount"
                placeholder="Masukkan jumlah liter"
                mode="decimal"
                class="w-full"
              />
            </div>

            <div>
              <label for="description">Deskripsi</label>
              <Textarea
                id="description"
                v-model="description"
                rows="3"
                autoResize
                placeholder="Contoh: Pembelian premium 5 KL dari Pertamina"
                class="w-full"
              />
            </div>

            <Button
              type="submit"
              label="Tambah Stok"
              icon="pi pi-plus"
              class="w-full"
              :loading="loading"
            />
          </form>
        </template>
      </Card>

      <TransactionHistory
        ref="stockHistoryRef"
        type="IN"
        :allow-type-filter="true"
        :allow-user-filter="true"
        title="Riwayat Penambahan Stok"
        description="Daftar transaksi penambahan stok terbaru untuk mendukung audit trail tim."
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
</style>
