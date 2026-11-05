import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  LoaderCircle,
  LogOut,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';
import { AvatarPicker } from './AvatarPicker';
import { Sheet } from './Sheet';
import { ShortcutGuide } from './ShortcutGuide';
import {
  appUrl,
  copyText,
  cx,
  formatInviteCode,
  friendlyWorkspaceError,
} from '../lib/utils';
import type { DemoIdentity } from '../lib/backend';

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    workspace,
    account,
    demoMode,
    updateProfile,
    clearCompleted,
    signOut,
    switchDemoIdentity,
    resetDemo,
  } = useApp();
  const { showToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [demoBusy, setDemoBusy] = useState<DemoIdentity | null>(null);

  useEffect(() => {
    if (!open) return;
    setNameDraft(workspace?.me.displayName ?? '');
    setEditingName(false);
    setEditingAvatar(false);
    setNameError(null);
    setConfirmClear(false);
    setConfirmReset(false);
    setClearBusy(false);
    setDemoBusy(null);
  }, [open, workspace?.me.displayName]);

  if (!workspace || !account) return null;

  const doneItems = workspace.items.filter((item) => item.done);
  const inviteCode = formatInviteCode(workspace.household.inviteCode);

  const copyCode = async () => {
    try {
      await copyText(workspace.household.inviteCode);
      showToast('邀请码已复制，发给 TA 吧。', { tone: 'success' });
    } catch {
      showToast('复制失败，长按邀请码手动复制。', { tone: 'error' });
    }
  };

  const shareInvite = async () => {
    const text = `来加入「${workspace.household.name}」的采购清单吧。邀请码：${workspace.household.inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: '一起买', text, url: appUrl() });
        return;
      } catch {
        return;
      }
    }
    try {
      await copyText(`${text}\n${appUrl()}`);
      showToast('邀请信息已复制。', { tone: 'success' });
    } catch {
      showToast('分享失败，手动复制邀请码吧。', { tone: 'error' });
    }
  };

  const saveName = async () => {
    if (!nameDraft.trim()) {
      setNameError('名字不能为空。');
      return;
    }
    setNameBusy(true);
    setNameError(null);
    try {
      await updateProfile(nameDraft);
      setEditingName(false);
      showToast('名字已经改好了。', { tone: 'success' });
    } catch (caught) {
      setNameError(friendlyWorkspaceError(caught instanceof Error ? caught.message : '保存失败。'));
    } finally {
      setNameBusy(false);
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setClearBusy(true);
    try {
      await clearCompleted();
      showToast(`已清除 ${doneItems.length} 件已买的东西。`, { tone: 'success' });
      setConfirmClear(false);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '清除失败。', { tone: 'error' });
    } finally {
      setClearBusy(false);
    }
  };

  const switchIdentity = async (identity: DemoIdentity) => {
    setDemoBusy(identity);
    try {
      await switchDemoIdentity(identity);
      showToast(identity === 'me' ? '已切换到我的视角。' : '已切换到 TA 的视角。', {
        tone: 'info',
      });
    } finally {
      setDemoBusy(null);
    }
  };

  const handleResetDemo = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setDemoBusy('me');
    try {
      await resetDemo();
      showToast('演示数据已经恢复。', { tone: 'success' });
      setConfirmReset(false);
    } finally {
      setDemoBusy(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="设置"
      description="把小家调成你们喜欢的样子。"
      size="wide"
      className="settings-sheet"
    >
      <div className="settings">
        {demoMode ? (
          <div className="demo-banner">
            <Sparkles size={16} />
            <span>
              这是本地演示。数据只留在这台设备，配置 Supabase 后才会两个人同步。
            </span>
          </div>
        ) : null}

        <section className="settings-profile">
          <button type="button" className="settings-avatar-button" onClick={() => setEditingAvatar(value => !value)}
            aria-expanded={editingAvatar} aria-controls="avatar-editor">
            <Avatar name={workspace.me.displayName} color={workspace.me.color} avatar={workspace.me.avatar} size={54} />
            <span>更换头像</span>
          </button>
          {editingName ? (
            <div className="settings-profile__edit">
              <input
                className="inline-input"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={24}
                aria-label="你的名字"
                autoFocus
              />
              <div className="settings-profile__edit-actions">
                <button
                  type="button"
                  className="button button--primary button--small"
                  onClick={() => void saveName()}
                  disabled={nameBusy}
                >
                  {nameBusy ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />}
                  保存
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => {
                    setEditingName(false);
                    setNameDraft(workspace.me.displayName);
                    setNameError(null);
                  }}
                  disabled={nameBusy}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-profile__info">
              <strong>{workspace.me.displayName}</strong>
              <span>{account.email || '本地演示账号'}</span>
            </div>
          )}
          {!editingName ? (
            <button
              type="button"
              className="icon-button icon-button--soft"
              onClick={() => setEditingName(true)}
              aria-label="修改名字"
            >
              <Pencil size={16} />
            </button>
          ) : null}
        </section>
        {editingAvatar ? (
          <div id="avatar-editor">
            <AvatarPicker key={account.userId} member={workspace.me} onSave={async avatar => {
              await updateProfile(undefined, avatar);
              setEditingAvatar(false);
              showToast('新头像已经保存啦。', { tone: 'success' });
            }} />
          </div>
        ) : null}
        {nameError ? (
          <div className="form-alert" role="alert">
            {nameError}
          </div>
        ) : null}

        <section className="settings-section">
          <div className="section-heading">
            <h3>你们的小家</h3>
            <span>{workspace.members.length} 人</span>
          </div>

          <div className="invite-card">
            <div className="invite-card__main">
              <div>
                <span className="invite-card__label">邀请码</span>
                <strong className="invite-code">{inviteCode}</strong>
                <small>TA 注册后输入这个码，就能看到同一份清单。</small>
              </div>
              <div className="invite-card__actions">
                <button type="button" className="icon-button icon-button--soft" onClick={() => void copyCode()} aria-label="复制邀请码">
                  <Copy size={16} />
                </button>
                <button type="button" className="icon-button icon-button--soft" onClick={() => void shareInvite()} aria-label="分享邀请">
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            <div className="member-list">
              {workspace.members.map((member) => (
                <div className="member-row" key={member.id}>
                  <Avatar name={member.displayName} color={member.color} avatar={member.avatar} size={32} />
                  <span>{member.displayName}</span>
                  {member.isMe ? <em>我</em> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-heading">
            <h3>iPhone 快捷指令</h3>
            <span>推荐</span>
          </div>
          <p className="section-lead">
            第一次在 Safari 登录一次，之后用快捷指令就能一按直达，或者直接说一句把东西加进来。
          </p>
          <ShortcutGuide />
        </section>

        <section className="settings-section">
          <div className="section-heading">
            <h3>清单维护</h3>
          </div>
          <div className="settings-list">
            <button
              type="button"
              className={cx('settings-row', confirmClear && 'settings-row--warn')}
              onClick={() => void handleClear()}
              disabled={doneItems.length === 0 || clearBusy}
            >
              <span className="settings-row__icon">
                {clearBusy ? <LoaderCircle size={17} className="spin" /> : <Trash2 size={17} />}
              </span>
              <span className="settings-row__text">
                <strong>{confirmClear ? `再点一次，清除 ${doneItems.length} 件` : '清除已买'}</strong>
                <small>{doneItems.length > 0 ? `已买 ${doneItems.length} 件` : '还没有已买的东西'}</small>
              </span>
            </button>
          </div>
        </section>

        {demoMode ? (
          <section className="settings-section">
            <div className="section-heading">
              <h3>演示身份</h3>
              <span>本地</span>
            </div>
            <p className="section-lead">切换身份，看看同一份清单在对方眼里是什么样子。</p>
            <div className="demo-switch">
              {workspace.members.map((member) => {
                const identity: DemoIdentity = member.id.includes('partner') ? 'partner' : 'me';
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={cx('demo-switch__button', member.isMe && 'is-active')}
                    onClick={() => void switchIdentity(identity)}
                    disabled={demoBusy !== null || member.isMe}
                  >
                    <Avatar name={member.displayName} color={member.color} avatar={member.avatar} size={30} />
                    <span>{member.displayName}</span>
                    {demoBusy === identity ? (
                      <LoaderCircle size={15} className="spin" />
                    ) : member.isMe ? (
                      <Check size={15} />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={cx('button button--ghost button--wide button--small', confirmReset && 'button--danger')}
              onClick={() => void handleResetDemo()}
              disabled={demoBusy !== null}
            >
              <RefreshCw size={15} />
              {confirmReset ? '再点一次，恢复演示数据' : '重置演示数据'}
            </button>
          </section>
        ) : null}

        <section className="settings-section settings-section--danger">
          <div className="settings-list">
            <button type="button" className="settings-row" onClick={() => void signOut()}>
              <span className="settings-row__icon">
                <LogOut size={17} />
              </span>
              <span className="settings-row__text">
                <strong>退出登录</strong>
                <small>下次需要重新输入邮箱和密码</small>
              </span>
            </button>
          </div>
        </section>

        <div className="settings-footer">
          <span className="settings-footer__mark">
            <UserRound size={14} />
          </span>
          <span>一起买 · 两个人，刚刚好</span>
          <span className="settings-footer__version">v1.0</span>
        </div>

        {demoMode ? (
          <p className="settings-note">
            <AlertTriangle size={13} />
            演示数据只保存在本机浏览器，换设备不会同步。
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
