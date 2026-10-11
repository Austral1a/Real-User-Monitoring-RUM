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

<header class="topbar">
  <h1>Real User Monitoring</h1>
  <div class="controls">
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
    <span class="status" aria-live="polite">{status}</span>
  </div>
</header>
