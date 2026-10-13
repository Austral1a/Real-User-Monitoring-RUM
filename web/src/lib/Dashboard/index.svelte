<script lang="ts">
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import InfoIcon from "@lucide/svelte/icons/info";
  import { onDestroy } from "svelte";

  import { fetchOverview } from "$lib/Shared/Api";
  import * as Alert from "$lib/Components/Ui/Alert/index.js";
  import { REFRESH_MS } from "$lib/Shared/Constants";
  import { formatDateTime, formatTime } from "$lib/Shared/Format";
  import { t } from "$lib/I18n";
  import { readSearch, writeSearch } from "$lib/Shared/Search";
  import type { BotKey, Overview, RangeKey, SessionKey } from "$lib/Shared/Types";

  import ContextCharts from "./ContextCharts.svelte";
  import CustomEvents from "./CustomEvents.svelte";
  import ErrorGroups from "./ErrorGroups.svelte";
  import ErrorTable from "./ErrorTable.svelte";
  import Header from "./Header.svelte";
  import { isAbortError } from "./Helpers";
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
  let statusKind = $state<"loading" | "updated" | "">("");
  let updatedAt = $state(0);
  let loadError = $state("");
  let timer = 0;
  let generation = 0;
  let abort: AbortController | undefined;

  const status = $derived(
    statusKind === "loading"
      ? t("status.loading")
      : statusKind === "updated"
        ? t("status.updated", { time: formatTime(updatedAt) })
        : "",
  );

  const loadErrorText = $derived(
    loadError ? t("status.loadFailed", { message: loadError }) : "",
  );

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
          ? t("alerts.lastBeacon", {
              time: formatDateTime(ingest.lastBeaconAt),
            })
          : t("alerts.noBeacons"),
      );
    }
    if (rejects > 0) {
      parts.push(
        t("alerts.rejects", {
          origin: ingest.originRejected,
          rate: ingest.rateLimited,
          invalid: ingest.invalid,
        }),
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
    statusKind = "loading";
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
      updatedAt = Date.now();
      statusKind = "updated";
    } catch (error) {
      if (id !== generation || isAbortError(error)) return;
      loadError = error instanceof Error ? error.message : String(error);
      statusKind = "";
    } finally {
      if (id === generation) {
        timer = window.setTimeout(load, REFRESH_MS);
      }
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
      <Alert.Title>{t("alerts.loadTitle")}</Alert.Title>
      <Alert.Description>{loadErrorText}</Alert.Description>
    </Alert.Root>
  {/if}
  {#if ingestHint}
    <Alert.Root>
      <InfoIcon />
      <Alert.Title>{t("alerts.collectHealth")}</Alert.Title>
      <Alert.Description>{ingestHint}</Alert.Description>
    </Alert.Root>
  {/if}
  {#if data && data.totals.sessions === 0}
    <Alert.Root>
      <InfoIcon />
      <Alert.Title>{t("alerts.emptyTitle")}</Alert.Title>
      <Alert.Description>
        {t("alerts.emptyBody")}
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
