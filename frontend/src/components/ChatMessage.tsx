"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function InlineRender({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="text-[var(--color-accent)] font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function renderContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (!line.trim()) return <br key={i} />;

    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <p key={i} className="font-semibold mb-1.5 text-sm tracking-wide">
          {line.slice(2, -2)}
        </p>
      );
    }

    if (line.trim().startsWith("- ")) {
      return (
        <li key={i} className="ml-4 list-disc text-sm marker:text-[var(--color-accent)] mb-0.5">
          <InlineRender text={line.trim().slice(2)} />
        </li>
      );
    }

    if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^\d+\.\s(.*)/);
      if (match) {
        return (
          <li key={i} className="ml-4 list-decimal text-sm marker:text-[var(--color-accent)] mb-0.5">
            <InlineRender text={match[1]} />
          </li>
        );
      }
    }

    if (line.startsWith("```") && line.endsWith("```") && line.length > 6) {
      return (
        <pre key={i} className="my-1.5 px-3 py-2 rounded-[var(--radius-md)] bg-black/20 text-xs text-[var(--color-text-secondary)] overflow-x-auto border border-[var(--color-border)] font-mono">
          {line.slice(3, -3)}
        </pre>
      );
    }

    return (
      <p key={i} className="mb-1">
        <InlineRender text={line} />
      </p>
    );
  });
}

export default function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} msg-enter`}>
      <div
        className={`max-w-[80%] md:max-w-[70%] ${
          isUser
            ? "bg-[var(--color-user-bg)] text-[var(--color-user-text)] rounded-[var(--radius-lg)] rounded-br-[4px]"
            : "glass rounded-[var(--radius-lg)] rounded-bl-[4px]"
        } ${isStreaming ? "animate-pulseGlow" : ""}`}
      >
        {/* 用户消息 — 简洁 */}
        {isUser ? (
          <div className="px-4 py-2.5">
            <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{content}</p>
          </div>
        ) : (
          <>
            {/* AI 消息头部 */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1.5 border-b border-[var(--color-border)]">
              <div className="w-5 h-5 rounded-[5px] bg-[var(--color-accent)] flex items-center justify-center text-[10px] text-[var(--color-user-text)] font-bold">
                CC
              </div>
              <span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Career Copilot
              </span>
            </div>

            {/* 消息内容 */}
            <div
              className={`px-4 py-3 text-sm leading-relaxed ${
                isStreaming ? "cursor-blink" : ""
              } [&_strong]:text-[var(--color-accent)]`}
            >
              {renderContent(content)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
