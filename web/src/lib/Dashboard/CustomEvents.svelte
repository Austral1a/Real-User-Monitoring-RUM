<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { formatCount } from "$lib/format";
  import type { CustomEventRow } from "$lib/types";

  let { events }: { events: CustomEventRow[] } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Custom events</Card.Title>
  </Card.Header>
  <Card.Content>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Name</Table.Head>
          <Table.Head class="w-24 text-end">Count</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if events.length === 0}
          <Table.Row>
            <Table.Cell colspan={2} class="text-muted-foreground text-center">
              No custom events in this period
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
