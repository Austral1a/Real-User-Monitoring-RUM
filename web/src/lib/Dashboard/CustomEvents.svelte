<script lang="ts">
  import * as Card from "$lib/Components/Ui/Card/index.js";
  import * as Table from "$lib/Components/Ui/Table/index.js";
  import { formatCount } from "$lib/Shared/Format";
  import { t } from "$lib/I18n";
  import type { CustomEventRow } from "$lib/Shared/Types";

  let { events }: { events: CustomEventRow[] } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{t("customEvents.title")}</Card.Title>
  </Card.Header>
  <Card.Content>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>{t("customEvents.name")}</Table.Head>
          <Table.Head class="w-24 text-end">{t("customEvents.count")}</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if events.length === 0}
          <Table.Row>
            <Table.Cell colspan={2} class="text-muted-foreground text-center">
              {t("customEvents.empty")}
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each events as event (event.key)}
            <Table.Row>
              <Table.Cell class="font-mono text-sm">{event.key}</Table.Cell>
              <Table.Cell class="text-end tabular-nums"
                >{formatCount(event.count)}</Table.Cell
              >
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
