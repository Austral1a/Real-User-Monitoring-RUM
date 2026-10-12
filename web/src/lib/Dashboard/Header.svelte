<script lang="ts">
  import { BY_OPTIONS, RANGE_OPTIONS } from "$lib/constants";
  import ToggleGroup from "$lib/ToggleGroup.svelte";
  import type { RangeKey, SessionKey } from "$lib/types";

  let {
    range = $bindable(),
    sessionKey = $bindable(),
    status,
  }: {
    range: RangeKey;
    sessionKey: SessionKey;
    status: string;
  } = $props();
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
      <span class="text-muted-foreground text-sm" aria-live="polite"
        >{status}</span
      >
    </div>
  </div>
</header>
