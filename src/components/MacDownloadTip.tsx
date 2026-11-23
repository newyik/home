import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { MAC_DOWNLOAD_URL, MAC_TIP_DISMISSED_KEY, shouldOfferMacClient } from '../lib/macClient';

function initiallyVisible(): boolean {
  try {
    if (localStorage.getItem(MAC_TIP_DISMISSED_KEY)) return false;
  } catch {
    // 无痕模式等情况读不了 localStorage，照常显示
  }
  return shouldOfferMacClient(navigator.userAgent, navigator.maxTouchPoints ?? 0);
}

export function MacDownloadTip() {
  const [visible, setVisible] = useState(initiallyVisible);
  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(MAC_TIP_DISMISSED_KEY, '1');
    } catch {
      // 记不住也没关系，只是下次还会显示
    }
  };

  return (
    <aside className="mac-tip" aria-label="Mac 客户端下载">
      <button type="button" className="mac-tip-close" onClick={dismiss} aria-label="不再提示">
        <X size={16} />
      </button>
      <strong>小家控有 Mac 版了</strong>
      <p>独立窗口，带快捷键。首次打开如果提示无法验证开发者，右键点 App 选「打开」。</p>
      <a className="mac-tip-link" href={MAC_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
        <Download size={16} />
        下载 Mac 版
      </a>
    </aside>
  );
}
