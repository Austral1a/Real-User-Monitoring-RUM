<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { countryLabel, deviceLabel } from "$lib/format";
  import RankedTable from "$lib/RankedTable.svelte";
  import type { Overview } from "$lib/types";

  let { data }: { data: Overview } = $props();
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
      />
      <RankedTable
        title="Top countries"
        keyHeader="Country"
        rows={data.pageViews.country}
        label={countryLabel}
      />
      <div class="grid content-start gap-6">
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
    </section>
  </Card.Content>
</Card.Root>
