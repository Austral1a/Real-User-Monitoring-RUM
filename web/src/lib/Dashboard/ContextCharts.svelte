<script lang="ts">
  import {
    barChart,
    connectionChart,
    countChart,
    countryChart,
    doughnutChart,
    timingChart,
  } from "$lib/Charts";
  import ChartPane from "$lib/Charts/ChartPane.svelte";
  import * as Card from "$lib/Components/Ui/Card/index.js";
  import { deviceLabel } from "$lib/Shared/Format";
  import { t } from "$lib/I18n";
  import type { Overview } from "$lib/Shared/Types";

  let { data }: { data: Overview } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{t("charts.timingTitle")}</Card.Title>
  </Card.Header>
  <Card.Content>
    <ChartPane
      config={timingChart(data.series, data.range)}
      label={t("charts.timingLabel")}
      wide
    />
  </Card.Content>
</Card.Root>

<Card.Root>
  <Card.Header>
    <Card.Title>{t("charts.errorsTitle")}</Card.Title>
  </Card.Header>
  <Card.Content>
    <ChartPane
      config={countChart(data.errorSeries, data.range)}
      label={t("charts.errorsLabel")}
      wide
    />
  </Card.Content>
</Card.Root>

<section
  class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4"
  aria-label={t("charts.context")}
>
  <Card.Root>
    <Card.Header>
      <Card.Title>{t("charts.devices")}</Card.Title>
    </Card.Header>
    <Card.Content>
      <ChartPane
        config={doughnutChart(data.breakdowns.device, deviceLabel)}
        label={t("charts.devicesLabel")}
      />
    </Card.Content>
  </Card.Root>
  <Card.Root>
    <Card.Header>
      <Card.Title>{t("charts.os")}</Card.Title>
    </Card.Header>
    <Card.Content>
      <ChartPane
        config={barChart(data.breakdowns.os)}
        label={t("charts.osLabel")}
      />
    </Card.Content>
  </Card.Root>
  <Card.Root>
    <Card.Header>
      <Card.Title>{t("charts.connection")}</Card.Title>
    </Card.Header>
    <Card.Content>
      <ChartPane
        config={connectionChart(data.breakdowns.connection)}
        label={t("charts.connectionLabel")}
      />
    </Card.Content>
  </Card.Root>
  <Card.Root>
    <Card.Header>
      <Card.Title>{t("charts.countries")}</Card.Title>
    </Card.Header>
    <Card.Content>
      <ChartPane
        config={countryChart(data.breakdowns.country)}
        label={t("charts.countriesLabel")}
      />
    </Card.Content>
  </Card.Root>
</section>
