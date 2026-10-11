<script lang="ts">
  import { onDestroy } from "svelte";

  import { fetchOverview } from "$lib/api";
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

<main>
  {#if loadError}
    <p class="banner banner-error" role="alert">{loadError}</p>
  {/if}
  {#if data && data.totals.sessions === 0}
    <p class="banner">
      No data for this period yet. Open a page with the RUM snippet installed to
      start collecting.
    </p>
  {/if}

  {#if data}
    <SummaryCards {data} />
    <PageViews {data} />
    <ContextCharts {data} />
    <ErrorTable errors={data.recentErrors} />
  {/if}
</main>
