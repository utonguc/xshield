// goX panel — site geneli toast + onaylı işlem altyapısı (Svelte 5 runes).
import { tick } from 'svelte';

export type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; msg: string };

let items = $state<ToastItem[]>([]);
let seq = 0;

export const toasts = {
	get items() {
		return items;
	}
};

export function pushToast(kind: ToastKind, msg: string, ms = 4000) {
	const id = ++seq;
	items = [...items, { id, kind, msg }];
	setTimeout(() => {
		items = items.filter((t) => t.id !== id);
	}, ms);
}

export function dismissToast(id: number) {
	items = items.filter((t) => t.id !== id);
}

export const toast = {
	success: (m: string) => pushToast('success', m),
	error: (m: string) => pushToast('error', m),
	info: (m: string) => pushToast('info', m)
};

// ── Onay (confirm) — sorgusuz silme YOK ──────────────────────────────────────
type ConfirmReq = {
	title: string;
	message: string;
	confirmLabel: string;
	danger: boolean;
	resolve: (ok: boolean) => void;
};
let pending = $state<ConfirmReq | null>(null);

export const confirmStore = {
	get current() {
		return pending;
	}
};

export function confirmAction(
	message: string,
	opts: { title?: string; confirmLabel?: string; danger?: boolean } = {}
): Promise<boolean> {
	return new Promise((resolve) => {
		pending = {
			title: opts.title ?? 'Emin misiniz?',
			message,
			confirmLabel: opts.confirmLabel ?? 'Onayla',
			danger: opts.danger ?? false,
			resolve
		};
	});
}

export function resolveConfirm(ok: boolean) {
	const p = pending;
	pending = null;
	if (p) p.resolve(ok);
}

// Silme butonu (type="button") → onay sor → onaylanırsa formu gönder.
// Kullanım: <button type="button" onclick={(e) => confirmDelete(e, 'X silinsin mi?')}>×</button>
export async function confirmDelete(e: Event, message = 'Bu kaydı silmek istiyor musunuz?') {
	const btn = e.currentTarget as HTMLElement;
	const form = btn.closest('form');
	if (!form) return;
	const ok = await confirmAction(message, { confirmLabel: 'Sil', danger: true });
	if (ok) {
		await tick();
		(form as HTMLFormElement).requestSubmit();
	}
}

// use:enhance yardımcı: işlem sonucunda toast göster. <form use:enhance={toastEnhance('Kaydedildi')}>
export function toastEnhance(successMsg = 'Kaydedildi', opts: { reset?: boolean; onSuccess?: (data: any) => void } = {}) {
	return () =>
		async ({ result, update }: any) => {
			await update({ reset: opts.reset ?? false });
			if (result.type === 'success') {
				toast.success(successMsg);
				opts.onSuccess?.(result.data);
			} else if (result.type === 'failure') {
				toast.error(result.data?.error ?? 'İşlem başarısız');
			} else if (result.type === 'error') {
				toast.error('Bağlantı hatası');
			}
		};
}
