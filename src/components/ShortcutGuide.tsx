import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Info,
  Link2,
  Plus,
  Share2,
  Smartphone,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { appUrl, copyText, shortcutAddUrl } from '../lib/utils';

function CopyButton({ value, label }: { value: string; label: string }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await copyText(value);
      setCopied(true);
      showToast(`${label}已复制。`, { tone: 'success' });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('复制失败，长按上面的链接手动复制吧。', { tone: 'error' });
    }
  };

  return (
    <button type="button" className="link-row__copy" onClick={() => void copy()} aria-label={`复制${label}`}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? '已复制' : '复制'}
    </button>
  );
}

export function ShortcutGuide() {
  const url = appUrl();
  const shoppingUrl = `${url}#/shopping`;
  const addUrl = shortcutAddUrl();
  const addDisplay = `${url}?add=牛奶&quick=1#/shopping`;

  return (
    <div className="shortcut-guide">
      <div className="shortcut-card">
        <div className="shortcut-card__head">
          <span className="round-icon round-icon--small">
            <ExternalLink size={17} />
          </span>
          <div>
            <strong>一键打开清单</strong>
            <small>最适合放在主屏幕，出门点一下。</small>
          </div>
        </div>

        <div className="link-row">
          <code>{shoppingUrl}</code>
          <CopyButton value={shoppingUrl} label="清单链接" />
        </div>

        <ol className="steps">
          <li>打开 iPhone 的「快捷指令」App，点右上角「＋」。</li>
          <li>搜索「打开 URL」，把上面的链接粘进去。</li>
          <li>命名为「一起买」，换成购物袋图标，添加到主屏幕。</li>
        </ol>
      </div>

      <div className="shortcut-card">
        <div className="shortcut-card__head">
          <span className="round-icon round-icon--small">
            <Plus size={17} />
          </span>
          <div>
            <strong>说一句，就加到清单</strong>
            <small>比如对手机说「嘿 Siri，家里缺牛奶」。</small>
          </div>
        </div>

        <div className="link-row">
          <code>{addDisplay}</code>
          <CopyButton value={addUrl} label="快速添加链接" />
        </div>

        <ol className="steps">
          <li>新建快捷指令，添加「询问输入」，类型选文本。</li>
          <li>添加「URL 编码」，把输入内容编码。</li>
          <li>
            添加「打开 URL」，填 <code>{url}?add=</code>，后面接编码后的变量，最后加{' '}
            <code>&amp;quick=1#/shopping</code>。
          </li>
          <li>把它命名为「家里缺什么」，就可以用 Siri 或主屏幕运行了。</li>
        </ol>

        <p className="shortcut-tip">
          <Info size={14} />
          上面的示例链接会直接添加「牛奶」。第一次先在 Safari 里登录一次，之后快捷指令会直接进入你们的小家。
        </p>
      </div>

      <div className="shortcut-meta">
        <span>
          <Smartphone size={14} /> 添加到主屏幕：Safari 分享菜单 → 添加到主屏幕
        </span>
        <span>
          <Share2 size={14} /> 发给 TA：把链接和登录方式一起发过去
        </span>
        <span>
          <Link2 size={14} /> 需要先登录一次，Safari 会记住
        </span>
      </div>
    </div>
  );
}
