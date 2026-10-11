<script lang="ts">
  import { countryLabel } from "$lib/format";
  import type { ErrorRow } from "$lib/types";

  const ERROR_LABELS: Record<ErrorRow["type"], string> = {
    js_error: "JS error",
    network_error: "Network",
    crash: "Crash",
  };

  let { errors }: { errors: ErrorRow[] } = $props();

  function details(error: ErrorRow): string {
    if (error.type === "network_error") {
      return `${error.method} ${error.source} → ${error.status === 0 ? "failed" : error.status}`;
    }
    if (error.type === "crash") {
      return "Left before the page finished loading";
    }
    return error.message ?? "";
  }
</script>

<section class="panel">
  <h2>Recent errors</h2>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">Time</th>
          <th scope="col">Type</th>
          <th scope="col">Details</th>
          <th scope="col">Page</th>
          <th scope="col">Device</th>
          <th scope="col">Country</th>
        </tr>
      </thead>
      <tbody>
        {#if errors.length === 0}
          <tr>
            <td class="empty-row" colspan="6">No errors in this period</td>
          </tr>
        {:else}
          {#each errors as error, index (error.receivedAt + error.type + index)}
            <tr>
              <td class="nowrap">{new Date(error.receivedAt).toLocaleString()}</td>
              <td>
                <span class="badge badge-{error.type}"
                  >{ERROR_LABELS[error.type]}</span
                >
              </td>
              <td class="details">
                <span class="detail">{details(error)}</span>
                {#if error.type === "js_error" && error.source}
                  <span class="source">{error.source}</span>
                {/if}
              </td>
              <td>{error.path}</td>
              <td class="nowrap">{error.device} · {error.os}</td>
              <td class="nowrap"
                >{error.country ? countryLabel(error.country) : "Unknown"}</td
              >
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</section>
