<script lang="ts">
  import * as Card from "$lib/Components/Ui/Card/index.js";
  import { countryLabel, deviceLabel } from "$lib/Shared/Format";
  import { t } from "$lib/I18n";
  import RankedTable from "$lib/Components/RankedTable.svelte";
  import type { Overview } from "$lib/Shared/Types";

  let {
    data,
    path = $bindable(),
    origin = $bindable(),
    lang = $bindable(),
    locale = $bindable(),
    release = $bindable(),
  }: {
    data: Overview;
    path?: string;
    origin?: string;
    lang?: string;
    locale?: string;
    release?: string;
  } = $props();

  function toggle(
    key: "path" | "origin" | "lang" | "locale" | "release",
    value: string,
  ) {
    if (key === "path") path = path === value ? undefined : value;
    else if (key === "origin") origin = origin === value ? undefined : value;
    else if (key === "lang") lang = lang === value ? undefined : value;
    else if (key === "locale") locale = locale === value ? undefined : value;
    else release = release === value ? undefined : value;
  }
</script>

<Card.Root>
  <Card.Header class="items-center">
    <Card.Title id="pageviews-title" class="text-base"
      >{t("pageViews.title")}</Card.Title
    >
  </Card.Header>
  <Card.Content>
    <section
      class="grid grid-cols-1 gap-5 md:grid-cols-3"
      aria-labelledby="pageviews-title"
    >
      <RankedTable
        title={t("pageViews.topUrls")}
        keyHeader={t("pageViews.url")}
        rows={data.pageViews.path}
        selected={path}
        onSelect={(value) => toggle("path", value)}
      />
      <RankedTable
        title={t("pageViews.topSites")}
        keyHeader={t("pageViews.site")}
        rows={data.pageViews.origin}
        selected={origin}
        onSelect={(value) => toggle("origin", value)}
      />
      <RankedTable
        title={t("pageViews.topLanguages")}
        keyHeader={t("pageViews.language")}
        rows={data.pageViews.lang}
        selected={lang}
        onSelect={(value) => toggle("lang", value)}
      />
      <RankedTable
        title={t("pageViews.topLocales")}
        keyHeader={t("pageViews.locale")}
        rows={data.pageViews.locale}
        selected={locale}
        onSelect={(value) => toggle("locale", value)}
      />
      <RankedTable
        title={t("pageViews.topReleases")}
        keyHeader={t("pageViews.release")}
        rows={data.pageViews.release}
        selected={release}
        onSelect={(value) => toggle("release", value)}
      />
      <RankedTable
        title={t("pageViews.topCountries")}
        keyHeader={t("pageViews.country")}
        rows={data.pageViews.country}
        label={countryLabel}
      />
      <RankedTable
        title={t("pageViews.topBrowsers")}
        keyHeader={t("pageViews.browser")}
        rows={data.pageViews.browser}
      />
      <RankedTable
        title={t("pageViews.topDevices")}
        keyHeader={t("pageViews.device")}
        rows={data.pageViews.device}
        label={deviceLabel}
      />
    </section>
  </Card.Content>
</Card.Root>
