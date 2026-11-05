import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { LogoMark } from './Logo';

export function RecoveryScreen() {
  const { updatePassword, cancelRecovery } = useApp();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('新密码至少需要 6 位。');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一样。');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      showToast('密码已更新，下次用新密码登录。', { tone: 'success' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '密码更新失败。');
      setBusy(false);
    }
  };

  return (
    <main className="recovery">
      <div className="recovery__brand">
        <LogoMark size={46} />
        <div>
          <strong>一起买</strong>
          <span>重新设置密码</span>
        </div>
      </div>

      <section className="recovery__card">
        <span className="round-icon">
          <LockKeyhole size={21} />
        </span>
        <h1>换一个新密码</h1>
        <p>设置好之后，用新密码就能登录你们的小家。</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <label className="field">
            <span className="field__label">新密码</span>
            <span className="field__control">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
                autoComplete="new-password"
                autoFocus
              />
            </span>
          </label>

          <label className="field">
            <span className="field__label">再输一次</span>
            <span className="field__control">
              <Check size={18} />
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="和新密码一致"
                autoComplete="new-password"
              />
            </span>
          </label>

          {error ? (
            <div className="form-alert" role="alert">
              {error}
            </div>
          ) : null}

          <button type="submit" className="button button--primary button--wide" disabled={busy}>
            {busy ? <LoaderCircle size={18} className="spin" /> : null}
            保存新密码
            {!busy ? <ArrowRight size={18} /> : null}
          </button>
        </form>

        <button type="button" className="text-button recovery__skip" onClick={cancelRecovery}>
          先进入清单
        </button>
      </section>
    </main>
  );
}
