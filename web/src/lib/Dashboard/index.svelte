<script lang="ts">
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import InfoIcon from "@lucide/svelte/icons/info";
  import { onDestroy } from "svelte";

  import { fetchOverview } from "$lib/api";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { REFRESH_MS } from "$lib/constants";
  import { readSearch, writeSearch } from "$lib/search";
  import type { BotKey, Overview, RangeKey, SessionKey } from "$lib/types";

  import ContextCharts from "./ContextCharts.svelte";
  import ErrorTable from "./ErrorTable.svelte";
  import Header from "./Header.svelte";
  import { isAbortError } from "./helpers";
  import PageViews from "./PageViews.svelte";
  import SummaryCards from "./SummaryCards.svelte";

  const initial = readSearch();
  let range = $state<RangeKey>(initial.range);
  let sessionKey = $state<SessionKey>(initial.sessionKey);
  let bot = $state<BotKey>(initial.bot);
  let path = $state<string | undefined>(initial.path);
  let origin = $state<string | undefined>(initial.origin);
  let lang = $state<string | undefined>(initial.lang);
  let data = $state<Overview | null>(null);
  let status = $state("");
  let loadError = $state("");
  let timer = 0;
  let generation = 0;
  let abort: AbortController | undefined;

  async function load() {
    abort?.abort();
    abort = new AbortController();
    const id = ++generation;
    const signal = abort.signal;
    clearTimeout(timer);
    status = "Loading…";
    try {
      const next = await fetchOverview(
        range,
        sessionKey,
        { path, origin, lang, bot },
        signal,
      );
      if (id !== generation) return;
      data = next;
      loadError = "";
      status = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (error) {
      if (id !== generation || isAbortError(error)) return;
      loadError = `Could not load metrics: ${error instanceof Error ? error.message : String(error)}`;
      status = "";
    } finally {
      if (id !== generation) return;
      timer = window.setTimeout(load, REFRESH_MS);
    }
  }

  $effect(() => {
    void range;
    void sessionKey;
    void bot;
    void path;
    void origin;
    void lang;
    writeSearch({ range, sessionKey, bot, path, origin, lang });
    void load();
  });

  onDestroy(() => {
    clearTimeout(timer);
    generation += 1;
    abort?.abort();
  });
</script>

<Header
  bind:range
  bind:sessionKey
  bind:bot
  bind:path
  bind:origin
  bind:lang
  {status}
/>

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
    <PageViews {data} bind:path bind:origin bind:lang />
    <ContextCharts {data} />
    <ErrorTable errors={data.recentErrors} />
  {/if}
</main>
