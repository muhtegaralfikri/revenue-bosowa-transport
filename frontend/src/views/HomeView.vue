<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useStockStore } from '@/stores/stock.store';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';

const stockStore = useStockStore();
const { summary, loading, error } = storeToRefs(stockStore);

const formatLiters = (value?: number) => {
  if (value === undefined) return '...';
  return `${value.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Liter`;
};
</script>

<template>
  <div class="p-4">
    <div class="grid">
      <div class="col-12 md:col-4">
        <Card>
          <template #title>Sisa Stok Saat Ini</template>
          <template #content>
            <div v-if="loading">
              <Skeleton height="2rem" class="mb-2"></Skeleton>
            </div>
            <div v-else-if="summary">
              <h2 class="text-3xl font-bold text-blue-600">
                {{ formatLiters(summary.currentStock) }}
              </h2>
            </div>
            <div v-else>
              <small class="text-color-secondary">Belum ada data stok.</small>
            </div>
          </template>
        </Card>
      </div>

      <div class="col-12 md:col-4">
        <Card>
          <template #title>Pemakaian Hari Ini</template>
          <template #content>
            <div v-if="loading">
              <Skeleton height="2rem" class="mb-2"></Skeleton>
            </div>
            <div v-else-if="summary">
              <h2 class="text-3xl font-bold text-orange-600">
                {{ formatLiters(summary.todayUsage) }}
              </h2>
            </div>
            <div v-else>
              <small class="text-color-secondary">Belum ada data pemakaian.</small>
            </div>
          </template>
        </Card>
      </div>

      <div class="col-12 md:col-4">
        <Card>
          <template #title>Stok Awal Hari Ini</template>
          <template #content>
            <div v-if="loading">
              <Skeleton height="2rem" class="mb-2"></Skeleton>
            </div>
            <div v-else-if="summary">
              <h2 class="text-3xl font-bold text-gray-700">
                {{ formatLiters(summary.todayInitialStock) }}
              </h2>
            </div>
            <div v-else>
              <small class="text-color-secondary">Belum ada data stok awal.</small>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <div v-if="error" class="col-12 mt-4">
      <Message severity="error">{{ error }}</Message>
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
</style>
