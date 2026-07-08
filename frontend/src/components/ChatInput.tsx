"use client";

import { useState, useRef } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  onFileUpload: (file: File) => void;
  disabled: boolean;
}

export default function ChatInput({
  onSend,
  onFileUpload,
  disabled,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
      <div className="max-w-3xl mx-auto flex items-end gap-2.5">
        {/* 附件按钮 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-subtle)] transition-all duration-200 disabled:opacity-40"
          title="上传简历 (PDF)"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />

        {/* 输入框 — 玻璃拟态 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            disabled={disabled}
            className="w-full resize-none rounded-[var(--radius-lg)] glass px-4 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition-all duration-200 disabled:opacity-50"
            style={{ minHeight: "44px" }}
          />
        </div>

        {/* 发送按钮 */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-user-text)] hover:bg-[var(--color-accent-hover)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(212,168,83,0.15)] hover:shadow-[0_0_30px_rgba(212,168,83,0.25)]"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
