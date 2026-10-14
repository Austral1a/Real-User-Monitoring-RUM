<script lang="ts">
  import { Badge } from "$lib/Components/Ui/Badge/index.js";
  import * as Card from "$lib/Components/Ui/Card/index.js";
  import * as Table from "$lib/Components/Ui/Table/index.js";
  import { formatCount, formatDateTime } from "$lib/Shared/Format";
  import { t } from "$lib/I18n";
  import type { ErrorGroup, ErrorType } from "$lib/Shared/Types";

  import {
    errorBadge,
    groupDetails,
    isErrorScopeActive,
    sameErrorGroup,
  } from "./Helpers";

  let {
    groups,
    errorType,
    errorMessage,
    errorSource,
    host,
    status,
    onSelect,
  }: {
    groups: ErrorGroup[];
    errorType?: ErrorType;
    errorMessage?: string;
    errorSource?: string;
    host?: string;
    status?: number;
    onSelect: (group: ErrorGroup) => void;
  } = $props();

  const filtered = $derived(
    isErrorScopeActive({ errorType, errorMessage, errorSource, host, status }),
  );
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{t("errors.groupsTitle")}</Card.Title>
    {#if filtered}
      <Card.Description>{t("errors.samplesHint")}</Card.Description>
    {/if}
  </Card.Header>
  <Card.Content>
    <Table.Root overflow={false}>
      <Table.Header>
        <Table.Row>
          <Table.Head>{t("errors.type")}</Table.Head>
          <Table.Head>{t("errors.details")}</Table.Head>
          <Table.Head class="w-20 text-end">{t("errors.count")}</Table.Head>
          <Table.Head>{t("errors.lastSeen")}</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if groups.length === 0}
          <Table.Row>
            <Table.Cell colspan={4} class="text-muted-foreground text-center">
              {t("errors.empty")}
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each groups as group, index (group.type + (group.message ?? "") + (group.source ?? "") + index)}
            {@const badge = errorBadge(group.type)}
            {@const selected = sameErrorGroup(group, {
              errorType,
              errorMessage,
              errorSource,
              host,
              status,
            })}
            <Table.Row class={selected ? "bg-muted" : ""}>
              <Table.Cell>
                <Badge variant={badge.variant} class={badge.className}
                  >{badge.label}</Badge
                >
              </Table.Cell>
              <Table.Cell class="min-w-[280px]">
                <button
                  type="button"
                  class="hover:text-foreground w-full text-left"
                  aria-pressed={selected}
                  aria-label={t("errors.filterGroup")}
                  onclick={() => onSelect(group)}
                >
                  <span class="block break-words">{groupDetails(group)}</span>
                  {#if group.type === "js_error" && group.source}
                    <span
                      class="text-muted-foreground mt-0.5 block font-mono text-xs break-all"
                      >{group.source}</span
                    >
                  {/if}
                </button>
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
