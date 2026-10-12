<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { SESSION_TITLES } from "$lib/constants";
  import { formatCount, formatMs } from "$lib/format";
  import type { Overview } from "$lib/types";

  let { data }: { data: Overview } = $props();

  const cards = $derived([
    {
      title: SESSION_TITLES[data.sessionKey],
      value: formatCount(data.totals.sessions),
      hint: `${formatCount(data.totals.pageLoads)} page loads measured`,
    },
    {
      title: "Page load (p50)",
      value: formatMs(data.p50.pageLoad),
      hint: "Fetch start to load event end",
    },
    {
      title: "TTFB (p50)",
      value: formatMs(data.p50.ttfb),
      hint: "Request start to first byte",
    },
    {
      title: "Start render (p50)",
      value: formatMs(data.p50.startRender),
      hint: "First paint",
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
