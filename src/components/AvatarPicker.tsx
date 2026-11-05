import { useRef, useState } from 'react';
import type { Member } from '../types';
import { AVATAR_CHOICES, photoAvatar } from '../lib/avatar';
import { Avatar } from './Avatar';

export function AvatarPicker({ member, onSave }: {
  member: Member;
  onSave: (avatar: string | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(member.avatar ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    setError('');
    setBusy(true);
    try { setDraft(await photoAvatar(file)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '图片处理失败。'); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    setError('');
    try { await onSave(draft); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '头像保存失败。'); }
    finally { setBusy(false); }
  }

  return (
    <div className="avatar-picker">
      <div className="avatar-picker__preview">
        <Avatar name={member.displayName} color={member.color} avatar={draft} size={64} />
        <p>选个喜欢的小图案，或上传一张照片。</p>
      </div>
      <div className="avatar-picker__choices" role="group" aria-label="选择头像">
        <button type="button" aria-pressed={draft === null} disabled={busy} onClick={() => setDraft(null)}>名字</button>
        {AVATAR_CHOICES.map(choice => (
          <button key={choice.value} type="button" aria-label={choice.label}
            aria-pressed={draft === choice.value} disabled={busy} onClick={() => setDraft(choice.value)}>
            {choice.value.slice(6)}
          </button>
        ))}
      </div>
      <div className="avatar-picker__actions">
        <button type="button" className="button button--soft button--small" disabled={busy}
          onClick={() => input.current?.click()}>上传照片</button>
        <button type="button" className="button button--primary button--small" disabled={busy}
          onClick={() => void save()}>{busy ? '处理中…' : '保存头像'}</button>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} />
      <p className="avatar-picker__hint">照片居中裁成方形，压缩后随账号同步。支持 JPG、PNG、WebP，最大 8 MB。</p>
      {error ? <p className="form-alert" role="alert">{error}</p> : null}
    </div>
  );
}
