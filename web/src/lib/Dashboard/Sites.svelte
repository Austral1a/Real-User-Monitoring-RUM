<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { formatCount, formatMs } from "$lib/format";
  import type { SiteRow } from "$lib/types";

  let {
    sites,
    selected,
    onSelect,
  }: {
    sites: SiteRow[];
    selected?: string;
    onSelect: (origin: string) => void;
  } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Sites</Card.Title>
  </Card.Header>
  <Card.Content>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Origin</Table.Head>
          <Table.Head class="w-24 text-end">Sessions</Table.Head>
          <Table.Head class="w-28 text-end">Page loads</Table.Head>
          <Table.Head class="w-24 text-end">p75 LCP</Table.Head>
          <Table.Head class="w-24 text-end">JS errors</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if sites.length === 0}
          <Table.Row>
            <Table.Cell colspan={5} class="text-muted-foreground text-center">
              No sites in this period
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each sites as site (site.origin)}
            <Table.Row class={selected === site.origin ? "bg-muted" : ""}>
              <Table.Cell class="whitespace-normal break-all">
                <button
                  type="button"
                  class="hover:text-foreground w-full text-left break-all"
                  aria-pressed={selected === site.origin}
                  onclick={() => onSelect(site.origin)}
                >
                  {site.origin}
                </button>
              </Table.Cell>
              <Table.Cell class="text-end tabular-nums"
                >{formatCount(site.sessions)}</Table.Cell
              >
              <Table.Cell class="text-end tabular-nums"
                >{formatCount(site.pageLoads)}</Table.Cell
              >
              <Table.Cell class="text-end tabular-nums"
                >{formatMs(site.lcp)}</Table.Cell
              >
              <Table.Cell class="text-end tabular-nums"
                >{formatCount(site.jsErrors)}</Table.Cell
              >
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
