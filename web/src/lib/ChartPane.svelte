<script lang="ts">
  import type { ChartConfiguration } from "chart.js";
  import { Chart } from "chart.js/auto";

  import { cn } from "$lib/utils.js";

  let {
    config,
    label,
    wide = false,
  }: {
    config: ChartConfiguration;
    label: string;
    wide?: boolean;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  $effect(() => {
    const next = config;
    const el = canvas;
    if (!el) return;
    const chart = new Chart(el, next);
    return () => chart.destroy();
  });
</script>

<div class={cn("relative mt-3 h-60", wide && "h-[300px]")}>
  <canvas bind:this={canvas} aria-label={label}></canvas>
</div>
