import { normalizeInviteCode } from './utils';

const INVITE_KEY = 'together-pending-invite';

export function readPendingInvite(): string {
  try { return normalizeInviteCode(sessionStorage.getItem(INVITE_KEY) ?? ''); }
  catch { return ''; }
}

export function savePendingInvite(code: string): void {
  try {
    if (code) sessionStorage.setItem(INVITE_KEY, normalizeInviteCode(code));
    else sessionStorage.removeItem(INVITE_KEY);
  } catch { /* The current page can still keep the invitation in memory. */ }
}
