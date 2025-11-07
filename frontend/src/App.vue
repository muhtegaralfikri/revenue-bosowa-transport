<script setup lang="ts">
import { RouterView } from 'vue-router';

// 1. Impor Navbar
import Navbar from './components/Navbar.vue';
</script>

<template>
  <Navbar />

  <RouterView />
</template>