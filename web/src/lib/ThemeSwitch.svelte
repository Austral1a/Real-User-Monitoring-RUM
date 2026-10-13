<script lang="ts">
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";

  import { toggleVariants } from "$lib/components/ui/toggle/index.js";
  import { theme, toggleTheme } from "$lib/theme.svelte";

  const next = $derived(theme.mode === "dark" ? "light" : "dark");
</script>

<button
  type="button"
  class={toggleVariants({ variant: "outline", size: "sm" })}
  aria-label="Switch to {next} theme"
  onclick={toggleTheme}
>
  {#if theme.mode === "dark"}
    <SunIcon class="size-4" />
  {:else}
    <MoonIcon class="size-4" />
  {/if}
</button>
