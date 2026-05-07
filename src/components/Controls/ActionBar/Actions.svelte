<script>
	import { candidates } from '../../../stores/candidates.js';
	import { userGrid, applyHint, getCandidatesAt, inExplore, enterExplore, commitExplore, abortExplore, exploreUndo, canUndoStore, canRedoStore } from '../../../stores/grid.js';
	import { cursor } from '../../../stores/cursor.js';
	import { hints, useHint, hintMode, toggleHintMode } from '../../../stores/hints.js';
	import { notes } from '../../../stores/notes.js';
	import { settings } from '../../../stores/settings.js';
	import { keyboardDisabled } from '../../../stores/keyboard.js';
	import { gamePaused } from '../../../stores/game.js';
	import { undo, redo } from '../../../game.js';

	$: hintsAvailable = $hints > 0;

	function handleUndo() {
		undo();
	}

	function handleRedo() {
		redo();
	}

	function handleHint() {
		if (hintsAvailable && $cursor.x !== null && $cursor.y !== null) {
			if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
				candidates.clear($cursor);
			}

			if (useHint()) {
				// 根据模式决定行为
				if ($hintMode === 'show') {
					const cand = getCandidatesAt($cursor);
					if (cand && cand.length) {
						candidates.clear($cursor);
						for (const v of cand) candidates.add($cursor, v);
					}
				} else {
					// 'fill' 模式：使用 applyHint 的默认行为（会直接填写唯一推断步或显示候选）
					applyHint($cursor);
				}
			}
		}
	}

    function handleToggleHintMode() {
        toggleHintMode();
    }

	function handleEnterExplore() {
		enterExplore();
	}

	function handleCommitExplore() {
		commitExplore();
	}

	function handleAbortExplore() {
		abortExplore();
	}

	function handleExploreUndo() {
		exploreUndo();
	}
</script>

<div class="action-buttons space-x-3">

	<button class="btn btn-round" disabled={$gamePaused || !$canUndoStore} on:click={handleUndo} title="Undo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

	{#if $inExplore}
		<button class="btn btn-round" on:click={handleExploreUndo} title="Explore Undo">
			Undo
		</button>
		<button class="btn btn-round btn-primary" on:click={handleCommitExplore} title="Commit Explore">
			Commit
		</button>
		<button class="btn btn-round btn-danger" on:click={handleAbortExplore} title="Abort Explore">
			Abort
		</button>
	{:else}
		<button class="btn btn-round" on:click={handleEnterExplore} title="Enter Explore">
			Explore
		</button>
	{/if}

	<button class="btn btn-small" on:click={handleToggleHintMode} title="Toggle hint mode">
		{#if $hintMode === 'fill'} 填写模式 {:else} 仅提示 {/if}
	</button>

	<button class="btn btn-round" disabled={$gamePaused || !$canRedoStore} on:click={handleRedo} title="Redo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

	<button class="btn btn-round btn-badge" disabled={$keyboardDisabled || !hintsAvailable || $cursor.x === null || $cursor.y === null || $userGrid[$cursor.y][$cursor.x] !== 0} on:click={handleHint} title="Hints ({$hints})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>

		{#if $settings.hintsLimited}
			<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

	<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>

		<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
	</button>

</div>


<style>
	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}

	.btn-badge {
		@apply relative;
	}

	.badge {
		min-height: 20px;
		min-width:  20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-primary {
		@apply bg-primary;
	}
</style>