<script lang="ts">
  import * as Select from "$lib/Components/Ui/Select/index.js";
  import { LOCALES, i18n, isLocale, setLocale, t } from "$lib/I18n";

  import { localeItems } from "./LocaleItems";

  const items = $derived(localeItems(LOCALES, t));
</script>

<Select.Root
  type="single"
  value={i18n.locale}
  {items}
  onValueChange={(next) => {
    if (isLocale(next)) setLocale(next);
  }}
>
  <Select.Trigger size="sm" aria-label={t("locale.label")}>
    <Select.Value />
  </Select.Trigger>
  <Select.Content>
    {#each items as item (item.value)}
      <Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
