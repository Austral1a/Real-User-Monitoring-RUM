<script lang="ts">
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import InfoIcon from "@lucide/svelte/icons/info";
  import { onDestroy } from "svelte";

  import { fetchOverview } from "$lib/api";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { REFRESH_MS } from "$lib/constants";
  import { readSearch, writeSearch } from "$lib/search";
  import type { Overview, RangeKey, SessionKey } from "$lib/types";

  import ContextCharts from "./ContextCharts.svelte";
  import ErrorTable from "./ErrorTable.svelte";
  import Header from "./Header.svelte";
  import PageViews from "./PageViews.svelte";
  import SummaryCards from "./SummaryCards.svelte";

  const initial = readSearch();
  let range = $state<RangeKey>(initial.range);
  let sessionKey = $state<SessionKey>(initial.sessionKey);
  let data = $state<Overview | null>(null);
  let status = $state("");
  let loadError = $state("");
  let timer = 0;

  async function load() {
    clearTimeout(timer);
    status = "Loading…";
    try {
      data = await fetchOverview(range, sessionKey);
      loadError = "";
      status = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (error) {
      loadError = `Could not load metrics: ${error instanceof Error ? error.message : String(error)}`;
      status = "";
    } finally {
      timer = window.setTimeout(load, REFRESH_MS);
    }
  }

  $effect(() => {
    void range;
    void sessionKey;
    writeSearch(range, sessionKey);
    void load();
  });

  onDestroy(() => clearTimeout(timer));
</script>

<Header bind:range bind:sessionKey {status} />

<main class="mx-auto grid max-w-7xl gap-4 px-6 py-5 pb-10">
  {#if loadError}
    <Alert.Root variant="destructive">
      <CircleAlertIcon />
      <Alert.Title>Could not load metrics</Alert.Title>
      <Alert.Description>{loadError}</Alert.Description>
    </Alert.Root>
  {/if}
  {#if data && data.totals.sessions === 0}
    <Alert.Root>
      <InfoIcon />
      <Alert.Title>No data for this period yet</Alert.Title>
      <Alert.Description>
        Open a page with the RUM snippet installed to start collecting.
      </Alert.Description>
    </Alert.Root>
  {/if}

  {#if data}
    <SummaryCards {data} />
    <PageViews {data} />
    <ContextCharts {data} />
    <ErrorTable errors={data.recentErrors} />
  {/if}
</main>
