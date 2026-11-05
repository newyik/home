import { useState, type FormEvent } from 'react';
import { ArrowRight, Home, KeyRound, LoaderCircle, LogOut, UsersRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { friendlyWorkspaceError, normalizeInviteCode } from '../lib/utils';

type Tab = 'create' | 'join';

export function Onboarding({ initialCode = '' }: { initialCode?: string }) {
  const { account, createHousehold, joinHousehold, signOut } = useApp();
  const [tab, setTab] = useState<Tab>(initialCode ? 'join' : 'create');
  const [householdName, setHouseholdName] = useState('我们的小家');
  const [displayName, setDisplayName] = useState(account?.displayName ?? '');
  const [code, setCode] = useState(normalizeInviteCode(initialCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!displayName.trim()) {
      setError('先写一下你的名字，清单里会显示是谁添加的。');
      return;
    }
    if (tab === 'join' && code.length !== 6) {
      setError('邀请码是 6 位字母或数字。');
      return;
    }

    setBusy(true);
    try {
      if (tab === 'create') {
        await createHousehold(householdName, displayName);
      } else {
        await joinHousehold(code, displayName);
      }
    } catch (caught) {
      setError(friendlyWorkspaceError(caught instanceof Error ? caught.message : '操作失败。'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="onboarding">
      <header className="onboarding__top">
        <Logo size={40} subtitle="两个人的小家" />
        <button type="button" className="text-button" onClick={() => void signOut()}>
          <LogOut size={15} />
          退出
        </button>
      </header>

      <div className="onboarding__grid">
        <section className="onboarding__intro">
          <span className="eyebrow eyebrow--accent">最后一步</span>
          <h1>
            先安顿好
            <br />
            <em>你们的小家。</em>
          </h1>
          <p>
            一个人创建，另一个人用邀请码加入。之后你们看到的是同一份清单，谁改了都会同步。
          </p>

          <div className="onboarding__steps">
            <div className="onboarding-step">
              <span>01</span>
              <div>
                <strong>给小屋起个名字</strong>
                <small>比如「我们的小家」</small>
              </div>
            </div>
            <div className="onboarding-step">
              <span>02</span>
              <div>
                <strong>把邀请码发给 TA</strong>
                <small>6 位，只有你们知道</small>
              </div>
            </div>
            <div className="onboarding-step">
              <span>03</span>
              <div>
                <strong>开始一起记</strong>
                <small>下次出门前看一眼</small>
              </div>
            </div>
          </div>

          {account ? (
            <div className="onboarding__account">
              <Avatar name={account.displayName} color={account.color} size={36} />
              <div>
                <span>当前登录</span>
                <strong>{account.email}</strong>
              </div>
            </div>
          ) : null}
        </section>

        <section className="onboarding__card">
          <div className="auth-tabs" role="tablist" aria-label="创建或加入小家">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'create'}
              className={tab === 'create' ? 'is-active' : ''}
              onClick={() => {
                setTab('create');
                setError(null);
              }}
            >
              创建小家
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'join'}
              className={tab === 'join' ? 'is-active' : ''}
              onClick={() => {
                setTab('join');
                setError(null);
              }}
            >
              加入小家
            </button>
          </div>

          <div className="onboarding__card-head">
            <span className="round-icon">
              {tab === 'create' ? <Home size={21} /> : <KeyRound size={21} />}
            </span>
            <div>
              <h2>{tab === 'create' ? '创建你们的小家' : '输入 TA 的邀请码'}</h2>
              <p>
                {tab === 'create'
                  ? '创建后会生成一个邀请码，发给 TA 就能一起用。'
                  : '邀请码在 TA 的「设置 → 邀请码」里。'}
              </p>
            </div>
          </div>

          <form className="auth-form" onSubmit={submit} noValidate>
            <label className="field">
              <span className="field__label">你的名字</span>
              <span className="field__control">
                <UsersRound size={18} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="TA 怎么称呼你？"
                  maxLength={24}
                  autoComplete="nickname"
                />
              </span>
            </label>

            {tab === 'create' ? (
              <label className="field">
                <span className="field__label">小家名字</span>
                <span className="field__control">
                  <Home size={18} />
                  <input
                    type="text"
                    value={householdName}
                    onChange={(event) => setHouseholdName(event.target.value)}
                    placeholder="我们的小家"
                    maxLength={40}
                  />
                </span>
              </label>
            ) : (
              <label className="field">
                <span className="field__label">6 位邀请码</span>
                <span className="field__control field__control--code">
                  <KeyRound size={18} />
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(normalizeInviteCode(event.target.value))}
                    placeholder="ABC123"
                    maxLength={6}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="text"
                  />
                </span>
              </label>
            )}

            {error ? (
              <div className="form-alert" role="alert">
                {error}
              </div>
            ) : null}

            <button type="submit" className="button button--primary button--wide" disabled={busy}>
              {busy ? <LoaderCircle size={18} className="spin" /> : null}
              {tab === 'create' ? '创建我们的小家' : '加入我们的小家'}
              {!busy ? <ArrowRight size={18} /> : null}
            </button>
          </form>

          <p className="privacy-note">
            <KeyRound size={13} />
            邀请码是加入小家的唯一钥匙，别发给别人。
          </p>
        </section>
      </div>
    </main>
  );
}
