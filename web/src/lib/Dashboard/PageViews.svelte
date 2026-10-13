<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { countryLabel, deviceLabel } from "$lib/format";
  import RankedTable from "$lib/RankedTable.svelte";
  import type { Overview } from "$lib/types";

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
      >Page views breakdown</Card.Title
    >
  </Card.Header>
  <Card.Content>
    <section
      class="grid grid-cols-1 gap-5 md:grid-cols-3"
      aria-labelledby="pageviews-title"
    >
      <RankedTable
        title="Top URLs"
        keyHeader="URL"
        rows={data.pageViews.path}
        selected={path}
        onSelect={(value) => toggle("path", value)}
      />
      <RankedTable
        title="Top sites"
        keyHeader="Site"
        rows={data.pageViews.origin}
        selected={origin}
        onSelect={(value) => toggle("origin", value)}
      />
      <RankedTable
        title="Top languages"
        keyHeader="Language"
        rows={data.pageViews.lang}
        selected={lang}
        onSelect={(value) => toggle("lang", value)}
      />
      <RankedTable
        title="Top page locales"
        keyHeader="Locale"
        rows={data.pageViews.locale}
        selected={locale}
        onSelect={(value) => toggle("locale", value)}
      />
      <RankedTable
        title="Top releases"
        keyHeader="Release"
        rows={data.pageViews.release}
        selected={release}
        onSelect={(value) => toggle("release", value)}
      />
      <RankedTable
        title="Top countries"
        keyHeader="Country"
        rows={data.pageViews.country}
        label={countryLabel}
      />
      <RankedTable
        title="Top browsers"
        keyHeader="Browser"
        rows={data.pageViews.browser}
      />
      <RankedTable
        title="Top devices"
        keyHeader="Device"
        rows={data.pageViews.device}
        label={deviceLabel}
      />
    </section>
  </Card.Content>
</Card.Root>
