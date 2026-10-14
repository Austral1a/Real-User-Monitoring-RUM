<script lang="ts">
  import { Badge } from "$lib/Components/Ui/Badge/index.js";
  import { t } from "$lib/I18n";
  import LocaleSwitch from "$lib/I18n/LocaleSwitch.svelte";
  import ThemeSwitch from "$lib/Theme/ThemeSwitch.svelte";
  import ToggleGroup from "$lib/Components/ToggleGroup.svelte";
  import type {
    BotKey,
    ErrorType,
    NavKey,
    RangeKey,
    SessionKey,
  } from "$lib/Shared/Types";

  import { emptyErrorScope, filterChips, type FilterKey } from "./Helpers";

  let {
    range = $bindable(),
    sessionKey = $bindable(),
    bot = $bindable(),
    nav = $bindable(),
    path = $bindable(),
    origin = $bindable(),
    lang = $bindable(),
    locale = $bindable(),
    release = $bindable(),
    errorType = $bindable(),
    errorMessage = $bindable(),
    errorSource = $bindable(),
    host = $bindable(),
    status = $bindable(),
    statusLabel,
  }: {
    range: RangeKey;
    sessionKey: SessionKey;
    bot: BotKey;
    nav: NavKey;
    path?: string;
    origin?: string;
    lang?: string;
    locale?: string;
    release?: string;
    errorType?: ErrorType;
    errorMessage?: string;
    errorSource?: string;
    host?: string;
    status?: number;
    statusLabel: string;
  } = $props();

  const chips = $derived(
    filterChips({
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
    }),
  );
  const rangeOptions = $derived([
    { value: "24h" as const, label: t("range.h24") },
    { value: "7d" as const, label: t("range.d7") },
    { value: "30d" as const, label: t("range.d30") },
  ]);
  const byOptions = $derived([
    { value: "session" as const, label: t("sessionBy.session") },
    { value: "ua" as const, label: t("sessionBy.ua") },
    { value: "ip" as const, label: t("sessionBy.ip") },
    { value: "ua-ip" as const, label: t("sessionBy.uaIp") },
  ]);
  const botOptions = $derived([
    { value: "no" as const, label: t("bot.no") },
    { value: "yes" as const, label: t("bot.yes") },
  ]);
  const navOptions = $derived([
    { value: "all" as const, label: t("nav.all") },
    { value: "full" as const, label: t("nav.full") },
    { value: "spa" as const, label: t("nav.spa") },
  ]);

  function clear(key: FilterKey) {
    if (key === "path") path = undefined;
    else if (key === "origin") origin = undefined;
    else if (key === "lang") lang = undefined;
    else if (key === "locale") locale = undefined;
    else if (key === "release") release = undefined;
    else if (key === "error" || key === "host" || key === "status") {
      const empty = emptyErrorScope();
      errorType = empty.errorType;
      errorMessage = empty.errorMessage;
      errorSource = empty.errorSource;
      host = empty.host;
      status = empty.status;
    }
  }

  function clearAll() {
    path = undefined;
    origin = undefined;
    lang = undefined;
    locale = undefined;
    release = undefined;
    errorType = undefined;
    errorMessage = undefined;
    errorSource = undefined;
    host = undefined;
    status = undefined;
  }
</script>

<header class="bg-card border-b">
  <div
    class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4"
  >
    <h1 class="text-lg font-semibold tracking-tight">{t("app.title")}</h1>
    <div class="flex flex-wrap items-center gap-3">
      <ToggleGroup
        labelledBy={t("header.timeRange")}
        options={rangeOptions}
        bind:value={range}
      />
      <ToggleGroup
        label={t("sessionBy.label")}
        labelledBy="session-key-label"
        options={byOptions}
        bind:value={sessionKey}
      />
      <ToggleGroup
        label={t("bot.label")}
        labelledBy="bot-label"
        options={botOptions}
        bind:value={bot}
      />
      <ToggleGroup
        label={t("nav.label")}
        labelledBy="nav-label"
        options={navOptions}
        bind:value={nav}
      />
      <span class="text-muted-foreground text-sm" aria-live="polite"
        >{statusLabel}</span
      >
      <LocaleSwitch />
      <ThemeSwitch />
    </div>
  </div>
  {#if chips.length > 0}
    <div
      class="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 pb-3"
      aria-label={t("header.activeFilters")}
    >
      {#each chips as chip (chip.key)}
        <Badge variant="secondary" class="gap-1 font-normal">
          <span>{chip.label}: {chip.value}</span>
          <button
            type="button"
            class="hover:text-foreground ml-1"
            aria-label={t("header.clearFilter", { label: chip.label })}
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
        {t("header.clearFilters")}
      </button>
    </div>
  {/if}
</header>
