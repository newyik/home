// 手机上点按钮时轻轻震一下。
// 只在触屏设备上生效，电脑和 Mac 外壳不受影响；不改任何页面结构和业务逻辑。
// 安卓用 navigator.vibrate；iPhone 的 Safari 不支持它，
// 改用 iOS 18 起的「开关」复选框：点它的 label 时系统会给一次触感反馈。

const TAPPABLE = 'button, [role="button"], a[href], input[type="checkbox"], input[type="radio"], label, summary';

let iosSwitch: HTMLLabelElement | null = null;

function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

export function haptic(ms = 10) {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
  } else {
    iosTick();
  }
}

export function installTapHaptics() {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (!isTouch) return;
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      // 跳过隐藏开关自己触发的点击，避免死循环
      if (!target || iosSwitch?.contains(target)) return;
      const el = target.closest(TAPPABLE);
      if (!el || (el as HTMLButtonElement).disabled) return;
      haptic();
    },
    { capture: true, passive: true },
  );
}
