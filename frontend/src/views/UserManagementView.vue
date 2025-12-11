<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Skeleton from 'primevue/skeleton';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import apiClient from '@/services/api';

interface UserItem {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

const toast = useToast();

const users = ref<UserItem[]>([]);
const listLoading = ref(true);
const listError = ref<string | null>(null);

const createForm = reactive({
  username: '',
  email: '',
  password: '',
});
const createLoading = ref(false);

const editDialogVisible = ref(false);
const editTargetId = ref<string | null>(null);
const editForm = reactive({
  username: '',
  email: '',
  password: '',
});
const editLoading = ref(false);

const deleteLoadingId = ref<string | null>(null);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const resetCreateForm = () => {
  createForm.username = '';
  createForm.email = '';
  createForm.password = '';
};

const fetchUsers = async () => {
  listLoading.value = true;
  listError.value = null;
  try {
    const { data } = await apiClient.get<UserItem[]>('/users');
    users.value = data;
  } catch (error: any) {
    console.error('Failed to fetch users', error);
    listError.value =
      error?.response?.data?.message || 'Gagal memuat daftar pengguna.';
  } finally {
    listLoading.value = false;
  }
};

const handleCreate = async () => {
  if (!createForm.username || !createForm.email || !createForm.password) {
    toast.add({
      severity: 'warn',
      summary: 'Data belum lengkap',
      detail: 'Nama, email, dan password wajib diisi.',
      life: 3000,
    });
    return;
  }
  createLoading.value = true;
  try {
    await apiClient.post('/users', {
      username: createForm.username,
      email: createForm.email,
      password: createForm.password,
    });
    toast.add({
      severity: 'success',
      summary: 'Pengguna dibuat',
      detail: `${createForm.username} berhasil ditambahkan.`,
      life: 3000,
    });
    resetCreateForm();
    await fetchUsers();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Gagal',
      detail: error?.response?.data?.message || 'Tidak bisa membuat user.',
      life: 3000,
    });
  } finally {
    createLoading.value = false;
  }
};

const openEdit = (user: UserItem) => {
  editTargetId.value = user.id;
  editForm.username = user.username;
  editForm.email = user.email;
  editForm.password = '';
  editDialogVisible.value = true;
};

const handleEdit = async () => {
  if (!editTargetId.value) return;
  if (!editForm.username || !editForm.email) {
    toast.add({
      severity: 'warn',
      summary: 'Data belum lengkap',
      detail: 'Nama dan email wajib diisi.',
      life: 3000,
    });
    return;
  }
  editLoading.value = true;
  try {
    const payload: Record<string, string> = {
      username: editForm.username,
      email: editForm.email,
    };
    if (editForm.password) {
      payload.password = editForm.password;
    }
    await apiClient.patch(`/users/${editTargetId.value}`, payload);
    toast.add({
      severity: 'success',
      summary: 'Perubahan disimpan',
      detail: `${editForm.username} berhasil diperbarui.`,
      life: 3000,
    });
    editDialogVisible.value = false;
    await fetchUsers();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Gagal menyimpan',
      detail: error?.response?.data?.message || 'Tidak bisa memperbarui user.',
      life: 3000,
    });
  } finally {
    editLoading.value = false;
  }
};

const handleDelete = async (user: UserItem) => {
  const confirmation = window.confirm(
    `Hapus pengguna ${user.username}? Tindakan ini tidak dapat dibatalkan.`,
  );
  if (!confirmation) return;
  deleteLoadingId.value = user.id;
  try {
    await apiClient.delete(`/users/${user.id}`);
    toast.add({
      severity: 'info',
      summary: 'Pengguna dihapus',
      detail: `${user.username} telah dihapus.`,
      life: 3000,
    });
    await fetchUsers();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Gagal hapus',
      detail: error?.response?.data?.message || 'Tidak bisa menghapus user.',
      life: 3000,
    });
  } finally {
    deleteLoadingId.value = null;
  }
};

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <section class="page-shell">
    <div class="user-shell">
      <Card class="dashboard-card">
        <template #title>
          <div>
            <p class="eyebrow mb-2">Kelola Pengguna</p>
            <h2 class="m-0">Tambah Pengguna Baru</h2>
          </div>
        </template>
        <template #content>
          <form @submit.prevent="handleCreate" class="form-grid">
            <div class="form-field">
              <label for="create-username">Nama Lengkap</label>
              <InputText
                id="create-username"
                v-model="createForm.username"
                placeholder="Mis. Admin Bosowa"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="create-email">Email</label>
              <InputText
                id="create-email"
                v-model="createForm.email"
                type="email"
                placeholder="admin@example.com"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="create-password">Password Awal</label>
              <Password
                id="create-password"
                v-model="createForm.password"
                toggleMask
                :feedback="false"
                placeholder="Minimal 8 karakter"
                class="w-full"
              />
            </div>
            <Button
              type="submit"
              label="Simpan Pengguna"
              icon="pi pi-user-plus"
              class="w-full"
              :loading="createLoading"
            />
          </form>
        </template>
      </Card>

      <Card class="dashboard-card">
        <template #title>
          <div class="table-header">
            <div>
              <p class="eyebrow mb-2">Daftar Pengguna</p>
              <h2 class="m-0">Pengguna Aktif</h2>
            </div>
          </div>
        </template>
        <template #content>
          <Message v-if="listError" severity="error">{{ listError }}</Message>
          <div v-else class="user-table-wrapper">
            <table class="user-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Dibuat</th>
                  <th class="actions-col">Aksi</th>
                </tr>
              </thead>
              <tbody v-if="listLoading">
                <tr>
                  <td colspan="4">
                    <Skeleton height="2rem" class="mb-2" />
                    <Skeleton height="2rem" class="mb-2" />
                  </td>
                </tr>
              </tbody>
              <tbody v-else-if="users.length === 0">
                <tr>
                  <td colspan="4" class="empty-state">
                    Belum ada pengguna lain.
                  </td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr v-for="user in users" :key="user.id">
                  <td>
                    <span class="user-name">{{ user.username }}</span>
                  </td>
                  <td>{{ user.email }}</td>
                  <td>{{ formatDate(user.createdAt) }}</td>
                  <td class="actions-col">
                    <Button
                      label="Edit"
                      size="small"
                      icon="pi pi-pencil"
                      class="p-button-text"
                      @click="openEdit(user)"
                    />
                    <Button
                      label="Hapus"
                      size="small"
                      icon="pi pi-trash"
                      severity="danger"
                      :loading="deleteLoadingId === user.id"
                      class="p-button-text"
                      @click="handleDelete(user)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </Card>
    </div>

    <Dialog
      v-model:visible="editDialogVisible"
      modal
      :style="{ width: '480px' }"
      header="Edit Pengguna"
      :dismissableMask="true"
      :closable="!editLoading"
    >
      <form @submit.prevent="handleEdit" class="form-stack">
        <div>
          <label for="edit-username">Nama Lengkap</label>
          <InputText
            id="edit-username"
            v-model="editForm.username"
            class="w-full"
          />
        </div>
        <div>
          <label for="edit-email">Email</label>
          <InputText id="edit-email" v-model="editForm.email" type="email" class="w-full" />
        </div>
        <div>
          <label for="edit-password">Password Baru (Opsional)</label>
          <Password
            id="edit-password"
            v-model="editForm.password"
            toggleMask
            :feedback="false"
            class="w-full"
            placeholder="Biarkan kosong jika tidak diganti"
          />
        </div>
        <div class="dialog-actions">
          <Button
            type="button"
            label="Batal"
            class="p-button-text"
            :disabled="editLoading"
            @click="editDialogVisible = false"
          />
          <Button
            type="submit"
            label="Simpan"
            icon="pi pi-check"
            :loading="editLoading"
          />
        </div>
      </form>
    </Dialog>
  </section>
</template>

<style scoped>
.user-shell {
  width: min(1100px, 100%);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.user-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th,
.user-table td {
  padding: 0.85rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  text-align: left;
}

.user-table th {
  font-weight: 600;
  color: var(--surface-600);
}

.user-name {
  font-weight: 600;
}

.actions-col {
  white-space: nowrap;
  text-align: right;
}

.empty-state {
  text-align: center;
  color: var(--surface-500);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

:deep(.p-password),
:deep(.p-dropdown),
:deep(.p-inputtext) {
  width: 100%;
}
</style>
