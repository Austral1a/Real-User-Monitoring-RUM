<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { SESSION_TITLES } from "$lib/constants";
  import {
    formatCls,
    formatCount,
    formatDelta,
    formatMs,
    formatP50P95,
    formatP75P95,
    formatVitalGood,
  } from "$lib/format";
  import type { Overview } from "$lib/types";

  let { data }: { data: Overview } = $props();

  const p50 = $derived(data.percentiles.p50);
  const p75 = $derived(data.percentiles.p75);
  const p95 = $derived(data.percentiles.p95);
  const prev = $derived(data.previous);

  const cards = $derived([
    {
      title: SESSION_TITLES[data.sessionKey],
      value: formatCount(data.totals.sessions),
      hint: `${formatCount(data.totals.pageLoads)} page loads measured`,
      delta: formatDelta(data.totals.sessions, prev.totals.sessions),
    },
    {
      title: "Page load (p50)",
      value: formatMs(p50.pageLoad),
      hint: `${formatP75P95(p75.pageLoad, p95.pageLoad, formatMs)} · navigation load, or LCP on client-side routes`,
      delta: formatDelta(p50.pageLoad, prev.percentiles.p50.pageLoad),
    },
    {
      title: "TTFB (p50)",
      value: formatMs(p50.ttfb),
      hint: formatP75P95(p75.ttfb, p95.ttfb, formatMs),
      delta: formatDelta(p50.ttfb, prev.percentiles.p50.ttfb),
    },
    {
      title: "Start render (p50)",
      value: formatMs(p50.startRender),
      hint: formatP75P95(p75.startRender, p95.startRender, formatMs),
      delta: formatDelta(p50.startRender, prev.percentiles.p50.startRender),
    },
    {
      title: "LCP (p75)",
      value: formatMs(p75.lcp),
      hint: `${formatP50P95(p50.lcp, p95.lcp, formatMs)} · ${formatVitalGood(data.vitals.lcp)}`,
      delta: formatDelta(p75.lcp, prev.percentiles.p75.lcp),
    },
    {
      title: "INP (p75)",
      value: formatMs(p75.inp),
      hint: `${formatP50P95(p50.inp, p95.inp, formatMs)} · ${formatVitalGood(data.vitals.inp)}`,
      delta: formatDelta(p75.inp, prev.percentiles.p75.inp),
    },
    {
      title: "CLS (p75)",
      value: formatCls(p75.cls),
      hint: `${formatP50P95(p50.cls, p95.cls, formatCls)} · ${formatVitalGood(data.vitals.cls)}`,
      delta: formatDelta(p75.cls, prev.percentiles.p75.cls),
    },
    {
      title: "Errors",
      value: formatCount(data.totals.jsErrors + data.totals.networkErrors),
      hint: `${formatCount(data.totals.jsErrors)} JS · ${formatCount(data.totals.networkErrors)} network`,
      delta: formatDelta(
        data.totals.jsErrors + data.totals.networkErrors,
        prev.totals.jsErrors + prev.totals.networkErrors,
      ),
    },
    {
      title: "Crashed sessions",
      value: formatCount(data.totals.crashedSessions),
      hint: "Left before the page finished loading",
      delta: formatDelta(
        data.totals.crashedSessions,
        prev.totals.crashedSessions,
      ),
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
        {#if card.delta}
          <p class="text-muted-foreground mt-1 text-xs">{card.delta}</p>
        {/if}
      </Card.Content>
    </Card.Root>
  {/each}
</section>
