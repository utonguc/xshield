<script lang="ts">
	import { enhance } from '$app/forms';
	import Logo from '$lib/components/Logo.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Giriş · goX</title></svelte:head>

<main class="wrap">
	<a href="/" class="back eyebrow">← geri</a>
	<div class="card card--raised box">
		<div class="head">
			<Logo size={34} />
			<p class="eyebrow" style="margin-top:1rem">Panel girişi</p>
			<h1>Tekrar hoş geldiniz</h1>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
		>
			{#if form?.error}<p class="err">{form.error}</p>{/if}
			<label class="field">
				<span>E-posta</span>
				<input class="input" type="email" name="email" value={form?.email ?? ''} placeholder="ad@isletme.com" required />
			</label>
			<label class="field">
				<span>Parola</span>
				<input class="input" type="password" name="password" placeholder="••••••••" required />
			</label>
			<button class="btn btn--accent full" type="submit" disabled={loading}>
				{loading ? 'Giriş yapılıyor…' : 'Giriş yap →'}
			</button>
		</form>

		<p class="foot-note">Hesabınız yok mu? <a href="/">Bizimle iletişime geçin</a></p>
	</div>
</main>

<style>
	.wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1.25rem; position: relative; }
	.back { position: absolute; top: 1.6rem; left: 1.6rem; text-decoration: none; }
	.back:hover { color: var(--ink); }
	.box { width: 100%; max-width: 410px; padding: 2.2rem; }
	.head { text-align: left; margin-bottom: 1.6rem; }
	.head h1 { font-size: 1.9rem; margin-top: 0.4rem; }
	.full { width: 100%; justify-content: center; margin-top: 0.4rem; }
	.foot-note { margin-top: 1.4rem; font-size: 0.9rem; color: var(--ink-soft); }
	.foot-note a { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--acid); text-decoration-thickness: 2px; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.8rem; border-radius: var(--radius); font-size: 0.9rem; margin-bottom: 1rem; }
</style>
