<script lang="ts">
  import * as Card from "$lib/Components/Ui/Card/index.js";
  import * as Table from "$lib/Components/Ui/Table/index.js";
  import {
    formatCount,
    formatMs,
    formatVitalGood,
  } from "$lib/Shared/Format";
  import { t } from "$lib/I18n";
  import type { ReleaseCompare, ReleaseSlice } from "$lib/Shared/Types";

  let { releases }: { releases: ReleaseCompare } = $props();

  const rows = $derived(
    [
      releases.current
        ? { label: t("releases.current"), slice: releases.current }
        : null,
      releases.previous
        ? { label: t("releases.previous"), slice: releases.previous }
        : null,
    ].filter((row): row is { label: string; slice: ReleaseSlice } => row !== null),
  );
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{t("releases.title")}</Card.Title>
  </Card.Header>
  <Card.Content>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head></Table.Head>
          {#each rows as row (row.slice.release + row.label)}
            <Table.Head>{row.label}</Table.Head>
          {/each}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if rows.length === 0}
          <Table.Row>
            <Table.Cell colspan={3} class="text-muted-foreground text-center">
              {t("releases.empty")}
            </Table.Cell>
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell class="text-muted-foreground"
              >{t("pageViews.release")}</Table.Cell
            >
            {#each rows as row (row.slice.release + "name")}
              <Table.Cell class="font-mono">{row.slice.release}</Table.Cell>
            {/each}
          </Table.Row>
          <Table.Row>
            <Table.Cell class="text-muted-foreground"
              >{t("releases.sessions")}</Table.Cell
            >
            {#each rows as row (row.slice.release + "sessions")}
              <Table.Cell class="tabular-nums"
                >{formatCount(row.slice.totals.sessions)}</Table.Cell
              >
            {/each}
          </Table.Row>
          <Table.Row>
            <Table.Cell class="text-muted-foreground"
              >{t("releases.p75Lcp")}</Table.Cell
            >
            {#each rows as row (row.slice.release + "lcp")}
              <Table.Cell class="tabular-nums"
                >{formatMs(row.slice.p75.lcp)}</Table.Cell
              >
            {/each}
          </Table.Row>
          <Table.Row>
            <Table.Cell class="text-muted-foreground"
              >{t("releases.lcpGood")}</Table.Cell
            >
            {#each rows as row (row.slice.release + "good")}
              <Table.Cell>{formatVitalGood(row.slice.lcp)}</Table.Cell>
            {/each}
          </Table.Row>
          <Table.Row>
            <Table.Cell class="text-muted-foreground"
              >{t("releases.jsErrors")}</Table.Cell
            >
            {#each rows as row (row.slice.release + "js")}
              <Table.Cell class="tabular-nums"
                >{formatCount(row.slice.totals.jsErrors)}</Table.Cell
              >
            {/each}
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
