<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { formatCount } from "$lib/format";
  import type { ErrorGroup } from "$lib/types";

  import { errorBadge, groupDetails } from "./helpers";

  let { groups }: { groups: ErrorGroup[] } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Error groups</Card.Title>
  </Card.Header>
  <Card.Content>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Type</Table.Head>
          <Table.Head>Details</Table.Head>
          <Table.Head class="w-20 text-end">Count</Table.Head>
          <Table.Head>Last seen</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if groups.length === 0}
          <Table.Row>
            <Table.Cell colspan={4} class="text-muted-foreground text-center">
              No errors in this period
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each groups as group, index (group.type + (group.message ?? "") + (group.source ?? "") + index)}
            {@const badge = errorBadge(group.type)}
            <Table.Row>
              <Table.Cell>
                <Badge variant={badge.variant} class={badge.className}
                  >{badge.label}</Badge
                >
              </Table.Cell>
              <Table.Cell class="min-w-[280px]">
                <span class="block break-words">{groupDetails(group)}</span>
                {#if group.type === "js_error" && group.source}
                  <span
                    class="text-muted-foreground mt-0.5 block font-mono text-xs break-all"
                    >{group.source}</span
                  >
                {/if}
              </Table.Cell>
              <Table.Cell class="text-end tabular-nums"
                >{formatCount(group.count)}</Table.Cell
              >
              <Table.Cell class="whitespace-nowrap"
                >{new Date(group.lastSeen).toLocaleString()}</Table.Cell
              >
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
