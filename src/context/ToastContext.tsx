import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

type ToastAction = {
  label: string;
  onClick: () => void;
};

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
};

type ShowToastOptions = {
  tone?: ToastTone;
  action?: ToastAction;
  duration?: number;
};

type ToastContextValue = {
  showToast: (message: string, options?: ShowToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options: ShowToastOptions = {}) => {
      const id = makeId();
      const toast: Toast = {
        id,
        message,
        tone: options.tone ?? 'info',
        action: options.action,
      };
      setToasts((current) => [...current.slice(-2), toast]);
      const timer = setTimeout(() => dismiss(id), options.duration ?? 3800);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className={`toast toast--${toast.tone}`} role="status" key={toast.id}>
            <span className="toast__icon" aria-hidden="true">
              {toast.tone === 'success' ? (
                <CheckCircle2 size={18} />
              ) : toast.tone === 'error' ? (
                <AlertCircle size={18} />
              ) : (
                <Info size={18} />
              )}
            </span>
            <span className="toast__message">{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(toast.id)}
              aria-label="关闭提示"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
