<script>
	import { CANDIDATE_COORDS } from '../../constants.js';

	export let candidates = [];
</script>

<div class="candidate-grid">
	{#each CANDIDATE_COORDS as coord, index}
		<div class="candidate row-start-{coord.y + 1} col-start-{coord.x + 1}"
		     class:invisible={!candidates.includes(index + 1)}
		     class:visible={candidates.includes(index + 1)}>
			{index + 1}
		</div>
	{/each}
</div>

<style>
	.candidate-grid {
		@apply grid h-full w-full p-1;
	}

	.candidate {
		@apply h-full w-full row-end-auto col-end-auto leading-full;
	}
</style>