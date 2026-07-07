"use client";

interface SidebarProps {
  sessions: { id: string; preview: string }[];
  currentSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
}: SidebarProps) {
  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col hidden md:flex">
      {/* 新对话按钮 */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-bg)] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          新对话
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-xs text-[var(--color-text-secondary)] text-center py-8">
            暂无对话记录
          </p>
        )}

        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
              s.id === currentSessionId
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                : "hover:bg-[var(--color-bg)]"
            }`}
          >
            <p className="truncate">{s.preview || "新对话"}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {s.id.slice(0, 12)}
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}
