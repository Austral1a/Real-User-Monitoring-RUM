<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import { formatCompact, formatMs } from "$lib/format";
  import type { PageViewRow } from "$lib/types";

  let {
    title,
    keyHeader,
    rows,
    label = (key) => key,
  }: {
    title: string;
    keyHeader: string;
    rows: PageViewRow[];
    label?: (key: string) => string;
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
          <Table.Row>
            <Table.Cell class="whitespace-normal break-all"
              >{label(row.key)}</Table.Cell
            >
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
