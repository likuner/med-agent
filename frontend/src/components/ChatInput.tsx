"use client";

import { useRef } from "react";
import { Button, Switch, Tooltip } from "antd";
import { SendOutlined, StopOutlined, BulbOutlined } from "@ant-design/icons";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  deepThink: boolean;
  onDeepThinkChange: (v: boolean) => void;
  placeholder?: string;
  size?: "hero" | "normal";
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  deepThink,
  onDeepThinkChange,
  placeholder = "输入你的健康问题，如：2 型糖尿病患者的日常血糖管理建议？",
  size = "normal",
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!streaming && value.trim()) onSend();
    }
  };

  return (
    <div
      className={`w-full bg-white border border-gray-200 rounded-2xl shadow-sm focus-within:border-[#4d6bfe]/50 transition-colors ${
        size === "hero" ? "p-4" : "p-3"
      }`}
    >
      <textarea
        ref={ref}
        rows={size === "hero" ? 3 : 2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full resize-none outline-none text-[15px] leading-relaxed placeholder:text-gray-400 bg-transparent"
      />
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2 text-[13px] text-gray-500">
          <BulbOutlined className={deepThink ? "text-[#4d6bfe]" : "text-gray-400"} />
          <span className={deepThink ? "text-[#4d6bfe]" : ""}>深度思考</span>
          <Switch size="small" checked={deepThink} onChange={onDeepThinkChange} />
        </div>
        {streaming ? (
          <Tooltip title="停止生成">
            <Button
              danger
              type="text"
              icon={<StopOutlined />}
              onClick={onStop}
              className="!rounded-lg"
            />
          </Tooltip>
        ) : (
          <Button
            type="primary"
            icon={<SendOutlined />}
            disabled={!value.trim()}
            onClick={onSend}
            className="!rounded-lg"
          >
            发送
          </Button>
        )}
      </div>
    </div>
  );
}
