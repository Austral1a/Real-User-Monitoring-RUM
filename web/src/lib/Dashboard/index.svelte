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
  import type {
    BotKey,
    ErrorGroup,
    ErrorType,
    NavKey,
    NetworkGroup,
    Overview,
    RangeKey,
    SessionKey,
  } from "$lib/Shared/Types";

  import ContextCharts from "./ContextCharts.svelte";
  import CustomEvents from "./CustomEvents.svelte";
  import ErrorGroups from "./ErrorGroups.svelte";
  import ErrorTable from "./ErrorTable.svelte";
  import Header from "./Header.svelte";
  import {
    isAbortError,
    isErrorScopeActive,
    toggleErrorGroup,
    toggleNetworkGroup,
  } from "./Helpers";
  import NetworkErrors from "./NetworkErrors.svelte";
  import PageViews from "./PageViews.svelte";
  import ReleaseCompare from "./ReleaseCompare.svelte";
  import Sites from "./Sites.svelte";
  import SummaryCards from "./SummaryCards.svelte";

  const STALE_MS = 2 * 60 * 60 * 1000;

  const initial = readSearch();
  let range = $state<RangeKey>(initial.range);
  let sessionKey = $state<SessionKey>(initial.sessionKey);
  let bot = $state<BotKey>(initial.bot);
  let nav = $state<NavKey>(initial.nav);
  let path = $state<string | undefined>(initial.path);
  let origin = $state<string | undefined>(initial.origin);
  let lang = $state<string | undefined>(initial.lang);
  let locale = $state<string | undefined>(initial.locale);
  let release = $state<string | undefined>(initial.release);
  let errorType = $state<ErrorType | undefined>(initial.errorType);
  let errorMessage = $state<string | undefined>(initial.errorMessage);
  let errorSource = $state<string | undefined>(initial.errorSource);
  let host = $state<string | undefined>(initial.host);
  let status = $state<number | undefined>(initial.status);
  let data = $state<Overview | null>(null);
  let statusKind = $state<"loading" | "updated" | "">("");
  let updatedAt = $state(0);
  let loadError = $state("");
  let timer = 0;
  let generation = 0;
  let abort: AbortController | undefined;

  const statusLabel = $derived(
    statusKind === "loading"
      ? t("status.loading")
      : statusKind === "updated"
        ? t("status.updated", { time: formatTime(updatedAt) })
        : "",
  );

  const loadErrorText = $derived(
    loadError ? t("status.loadFailed", { message: loadError }) : "",
  );

  const errorScope = $derived({
    errorType,
    errorMessage,
    errorSource,
    host,
    status,
  });

  const ingestHint = $derived.by(() => {
    if (!data) return "";
    const { ingest } = data;
    const rejects = ingest.originRejected + ingest.rateLimited + ingest.invalid;
    const processStale =
      ingest.lastBeaconAt !== null &&
      Date.now() - ingest.lastBeaconAt > STALE_MS;
    const staleSites = data.sites.filter(
      (site) =>
        site.lastBeaconAt !== null && Date.now() - site.lastBeaconAt > STALE_MS,
    );
    if (!processStale && rejects === 0 && staleSites.length === 0) return "";
    const parts = [];
    if (processStale && ingest.lastBeaconAt) {
      parts.push(
        t("alerts.lastBeacon", {
          time: formatDateTime(ingest.lastBeaconAt),
        }),
      );
    }
    if (staleSites.length > 0) {
      const oldest = staleSites.reduce((min, site) =>
        (site.lastBeaconAt ?? 0) < (min.lastBeaconAt ?? 0) ? site : min,
      );
      parts.push(
        t("alerts.staleSites", {
          names: staleSites.map((site) => site.origin).join(", "),
          time: formatDateTime(oldest.lastBeaconAt ?? 0),
        }),
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
        {
          path,
          origin,
          lang,
          locale,
          release,
          bot,
          nav,
          errorType,
          errorMessage,
          errorSource,
          host,
          status,
        },
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

  function applyErrorScope(scope: {
    errorType?: ErrorType;
    errorMessage?: string;
    errorSource?: string;
    host?: string;
    status?: number;
  }) {
    errorType = scope.errorType;
    errorMessage = scope.errorMessage;
    errorSource = scope.errorSource;
    host = scope.host;
    status = scope.status;
  }

  function selectErrorGroup(group: ErrorGroup) {
    applyErrorScope(toggleErrorGroup(group, errorScope));
  }

  function selectNetworkGroup(group: NetworkGroup) {
    applyErrorScope(toggleNetworkGroup(group, errorScope));
  }

  $effect(() => {
    void range;
    void sessionKey;
    void bot;
    void nav;
    void path;
    void origin;
    void lang;
    void locale;
    void release;
    void errorType;
    void errorMessage;
    void errorSource;
    void host;
    void status;
    writeSearch({
      range,
      sessionKey,
      bot,
      nav,
      path,
      origin,
      lang,
      locale,
      release,
      errorType,
      errorMessage,
      errorSource,
      host,
      status,
    });
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
  bind:nav
  bind:path
  bind:origin
  bind:lang
  bind:locale
  bind:release
  bind:errorType
  bind:errorMessage
  bind:errorSource
  bind:host
  bind:status
  {statusLabel}
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
        {nav === "spa" ? t("alerts.emptyBodySpa") : t("alerts.emptyBody")}
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
    {#if data.releases.current}
      <ReleaseCompare releases={data.releases} />
    {/if}
    <PageViews {data} bind:path bind:origin bind:lang bind:locale bind:release />
    <ContextCharts {data} />
    <CustomEvents events={data.customEvents} />
    <NetworkErrors
      groups={data.networkGroups}
      {host}
      {status}
      onSelect={selectNetworkGroup}
    />
    <ErrorGroups
      groups={data.errorGroups}
      {errorType}
      {errorMessage}
      {errorSource}
      {host}
      {status}
      onSelect={selectErrorGroup}
    />
    <ErrorTable
      errors={data.recentErrors}
      filtered={isErrorScopeActive(errorScope)}
    />
  {/if}
</main>
