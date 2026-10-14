<script lang="ts">
  import { Badge } from "$lib/Components/Ui/Badge/index.js";
  import * as Card from "$lib/Components/Ui/Card/index.js";
  import * as Table from "$lib/Components/Ui/Table/index.js";
  import { countryLabel, formatDateTime } from "$lib/Shared/Format";
  import { t } from "$lib/I18n";
  import type { ErrorRow } from "$lib/Shared/Types";

  import { details, errorBadge } from "./Helpers";

  let {
    errors,
    filtered = false,
  }: { errors: ErrorRow[]; filtered?: boolean } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{t("errors.recentTitle")}</Card.Title>
    {#if filtered}
      <Card.Description>{t("errors.samplesHint")}</Card.Description>
    {/if}
  </Card.Header>
  <Card.Content>
    <Table.Root overflow={false}>
      <Table.Header>
        <Table.Row>
          <Table.Head>{t("errors.time")}</Table.Head>
          <Table.Head>{t("errors.type")}</Table.Head>
          <Table.Head>{t("errors.details")}</Table.Head>
          <Table.Head>{t("errors.page")}</Table.Head>
          <Table.Head>{t("errors.device")}</Table.Head>
          <Table.Head>{t("errors.country")}</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if errors.length === 0}
          <Table.Row>
            <Table.Cell
              colspan={6}
              class="text-muted-foreground text-center"
            >
              {t("errors.empty")}
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each errors as error, index (error.receivedAt + error.type + index)}
            {@const badge = errorBadge(error.type)}
            <Table.Row>
              <Table.Cell class="whitespace-nowrap"
                >{formatDateTime(error.receivedAt)}</Table.Cell
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
                >{error.country
                  ? countryLabel(error.country)
                  : t("format.unknown")}</Table.Cell
              >
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
