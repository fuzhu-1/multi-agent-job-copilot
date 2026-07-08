"use client";

interface SessionInfo {
  id: string;
  preview: string;
}

interface SidebarProps {
  sessions: SessionInfo[];
  currentSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}

function SessionTime({ id }: { id: string }) {
  const ts = id.startsWith("session_")
    ? new Date(parseInt(id.slice(8), 36))
    : null;
  if (!ts) return null;

  const now = new Date();
  const diff = now.getTime() - ts.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  let label: string;
  if (mins < 1) label = "刚刚";
  else if (mins < 60) label = `${mins} 分钟前`;
  else if (hours < 24) label = `${hours} 小时前`;
  else if (days < 7) label = `${days} 天前`;
  else label = ts.toLocaleDateString("zh-CN");

  return <span className="text-[10px] text-[var(--color-text-muted)]">{label}</span>;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
}: SidebarProps) {
  return (
    <aside className="w-[var(--sidebar-width)] border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col hidden md:flex relative z-10 animate-fade-in">
      {/* 品牌区 */}
      <div className="px-5 pt-6 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-user-text)] font-semibold text-sm">
            CC
          </div>
          <span
            className="text-base font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Career Copilot
          </span>
        </div>

        <button
          onClick={onNewChat}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200 text-[var(--color-accent)] border border-[var(--color-accent-border)] hover:bg-[var(--color-accent-subtle)] hover:shadow-[0_0_20px_rgba(212,168,83,0.08)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          新对话
        </button>
      </div>

      {/* 会话列表 — 时间线风格 */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {sessions.length === 0 && (
          <div className="text-center py-10">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border border-dashed border-[var(--color-border-strong)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">暂无对话记录</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-50">开始一段新对话吧</p>
          </div>
        )}

        <div className="space-y-1 relative">
          {/* 时间线竖线 */}
          {sessions.length > 0 && (
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[var(--color-border)]" />
          )}

          {sessions.map((s, i) => {
            const isActive = s.id === currentSessionId;
            return (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`w-full text-left relative pl-9 pr-3 py-2.5 rounded-[var(--radius-md)] text-sm transition-all duration-200 group animate-slide-in-left ${
                  isActive
                    ? "bg-[var(--color-accent-subtle)]"
                    : "hover:bg-[var(--color-surface-hover)]"
                }`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                {/* 时间线圆点 */}
                <span
                  className={`absolute left-[7px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full border-2 transition-all duration-200 ${
                    isActive
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] shadow-[0_0_8px_rgba(212,168,83,0.3)]"
                      : "border-[var(--color-border-strong)] bg-[var(--color-surface)] group-hover:border-[var(--color-text-muted)]"
                  }`}
                />

                {/* 内容 */}
                <p
                  className={`truncate text-sm leading-snug ${
                    isActive ? "text-[var(--color-text)] font-medium" : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {s.preview || "新对话"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <SessionTime id={s.id} />
                  {isActive && (
                    <span className="text-[10px] text-[var(--color-accent)]">当前</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 底部 */}
      <div className="px-4 py-3 border-t border-[var(--color-border)]">
        <p className="text-[10px] text-[var(--color-text-muted)] text-center">
          Agentic Career Copilot v0.2
        </p>
      </div>
    </aside>
  );
}
