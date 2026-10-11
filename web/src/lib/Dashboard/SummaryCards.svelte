<script lang="ts">
  import { SESSION_TITLES } from "$lib/constants";
  import { formatCount, formatMs } from "$lib/format";
  import type { Overview } from "$lib/types";

  let { data }: { data: Overview } = $props();
</script>

<section class="cards" aria-label="Summary">
  <article class="card">
    <h2>{SESSION_TITLES[data.sessionKey]}</h2>
    <p class="value">{formatCount(data.totals.sessions)}</p>
    <p class="hint">{formatCount(data.totals.pageLoads)} page loads measured</p>
  </article>
  <article class="card">
    <h2>Page load (p50)</h2>
    <p class="value">{formatMs(data.p50.pageLoad)}</p>
    <p class="hint">Fetch start to load event end</p>
  </article>
  <article class="card">
    <h2>TTFB (p50)</h2>
    <p class="value">{formatMs(data.p50.ttfb)}</p>
    <p class="hint">Request start to first byte</p>
  </article>
  <article class="card">
    <h2>Start render (p50)</h2>
    <p class="value">{formatMs(data.p50.startRender)}</p>
    <p class="hint">First paint</p>
  </article>
  <article class="card">
    <h2>Errors</h2>
    <p class="value">
      {formatCount(data.totals.jsErrors + data.totals.networkErrors)}
    </p>
    <p class="hint">
      {formatCount(data.totals.jsErrors)} JS · {formatCount(
        data.totals.networkErrors,
      )} network
    </p>
  </article>
  <article class="card">
    <h2>Crashed sessions</h2>
    <p class="value">{formatCount(data.totals.crashedSessions)}</p>
    <p class="hint">Left before the page finished loading</p>
  </article>
</section>
