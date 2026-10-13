<script lang="ts">
  import * as Card from "$lib/Components/Ui/Card/index.js";
  import * as Table from "$lib/Components/Ui/Table/index.js";
  import { formatCount, formatMs } from "$lib/Shared/Format";
  import { t } from "$lib/I18n";
  import type { SiteRow } from "$lib/Shared/Types";

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
    <Card.Title>{t("sites.title")}</Card.Title>
  </Card.Header>
  <Card.Content>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>{t("sites.origin")}</Table.Head>
          <Table.Head class="w-24 text-end">{t("sites.sessions")}</Table.Head>
          <Table.Head class="w-28 text-end">{t("sites.pageLoads")}</Table.Head>
          <Table.Head class="w-24 text-end">{t("sites.p75Lcp")}</Table.Head>
          <Table.Head class="w-24 text-end">{t("sites.jsErrors")}</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if sites.length === 0}
          <Table.Row>
            <Table.Cell colspan={5} class="text-muted-foreground text-center">
              {t("sites.empty")}
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
