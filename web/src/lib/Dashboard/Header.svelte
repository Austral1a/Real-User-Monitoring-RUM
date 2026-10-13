<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { BOT_OPTIONS, BY_OPTIONS, RANGE_OPTIONS } from "$lib/constants";
  import ThemeSwitch from "$lib/ThemeSwitch.svelte";
  import ToggleGroup from "$lib/ToggleGroup.svelte";
  import type { BotKey, RangeKey, SessionKey } from "$lib/types";

  import { filterChips } from "./helpers";

  let {
    range = $bindable(),
    sessionKey = $bindable(),
    bot = $bindable(),
    path = $bindable(),
    origin = $bindable(),
    lang = $bindable(),
    status,
  }: {
    range: RangeKey;
    sessionKey: SessionKey;
    bot: BotKey;
    path?: string;
    origin?: string;
    lang?: string;
    status: string;
  } = $props();

  const chips = $derived(filterChips(path, origin, lang));

  function clear(key: "path" | "origin" | "lang") {
    if (key === "path") path = undefined;
    else if (key === "origin") origin = undefined;
    else lang = undefined;
  }

  function clearAll() {
    path = undefined;
    origin = undefined;
    lang = undefined;
  }
</script>

<header class="bg-card border-b">
  <div
    class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4"
  >
    <h1 class="text-lg font-semibold tracking-tight">Real User Monitoring</h1>
    <div class="flex flex-wrap items-center gap-3">
      <ToggleGroup
        labelledBy="Time range"
        options={RANGE_OPTIONS}
        bind:value={range}
      />
      <ToggleGroup
        label="Sessions by"
        labelledBy="session-key-label"
        options={BY_OPTIONS}
        bind:value={sessionKey}
      />
      <ToggleGroup
        label="Bot"
        labelledBy="bot-label"
        options={BOT_OPTIONS}
        bind:value={bot}
      />
      <span class="text-muted-foreground text-sm" aria-live="polite"
        >{status}</span
      >
      <ThemeSwitch />
    </div>
  </div>
  {#if chips.length > 0}
    <div
      class="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 pb-3"
      aria-label="Active filters"
    >
      {#each chips as chip (chip.key)}
        <Badge variant="secondary" class="gap-1 font-normal">
          <span>{chip.label}: {chip.value}</span>
          <button
            type="button"
            class="hover:text-foreground ml-1"
            aria-label="Clear {chip.label} filter"
            onclick={() => clear(chip.key)}
          >
            ×
          </button>
        </Badge>
      {/each}
      <button
        type="button"
        class="text-muted-foreground hover:text-foreground text-xs"
        onclick={clearAll}
      >
        Clear filters
      </button>
    </div>
  {/if}
</header>
