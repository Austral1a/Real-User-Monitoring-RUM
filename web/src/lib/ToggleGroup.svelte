<script lang="ts" generics="T extends string">
  interface Option {
    value: T;
    label: string;
  }

  let {
    label,
    labelledBy,
    options,
    value = $bindable(),
  }: {
    label?: string;
    labelledBy?: string;
    options: Option[];
    value: T;
  } = $props();
</script>

{#if label}
  <div class="toggle">
    <span class="toggle-label" id={labelledBy}>{label}</span>
    <div class="range" role="group" aria-labelledby={labelledBy}>
      {#each options as option (option.value)}
        <button
          type="button"
          aria-pressed={value === option.value}
          onclick={() => (value = option.value)}>{option.label}</button
        >
      {/each}
    </div>
  </div>
{:else}
  <div class="range" role="group" aria-label={labelledBy}>
    {#each options as option (option.value)}
      <button
        type="button"
        aria-pressed={value === option.value}
        onclick={() => (value = option.value)}>{option.label}</button
      >
    {/each}
  </div>
{/if}
