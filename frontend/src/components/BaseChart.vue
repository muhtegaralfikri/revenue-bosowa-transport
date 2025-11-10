<script setup lang="ts">
import {
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  type ChartType,
  type Plugin,
} from 'chart.js/auto';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  type: ChartType;
  data: ChartData | null;
  options?: ChartOptions;
  plugins?: Plugin[];
  height?: number;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: ChartJS | null = null;

const renderChart = async () => {
  await nextTick();
  if (!canvasRef.value || !props.data) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new ChartJS(canvasRef.value, {
      type: props.type,
      data: props.data,
      options: props.options,
      plugins: props.plugins,
  });
};

onMounted(renderChart);

watch(
  () => [props.data, props.options, props.type, props.plugins],
  renderChart,
  { deep: true },
);

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

<template>
  <canvas
    ref="canvasRef"
    :height="height"
    role="img"
    aria-label="Grafik"
  ></canvas>
</template>
