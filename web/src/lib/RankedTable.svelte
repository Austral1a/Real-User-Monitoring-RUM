<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import { formatCompact, formatMs } from "$lib/format";
  import type { PageViewRow } from "$lib/types";

  let {
    title,
    keyHeader,
    rows,
    selected,
    label = (key) => key,
    onSelect,
  }: {
    title: string;
    keyHeader: string;
    rows: PageViewRow[];
    selected?: string;
    label?: (key: string) => string;
    onSelect?: (key: string) => void;
  } = $props();
</script>

<article class="min-w-0">
  <h3 class="mb-2 text-sm font-semibold">{title}</h3>
  <Table.Root class="table-fixed">
    <Table.Header>
      <Table.Row>
        <Table.Head>{keyHeader}</Table.Head>
        <Table.Head class="w-16 text-end">Count</Table.Head>
        <Table.Head class="w-28 text-end">Median load</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#if rows.length === 0}
        <Table.Row>
          <Table.Cell
            colspan={3}
            class="text-muted-foreground whitespace-normal text-center"
          >
            No page views in this period
          </Table.Cell>
        </Table.Row>
      {:else}
        {#each rows as row (row.key)}
          <Table.Row class={selected === row.key ? "bg-muted" : ""}>
            <Table.Cell class="whitespace-normal break-all">
              {#if onSelect}
                <button
                  type="button"
                  class="hover:text-foreground w-full text-left break-all"
                  aria-pressed={selected === row.key}
                  onclick={() => onSelect(row.key)}
                >
                  {label(row.key)}
                </button>
              {:else}
                {label(row.key)}
              {/if}
            </Table.Cell>
            <Table.Cell class="text-end tabular-nums whitespace-nowrap"
              >{formatCompact(row.count)}</Table.Cell
            >
            <Table.Cell class="text-end tabular-nums whitespace-nowrap"
              >{formatMs(row.pageLoad)}</Table.Cell
            >
          </Table.Row>
        {/each}
      {/if}
    </Table.Body>
  </Table.Root>
</article>
