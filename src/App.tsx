import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { AuthScreen } from './components/AuthScreen';
import { Home } from './components/Home';
import { Hub } from './components/Hub';
import { LogoMark } from './components/Logo';
import { Onboarding } from './components/Onboarding';
import { RecoveryScreen } from './components/RecoveryScreen';
import { parseDeepLink } from './lib/utils';
import { readPendingInvite, savePendingInvite } from './lib/invite';

const RoadtripPage = lazy(() =>
  import('./roadtrip/RoadtripPage').then((module) => ({ default: module.RoadtripPage })),
);

function Splash() {
  return (
    <div className="splash">
      <div className="splash__mark">
        <LogoMark size={68} />
        <span className="splash__ring" />
      </div>
      <strong>一起买</strong>
      <span>正在打开你们的小家…</span>
    </div>
  );
}

function ErrorScreen() {
  const { initError, retry, signOut } = useApp();
  const [busy, setBusy] = useState(false);

  return (
    <main className="error-screen">
      <div className="error-screen__card">
        <span className="round-icon round-icon--warm">
          <AlertTriangle size={24} />
        </span>
        <h1>清单暂时没打开</h1>
        <p>{initError ?? '网络好像不太稳定。检查一下连接，再试一次。'}</p>
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            setBusy(true);
            void retry().finally(() => setBusy(false));
          }}
          disabled={busy}
        >
          {busy ? <LoaderCircle size={17} className="spin" /> : <RefreshCw size={17} />}
          再试一次
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => void signOut().catch(() => undefined)}
        >
          退出，换个账号
        </button>
      </div>
    </main>
  );
}

function Shell() {
  const { phase, demoMode, enterDemo, recovery } = useApp();
  const [initialLink] = useState(() => parseDeepLink(window.location.search));
  const [hash, setHash] = useState(() => window.location.hash);
  const [joinCode, setJoinCode] = useState(() => initialLink.join ?? readPendingInvite());
  const demoStarted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('join') && !params.has('demo')) return;
    params.delete('join');
    params.delete('demo');
    const search = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
    );
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    // 快捷指令的「添加物品」永远先回到购物清单。
    if (!new URLSearchParams(window.location.search).has('add')) return;
    if (window.location.hash !== '#/shopping') {
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${window.location.search}#/shopping`,
      );
      setHash('#/shopping');
    }
  }, []);

  useEffect(() => {
    if (demoStarted.current || phase !== 'signedOut') return;
    if (initialLink.demo && demoMode) {
      demoStarted.current = true;
      void enterDemo('me');
    }
  }, [demoMode, enterDemo, initialLink.demo, phase]);

  useEffect(() => {
    if (phase === 'ready') {
      savePendingInvite('');
      setJoinCode('');
    } else {
      savePendingInvite(joinCode);
    }
  }, [joinCode, phase]);

  if (phase === 'loading') return <Splash />;
  if (phase === 'error') return <ErrorScreen />;
  if (phase === 'signedOut') return <AuthScreen inviteCode={joinCode} onInviteCodeChange={setJoinCode} />;
  if (phase === 'onboarding') return <Onboarding initialCode={joinCode} />;
  if (recovery) return <RecoveryScreen />;

  const activeHash = window.location.hash || hash;
  const hasAddDeepLink = new URLSearchParams(window.location.search).has('add');
  if (hasAddDeepLink) return <Home />;

  if (activeHash.startsWith('#/roadtrip')) {
    return (
      <Suspense fallback={<Splash />}>
        <RoadtripPage
          onBack={() => {
            window.history.pushState(
              {},
              '',
              `${window.location.pathname}${window.location.search}#/`,
            );
            setHash('#/');
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
        />
      </Suspense>
    );
  }

  if (activeHash.startsWith('#/shopping')) return <Home />;
  return <Hub />;
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ToastProvider>
  );
}
