<script lang="ts">
	import { cn, type WithElementRef } from "$lib/Shared/Utils.js";
	import type { HTMLTableAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		overflow = true,
		children,
		...restProps
	}: WithElementRef<HTMLTableAttributes> & { overflow?: boolean } = $props();
</script>

<div
	data-slot="table-container"
	class={cn("relative w-full", overflow && "overflow-x-auto")}
>
	<table bind:this={ref} data-slot="table" class={cn("w-full caption-bottom text-sm", className)} {...restProps}>
		{@render children?.()}
	</table>
</div>
