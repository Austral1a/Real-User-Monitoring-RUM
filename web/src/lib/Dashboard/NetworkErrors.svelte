<script lang="ts">
  import * as Card from "$lib/Components/Ui/Card/index.js";
  import * as Table from "$lib/Components/Ui/Table/index.js";
  import { formatCount, formatDateTime } from "$lib/Shared/Format";
  import { t } from "$lib/I18n";
  import type { NetworkGroup } from "$lib/Shared/Types";

  let {
    groups,
    host,
    status,
    onSelect,
  }: {
    groups: NetworkGroup[];
    host?: string;
    status?: number;
    onSelect: (group: NetworkGroup) => void;
  } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{t("network.title")}</Card.Title>
  </Card.Header>
  <Card.Content>
    <Table.Root overflow={false}>
      <Table.Header>
        <Table.Row>
          <Table.Head>{t("network.host")}</Table.Head>
          <Table.Head class="w-24 text-end">{t("network.status")}</Table.Head>
          <Table.Head class="w-20 text-end">{t("network.count")}</Table.Head>
          <Table.Head>{t("network.lastSeen")}</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if groups.length === 0}
          <Table.Row>
            <Table.Cell colspan={4} class="text-muted-foreground text-center">
              {t("network.empty")}
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each groups as group (group.host + ":" + group.status)}
            {@const selected = host === group.host && status === group.status}
            <Table.Row class={selected ? "bg-muted" : ""}>
              <Table.Cell class="whitespace-normal break-all">
                <button
                  type="button"
                  class="hover:text-foreground w-full text-left break-all"
                  aria-pressed={selected}
                  onclick={() => onSelect(group)}
                >
                  {group.host}
                </button>
              </Table.Cell>
              <Table.Cell class="text-end tabular-nums">
                {group.status === 0 ? t("network.failed") : group.status}
              </Table.Cell>
              <Table.Cell class="text-end tabular-nums"
                >{formatCount(group.count)}</Table.Cell
              >
              <Table.Cell class="whitespace-nowrap"
                >{formatDateTime(group.lastSeen)}</Table.Cell
              >
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
