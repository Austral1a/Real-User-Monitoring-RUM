<script lang="ts">
  import * as Table from "$lib/Components/Ui/Table/index.js";
  import { t } from "$lib/I18n";
  import { formatCompact, formatMs } from "$lib/Shared/Format";
  import type { PageViewRow } from "$lib/Shared/Types";

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
        <Table.Head class="w-16 text-end">{t("pageViews.count")}</Table.Head>
        <Table.Head class="w-28 text-end">{t("pageViews.medianLoad")}</Table.Head>
        <Table.Head class="w-24 text-end">{t("pageViews.p75Lcp")}</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#if rows.length === 0}
        <Table.Row>
          <Table.Cell
            colspan={4}
            class="text-muted-foreground whitespace-normal text-center"
          >
            {t("pageViews.empty")}
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
            <Table.Cell class="text-end tabular-nums whitespace-nowrap"
              >{formatMs(row.lcp)}</Table.Cell
            >
          </Table.Row>
        {/each}
      {/if}
    </Table.Body>
  </Table.Root>
</article>
