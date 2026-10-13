<script lang="ts">
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";

  import { toggleVariants } from "$lib/Components/Ui/Toggle/index.js";
  import { t } from "$lib/I18n";
  import { theme, toggleTheme } from "$lib/Theme";

  const next = $derived(theme.mode === "dark" ? "light" : "dark");
  const nextLabel = $derived(
    next === "dark" ? t("theme.dark") : t("theme.light"),
  );
</script>

<button
  type="button"
  class={toggleVariants({ variant: "outline", size: "sm" })}
  aria-label={t("theme.switchTo", { mode: nextLabel })}
  onclick={toggleTheme}
>
  {#if theme.mode === "dark"}
    <SunIcon class="size-4" />
  {:else}
    <MoonIcon class="size-4" />
  {/if}
</button>
