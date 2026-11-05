import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  MapPinned,
  LockKeyhole,
  Mail,
  ShoppingBag,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar } from './Avatar';
import { Logo } from './Logo';

type Mode = 'login' | 'signup' | 'reset';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthScreen() {
  const { demoMode, enterDemo, signIn, signUp, resetPassword } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<'me' | 'partner' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const heading = useMemo(() => {
    if (mode === 'signup') return '创建你们的账号';
    if (mode === 'reset') return '找回密码';
    return '欢迎回来';
  }, [mode]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!isEmail(email)) {
      setError('先填一个正确的邮箱地址。');
      return;
    }
    if (mode !== 'reset' && password.length < 6) {
      setError('密码至少需要 6 位。');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      setError('写一下你希望 TA 怎么称呼你。');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        const result = await signUp(email, password, displayName);
        if (result.needsConfirmation) {
          setNotice('账号创建成功。去邮箱点一下确认链接，再回来登录。');
          setMode('login');
          setPassword('');
        }
      } else {
        await resetPassword(email);
        setNotice('重置邮件已经发出，去收件箱看看。');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '操作失败，请重试。');
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async (identity: 'me' | 'partner') => {
    setDemoBusy(identity);
    setError(null);
    try {
      await enterDemo(identity);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '演示打开失败。');
    } finally {
      setDemoBusy(null);
    }
  };

  return (
    <main className="auth">
      <section className="auth__hero">
        <div className="auth__hero-top">
          <Logo size={46} subtitle="两个人的小家" />
        </div>

        <div className="auth__hero-copy">
          <span className="eyebrow eyebrow--accent">
            <Sparkles size={13} />
            为两个人做的清单
          </span>
          <h1>
            家里缺什么，
            <br />
            <em>一起记下来。</em>
          </h1>
          <p>不用再问「买了吗」。打开就知道，出门前看一眼，刚刚好。</p>
        </div>

        <div className="auth-preview" aria-hidden="true">
          <div className="auth-preview__head">
            <div>
              <span className="auth-preview__eyebrow">我们的小家</span>
              <strong>一起买，也一起去</strong>
            </div>
            <div className="auth-preview__people">
              <Avatar name="我" color="#d9613d" size={26} />
              <Avatar name="TA" color="#5b84d7" size={26} />
            </div>
          </div>

          <div className="auth-preview__feature">
            <span className="auth-preview__feature-icon">
              <ShoppingBag size={15} />
            </span>
            <div>
              <strong>一起买</strong>
              <span>家里缺什么，记在这里</span>
            </div>
            <span className="preview-tag preview-tag--green">清单</span>
          </div>
          <div className="auth-preview__feature">
            <span className="auth-preview__feature-icon auth-preview__feature-icon--map">
              <MapPinned size={15} />
            </span>
            <div>
              <strong>自驾打卡</strong>
              <span>去过的地方，钉在日本地图上</span>
            </div>
            <span className="preview-tag preview-tag--gold">地图</span>
          </div>
          <span className="auth-preview__sticker">2 人同步</span>
        </div>

        <div className="auth__features">
          <span>
            <Check size={14} /> 两台 iPhone
          </span>
          <span>
            <Check size={14} /> 实时同步
          </span>
          <span>
            <Check size={14} /> 快捷指令
          </span>
        </div>
      </section>

      <section className="auth__panel">
        <div className="auth-card">
          {demoMode ? (
            <>
              <div className="demo-badge">本地演示模式</div>
              <h2>先看看它长什么样</h2>
              <p className="auth-card__lead">
                还没有连接数据库，下面的操作只保存在这台设备。选一个身份，直接进去逛逛。
              </p>

              <div className="demo-people">
                <button
                  type="button"
                  className="demo-person demo-person--me"
                  onClick={() => handleDemo('me')}
                  disabled={demoBusy !== null}
                >
                  <Avatar name="我" color="#d9613d" size={44} />
                  <span>
                    <strong>以我的身份进入</strong>
                    <small>先看看自己眼里的清单</small>
                  </span>
                  {demoBusy === 'me' ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                </button>
                <button
                  type="button"
                  className="demo-person"
                  onClick={() => handleDemo('partner')}
                  disabled={demoBusy !== null}
                >
                  <Avatar name="TA" color="#5b84d7" size={44} />
                  <span>
                    <strong>以 TA 的身份进入</strong>
                    <small>切换身份看看同一份清单</small>
                  </span>
                  {demoBusy === 'partner' ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                </button>
              </div>

              <details className="setup-hint">
                <summary>想让它真正两台手机同步？</summary>
                <ol>
                  <li>在 supabase.com 免费建一个项目。</li>
                  <li>把项目里的 <code>supabase/schema.sql</code> 粘进 SQL Editor 运行。</li>
                  <li>复制 Project URL 和 anon key，填到 GitHub Secrets。</li>
                </ol>
                <p>完整步骤写在项目根目录的 README 里。</p>
              </details>

              {error ? (
                <div className="form-alert" role="alert">
                  {error}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="auth-card__top">
                <span className="eyebrow">{mode === 'signup' ? '第一次来' : '你们的小家'}</span>
                <h2>{heading}</h2>
                <p className="auth-card__lead">
                  {mode === 'signup'
                    ? '先给自己建个账号，下一步再创建或加入小家。'
                    : mode === 'reset'
                      ? '输入注册邮箱，我们给你发一封重置链接。'
                      : '登录后就能看到你们共同维护的采购清单。'}
                </p>
              </div>

              {mode !== 'reset' ? (
                <div className="auth-tabs" role="tablist" aria-label="登录或注册">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'login'}
                    className={mode === 'login' ? 'is-active' : ''}
                    onClick={() => switchMode('login')}
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signup'}
                    className={mode === 'signup' ? 'is-active' : ''}
                    onClick={() => switchMode('signup')}
                  >
                    注册
                  </button>
                </div>
              ) : null}

              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                {mode === 'signup' ? (
                  <label className="field">
                    <span className="field__label">TA 怎么称呼你</span>
                    <span className="field__control">
                      <UserRound size={18} />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="TA 怎么称呼你？"
                        autoComplete="nickname"
                        maxLength={24}
                      />
                    </span>
                  </label>
                ) : null}

                <label className="field">
                  <span className="field__label">邮箱</span>
                  <span className="field__control">
                    <Mail size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </span>
                </label>

                {mode !== 'reset' ? (
                  <label className="field">
                    <span className="field__label">密码</span>
                    <span className="field__control">
                      <LockKeyhole size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="至少 6 位"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      />
                      <button
                        type="button"
                        className="field__eye"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </label>
                ) : null}

                {error ? (
                  <div className="form-alert" role="alert">
                    {error}
                  </div>
                ) : null}
                {notice ? (
                  <div className="form-notice" role="status">
                    {notice}
                  </div>
                ) : null}

                <button type="submit" className="button button--primary button--wide" disabled={busy}>
                  {busy ? <LoaderCircle size={18} className="spin" /> : null}
                  {mode === 'login'
                    ? '进入我们的小家'
                    : mode === 'signup'
                      ? '创建账号'
                      : '发送重置邮件'}
                  {!busy ? <ArrowRight size={18} /> : null}
                </button>
              </form>

              <div className="auth-links">
                {mode === 'login' ? (
                  <>
                    <button type="button" onClick={() => switchMode('reset')}>
                      忘记密码？
                    </button>
                    <span>·</span>
                    <button type="button" onClick={() => switchMode('signup')}>
                      还没有账号
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => switchMode('login')}>
                    ← 返回登录
                  </button>
                )}
              </div>

              <p className="privacy-note">
                <LockKeyhole size={13} />
                登录信息只用来同步你们两个人的清单。
              </p>
            </>
          )}
        </div>

        <p className="auth__footer">
          <span className="auth__footer-dot" />
          只属于你们两个人的小清单
        </p>
      </section>
    </main>
  );
}
