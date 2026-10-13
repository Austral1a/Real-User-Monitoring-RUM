<script lang="ts">
  import * as Card from "$lib/Components/Ui/Card/index.js";
  import {
    formatCls,
    formatCount,
    formatDelta,
    formatMs,
    formatP50P95,
    formatP75P95,
    formatVitalGood,
  } from "$lib/Shared/Format";
  import { t, type MessageKey } from "$lib/I18n";
  import type { Overview, SessionKey } from "$lib/Shared/Types";

  let { data }: { data: Overview } = $props();

  const SESSION_TITLE_KEYS: Record<SessionKey, MessageKey> = {
    session: "summary.sessions",
    ua: "summary.sessionsByUa",
    ip: "summary.sessionsByIp",
    "ua-ip": "summary.sessionsByUaIp",
  };

  const p50 = $derived(data.percentiles.p50);
  const p75 = $derived(data.percentiles.p75);
  const p95 = $derived(data.percentiles.p95);
  const prev = $derived(data.previous);

  const cards = $derived([
    {
      title: t(SESSION_TITLE_KEYS[data.sessionKey]),
      value: formatCount(data.totals.sessions),
      hint: t("summary.pageLoadsMeasured", {
        count: formatCount(data.totals.pageLoads),
      }),
      delta: formatDelta(data.totals.sessions, prev.totals.sessions),
    },
    {
      title: t("summary.pageLoadP50"),
      value: formatMs(p50.pageLoad),
      hint: `${formatP75P95(p75.pageLoad, p95.pageLoad, formatMs)} · ${t("summary.pageLoadHint")}`,
      delta: formatDelta(p50.pageLoad, prev.percentiles.p50.pageLoad),
    },
    {
      title: t("summary.ttfbP50"),
      value: formatMs(p50.ttfb),
      hint: formatP75P95(p75.ttfb, p95.ttfb, formatMs),
      delta: formatDelta(p50.ttfb, prev.percentiles.p50.ttfb),
    },
    {
      title: t("summary.startRenderP50"),
      value: formatMs(p50.startRender),
      hint: formatP75P95(p75.startRender, p95.startRender, formatMs),
      delta: formatDelta(p50.startRender, prev.percentiles.p50.startRender),
    },
    {
      title: t("summary.lcpP75"),
      value: formatMs(p75.lcp),
      hint: `${formatP50P95(p50.lcp, p95.lcp, formatMs)} · ${formatVitalGood(data.vitals.lcp)}`,
      delta: formatDelta(p75.lcp, prev.percentiles.p75.lcp),
    },
    {
      title: t("summary.inpP75"),
      value: formatMs(p75.inp),
      hint: `${formatP50P95(p50.inp, p95.inp, formatMs)} · ${formatVitalGood(data.vitals.inp)}`,
      delta: formatDelta(p75.inp, prev.percentiles.p75.inp),
    },
    {
      title: t("summary.clsP75"),
      value: formatCls(p75.cls),
      hint: `${formatP50P95(p50.cls, p95.cls, formatCls)} · ${formatVitalGood(data.vitals.cls)}`,
      delta: formatDelta(p75.cls, prev.percentiles.p75.cls),
    },
    {
      title: t("summary.errors"),
      value: formatCount(data.totals.jsErrors + data.totals.networkErrors),
      hint: t("summary.errorsHint", {
        js: formatCount(data.totals.jsErrors),
        network: formatCount(data.totals.networkErrors),
      }),
      delta: formatDelta(
        data.totals.jsErrors + data.totals.networkErrors,
        prev.totals.jsErrors + prev.totals.networkErrors,
      ),
    },
    {
      title: t("summary.crashedSessions"),
      value: formatCount(data.totals.crashedSessions),
      hint: t("summary.crashHint"),
      delta: formatDelta(
        data.totals.crashedSessions,
        prev.totals.crashedSessions,
      ),
    },
  ]);
</script>

<section
  class="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3"
  aria-label={t("summary.aria")}
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
