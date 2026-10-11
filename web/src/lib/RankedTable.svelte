<script lang="ts">
  import { formatCompact, formatMs } from "$lib/format";
  import type { PageViewRow } from "$lib/types";

  let {
    title,
    keyHeader,
    rows,
    label = (key) => key,
  }: {
    title: string;
    keyHeader: string;
    rows: PageViewRow[];
    label?: (key: string) => string;
  } = $props();
</script>

<article>
  <h3>{title}</h3>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">{keyHeader}</th>
          <th scope="col">Count</th>
          <th scope="col">Median load</th>
        </tr>
      </thead>
      <tbody>
        {#if rows.length === 0}
          <tr>
            <td class="empty-row" colspan="3">No page views in this period</td>
          </tr>
        {:else}
          {#each rows as row (row.key)}
            <tr>
              <td>{label(row.key)}</td>
              <td>{formatCompact(row.count)}</td>
              <td>{formatMs(row.pageLoad)}</td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</article>
