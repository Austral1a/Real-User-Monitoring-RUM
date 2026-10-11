<script lang="ts">
  import {
    barChart,
    connectionChart,
    countryChart,
    doughnutChart,
    timingChart,
  } from "$lib/charts";
  import ChartPane from "$lib/ChartPane.svelte";
  import type { Overview } from "$lib/types";

  let { data }: { data: Overview } = $props();
</script>

<section class="panel">
  <h2>Timing over time (p50)</h2>
  <ChartPane
    config={timingChart(data.series, data.range)}
    label="Median page load, time to first byte and start render over time"
    wide
  />
</section>

<section class="grid" aria-label="User context">
  <article class="panel">
    <h2>Devices</h2>
    <ChartPane
      config={doughnutChart(data.breakdowns.device)}
      label="Sessions by device type"
    />
  </article>
  <article class="panel">
    <h2>Operating systems</h2>
    <ChartPane
      config={barChart(data.breakdowns.os)}
      label="Sessions by operating system"
    />
  </article>
  <article class="panel">
    <h2>Connection speed</h2>
    <ChartPane
      config={connectionChart(data.breakdowns.connection)}
      label="Sessions by effective connection type"
    />
  </article>
  <article class="panel">
    <h2>Countries</h2>
    <ChartPane
      config={countryChart(data.breakdowns.country)}
      label="Sessions by country"
    />
  </article>
</section>
