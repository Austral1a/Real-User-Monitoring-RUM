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
  import CustomEvents from "./CustomEvents.svelte";
  import ErrorGroups from "./ErrorGroups.svelte";
  import ErrorTable from "./ErrorTable.svelte";
  import Header from "./Header.svelte";
  import { isAbortError } from "./helpers";
  import PageViews from "./PageViews.svelte";
  import Sites from "./Sites.svelte";
  import SummaryCards from "./SummaryCards.svelte";

  const STALE_MS = 2 * 60 * 60 * 1000;

  const initial = readSearch();
  let range = $state<RangeKey>(initial.range);
  let sessionKey = $state<SessionKey>(initial.sessionKey);
  let bot = $state<BotKey>(initial.bot);
  let path = $state<string | undefined>(initial.path);
  let origin = $state<string | undefined>(initial.origin);
  let lang = $state<string | undefined>(initial.lang);
  let locale = $state<string | undefined>(initial.locale);
  let release = $state<string | undefined>(initial.release);
  let data = $state<Overview | null>(null);
  let status = $state("");
  let loadError = $state("");
  let timer = 0;
  let generation = 0;
  let abort: AbortController | undefined;

  const ingestHint = $derived.by(() => {
    if (!data) return "";
    const { ingest } = data;
    const rejects = ingest.originRejected + ingest.rateLimited + ingest.invalid;
    const stale =
      ingest.lastBeaconAt === null || Date.now() - ingest.lastBeaconAt > STALE_MS;
    if (!stale && rejects === 0) return "";
    const parts = [];
    if (stale) {
      parts.push(
        ingest.lastBeaconAt
          ? `Last beacon ${new Date(ingest.lastBeaconAt).toLocaleString()}`
          : "No beacons since this process started",
      );
    }
    if (rejects > 0) {
      parts.push(
        `${ingest.originRejected} origin rejected · ${ingest.rateLimited} rate limited · ${ingest.invalid} invalid`,
      );
    }
    return parts.join(". ");
  });

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
        { path, origin, lang, locale, release, bot },
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
    void locale;
    void release;
    writeSearch({ range, sessionKey, bot, path, origin, lang, locale, release });
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
  bind:locale
  bind:release
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
  {#if ingestHint}
    <Alert.Root>
      <InfoIcon />
      <Alert.Title>Collect health</Alert.Title>
      <Alert.Description>{ingestHint}</Alert.Description>
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
    <Sites
      sites={data.sites}
      selected={origin}
      onSelect={(value) => (origin = origin === value ? undefined : value)}
    />
    <PageViews {data} bind:path bind:origin bind:lang bind:locale bind:release />
    <ContextCharts {data} />
    <CustomEvents events={data.customEvents} />
    <ErrorGroups groups={data.errorGroups} />
    <ErrorTable errors={data.recentErrors} />
  {/if}
</main>
