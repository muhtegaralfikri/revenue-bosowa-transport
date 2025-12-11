<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import { useToast } from 'primevue/usetoast';
import { useRevenueStore } from '@/stores/revenue.store';

const toast = useToast();
const revenueStore = useRevenueStore();

const isMobile = ref(window.innerWidth <= 576);

function handleResize() {
  isMobile.value = window.innerWidth <= 576;
}

onMounted(() => {
  revenueStore.fetchCompanies();
  window.addEventListener('resize', handleResize);
});

const selectedDate = ref(new Date());
const selectedType = ref<'target' | 'realisasi'>('realisasi');
const selectedCompanyId = ref<number | null>(null);
const amount = ref<number | null>(null);
const loading = ref(false);

const typeOptions = [
  { label: 'Realisasi', value: 'realisasi' },
  { label: 'Target', value: 'target' },
];

const companyOptions = computed(() => {
  return revenueStore.companies.map((c) => ({
    label: isMobile.value ? c.code : c.name,
    value: c.id,
  }));
});

const formatRupiah = (value: number | null) => {
  if (value === null) return '';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const isFormValid = computed(() => {
  return selectedDate.value && selectedCompanyId.value && amount.value && amount.value > 0;
});

const handleSubmit = async () => {
  if (!isFormValid.value) {
    toast.add({
      severity: 'warn',
      summary: 'Data belum lengkap',
      detail: 'Pastikan semua field terisi dengan benar.',
      life: 3000,
    });
    return;
  }

  loading.value = true;
  try {
    if (selectedType.value === 'realisasi') {
      await revenueStore.createRealization({
        companyId: selectedCompanyId.value!,
        date: formatDateToISO(selectedDate.value),
        amount: amount.value!,
      });
    } else {
      const year = selectedDate.value.getFullYear();
      const month = selectedDate.value.getMonth() + 1;
      await revenueStore.createTarget({
        companyId: selectedCompanyId.value!,
        year,
        month,
        targetAmount: amount.value!,
      });
    }

    toast.add({
      severity: 'success',
      summary: 'Berhasil',
      detail: `${selectedType.value === 'realisasi' ? 'Realisasi' : 'Target'} berhasil disimpan.`,
      life: 3000,
    });

    amount.value = null;
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Gagal',
      detail: error?.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.',
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
};

function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
</script>

<template>
  <div class="input-container">
    <Card class="input-card">
      <template #title>
        <span class="card-title">Input Revenue</span>
      </template>
      <template #content>
        <form @submit.prevent="handleSubmit" class="form-grid">
          <div class="form-field">
            <label for="input-date">Tanggal</label>
            <DatePicker
              id="input-date"
              v-model="selectedDate"
              dateFormat="dd/mm/yy"
              :showIcon="true"
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="input-type">Jenis</label>
            <Select
              id="input-type"
              v-model="selectedType"
              :options="typeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="input-entity">Entity</label>
            <Select
              id="input-entity"
              v-model="selectedCompanyId"
              :options="companyOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Pilih Entity"
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="input-amount">Revenue (Rp)</label>
            <InputNumber
              id="input-amount"
              v-model="amount"
              mode="currency"
              currency="IDR"
              locale="id-ID"
              :minFractionDigits="0"
              :maxFractionDigits="0"
              placeholder="Masukkan jumlah"
              class="w-full"
            />
          </div>

          <div class="form-actions">
            <button 
              type="submit" 
              class="submit-btn"
              :disabled="loading"
            >
              <i v-if="loading" class="pi pi-spinner pi-spin"></i>
              <i v-else class="pi pi-save"></i>
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.input-container {
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.input-card {
  width: 100%;
  max-width: 500px;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-field label {
  font-weight: 600;
  color: var(--surface-700);
}

.form-actions {
  margin-top: 0.5rem;
}

.submit-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background-color: #10B981;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #059669;
}

.submit-btn:disabled {
  background-color: #6EE7B7;
  cursor: wait;
}

:deep(.p-inputnumber),
:deep(.p-datepicker),
:deep(.p-select) {
  width: 100%;
}

:deep(.p-datepicker-input) {
  width: 100%;
}

@media (max-width: 576px) {
  .input-container {
    padding: 0.75rem;
  }

  .card-title {
    font-size: 1.1rem;
  }

  :deep(.p-card-body) {
    padding: 1rem;
  }
}
</style>
