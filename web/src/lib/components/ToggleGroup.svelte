<script lang="ts" generics="T extends string">
  import * as ToggleGroup from "$lib/Components/Ui/ToggleGroup/index.js";

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

  function select(next: string) {
    if (next) value = next as T;
  }
</script>

<div class="flex items-center gap-2">
  {#if label}
    <span class="text-muted-foreground text-sm" id={labelledBy}>{label}</span>
  {/if}
  <ToggleGroup.Root
    type="single"
    variant="outline"
    size="sm"
    {value}
    onValueChange={select}
    aria-label={label ? undefined : labelledBy}
    aria-labelledby={label ? labelledBy : undefined}
  >
    {#each options as option (option.value)}
      <ToggleGroup.Item value={option.value}>{option.label}</ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>
</div>
