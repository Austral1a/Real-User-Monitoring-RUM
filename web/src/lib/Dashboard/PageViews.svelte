<script lang="ts">
  import { countryLabel, deviceLabel } from "$lib/format";
  import RankedTable from "$lib/RankedTable.svelte";
  import type { Overview } from "$lib/types";

  let { data }: { data: Overview } = $props();
</script>

<section class="panel pageviews" aria-labelledby="pageviews-title">
  <h2 id="pageviews-title">Page views breakdown</h2>
  <div class="pageviews-grid">
    <RankedTable
      title="Top URLs"
      keyHeader="URL"
      rows={data.pageViews.path}
    />
    <RankedTable
      title="Top countries"
      keyHeader="Country"
      rows={data.pageViews.country}
      label={countryLabel}
    />
    <div class="pageviews-stack">
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
    </div>
  </div>
</section>
