<script lang="ts">
  import {
    barChart,
    connectionChart,
    countryChart,
    doughnutChart,
    timingChart,
  } from "$lib/charts";
  import ChartPane from "$lib/ChartPane.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import type { Overview } from "$lib/types";

  let { data }: { data: Overview } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Timing over time (p75)</Card.Title>
  </Card.Header>
  <Card.Content>
    <ChartPane
      config={timingChart(data.series, data.range)}
      label="p75 page load, TTFB, start render, LCP and INP over time"
      wide
    />
  </Card.Content>
</Card.Root>

<section
  class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4"
  aria-label="User context"
>
  <Card.Root>
    <Card.Header>
      <Card.Title>Devices</Card.Title>
    </Card.Header>
    <Card.Content>
      <ChartPane
        config={doughnutChart(data.breakdowns.device)}
        label="Sessions by device type"
      />
    </Card.Content>
  </Card.Root>
  <Card.Root>
    <Card.Header>
      <Card.Title>Operating systems</Card.Title>
    </Card.Header>
    <Card.Content>
      <ChartPane
        config={barChart(data.breakdowns.os)}
        label="Sessions by operating system"
      />
    </Card.Content>
  </Card.Root>
  <Card.Root>
    <Card.Header>
      <Card.Title>Connection speed</Card.Title>
    </Card.Header>
    <Card.Content>
      <ChartPane
        config={connectionChart(data.breakdowns.connection)}
        label="Sessions by effective connection type"
      />
    </Card.Content>
  </Card.Root>
  <Card.Root>
    <Card.Header>
      <Card.Title>Countries</Card.Title>
    </Card.Header>
    <Card.Content>
      <ChartPane
        config={countryChart(data.breakdowns.country)}
        label="Sessions by country"
      />
    </Card.Content>
  </Card.Root>
</section>
