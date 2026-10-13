<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { SESSION_TITLES } from "$lib/constants";
  import {
    formatCls,
    formatCount,
    formatMs,
    formatP50P95,
    formatP75P95,
  } from "$lib/format";
  import type { Overview } from "$lib/types";

  let { data }: { data: Overview } = $props();

  const p50 = $derived(data.percentiles.p50);
  const p75 = $derived(data.percentiles.p75);
  const p95 = $derived(data.percentiles.p95);

  const cards = $derived([
    {
      title: SESSION_TITLES[data.sessionKey],
      value: formatCount(data.totals.sessions),
      hint: `${formatCount(data.totals.pageLoads)} page loads measured`,
    },
    {
      title: "Page load (p50)",
      value: formatMs(p50.pageLoad),
      hint: `${formatP75P95(p75.pageLoad, p95.pageLoad, formatMs)} · navigation load, or LCP on client-side routes`,
    },
    {
      title: "TTFB (p50)",
      value: formatMs(p50.ttfb),
      hint: formatP75P95(p75.ttfb, p95.ttfb, formatMs),
    },
    {
      title: "Start render (p50)",
      value: formatMs(p50.startRender),
      hint: formatP75P95(p75.startRender, p95.startRender, formatMs),
    },
    {
      title: "LCP (p75)",
      value: formatMs(p75.lcp),
      hint: formatP50P95(p50.lcp, p95.lcp, formatMs),
    },
    {
      title: "INP (p75)",
      value: formatMs(p75.inp),
      hint: formatP50P95(p50.inp, p95.inp, formatMs),
    },
    {
      title: "CLS (p75)",
      value: formatCls(p75.cls),
      hint: formatP50P95(p50.cls, p95.cls, formatCls),
    },
    {
      title: "Errors",
      value: formatCount(data.totals.jsErrors + data.totals.networkErrors),
      hint: `${formatCount(data.totals.jsErrors)} JS · ${formatCount(data.totals.networkErrors)} network`,
    },
    {
      title: "Crashed sessions",
      value: formatCount(data.totals.crashedSessions),
      hint: "Left before the page finished loading",
    },
  ]);
</script>

<section
  class="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3"
  aria-label="Summary"
>
  {#each cards as card (card.title)}
    <Card.Root size="sm">
      <Card.Header>
        <Card.Description>{card.title}</Card.Description>
        <Card.Title
          class="text-2xl font-semibold tabular-nums group-data-[size=sm]/card:text-2xl"
          >{card.value}</Card.Title
        >
      </Card.Header>
      <Card.Content>
        <p class="text-muted-foreground text-xs">{card.hint}</p>
      </Card.Content>
    </Card.Root>
  {/each}
</section>
