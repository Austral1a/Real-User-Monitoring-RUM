<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { countryLabel } from "$lib/format";
  import type { ErrorRow } from "$lib/types";

  import { details, errorBadge } from "./helpers";

  let { errors }: { errors: ErrorRow[] } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Recent errors</Card.Title>
  </Card.Header>
  <Card.Content>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Time</Table.Head>
          <Table.Head>Type</Table.Head>
          <Table.Head>Details</Table.Head>
          <Table.Head>Page</Table.Head>
          <Table.Head>Device</Table.Head>
          <Table.Head>Country</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if errors.length === 0}
          <Table.Row>
            <Table.Cell
              colspan={6}
              class="text-muted-foreground text-center"
            >
              No errors in this period
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each errors as error, index (error.receivedAt + error.type + index)}
            {@const badge = errorBadge(error.type)}
            <Table.Row>
              <Table.Cell class="whitespace-nowrap"
                >{new Date(error.receivedAt).toLocaleString()}</Table.Cell
              >
              <Table.Cell>
                <Badge variant={badge.variant} class={badge.className}
                  >{badge.label}</Badge
                >
              </Table.Cell>
              <Table.Cell class="min-w-[280px]">
                <span class="block break-words">{details(error)}</span>
                {#if error.type === "js_error" && error.source}
                  <span
                    class="text-muted-foreground mt-0.5 block font-mono text-xs break-all"
                    >{error.source}</span
                  >
                {/if}
              </Table.Cell>
              <Table.Cell>{error.path}</Table.Cell>
              <Table.Cell class="whitespace-nowrap"
                >{error.device} · {error.os}</Table.Cell
              >
              <Table.Cell class="whitespace-nowrap"
                >{error.country ? countryLabel(error.country) : "Unknown"}</Table.Cell
              >
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
