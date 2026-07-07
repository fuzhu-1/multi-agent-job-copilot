"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function ChatMessage({
  role,
  content,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === "user";

  // 简单渲染 Markdown（换行、加粗、列表）
  const renderContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // 空行
      if (!line.trim()) return <br key={i} />;

      // 标题
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={i} className="font-semibold mb-1">
            {line.slice(2, -2)}
          </p>
        );
      }

      // 列表项
      if (line.trim().startsWith("- ")) {
        return (
          <li key={i} className="ml-4 list-disc">
            <InlineRender text={line.trim().slice(2)} />
          </li>
        );
      }

      // 数字列表
      if (/^\d+\.\s/.test(line.trim())) {
        const match = line.trim().match(/^\d+\.\s(.*)/);
        if (match) {
          return (
            <li key={i} className="ml-4 list-decimal">
              <InlineRender text={match[1]} />
            </li>
          );
        }
      }

      // 普通文本 — 行内加粗
      return (
        <p key={i} className="mb-1">
          <InlineRender text={line} />
        </p>
      );
    });
  };

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-[var(--color-user-bubble)] text-white rounded-br-md"
            : "bg-[var(--color-assistant-bubble)] border border-[var(--color-border)] rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className={`text-sm leading-relaxed ${
              isStreaming ? "cursor-blink" : ""
            }`}
          >
            {renderContent(content)}
          </div>
        )}
      </div>
    </div>
  );
}

/** 行内渲染：把 **bold** 转换成 <strong> */
function InlineRender({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
