"use client";

import { useState } from "react";
import { Button, Dropdown, Input, Modal, Tooltip, message } from "antd";
import {
  PlusOutlined,
  MessageOutlined,
  EditOutlined,
  DeleteOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { SessionInfo } from "@/lib/api";

interface SidebarProps {
  sessions: SessionInfo[];
  activeId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function Sidebar({
  sessions,
  activeId,
  collapsed,
  onToggleCollapse,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [modal, contextHolder] = Modal.useModal();

  if (collapsed) {
    return (
      <div className="w-12 shrink-0 border-r border-gray-100 bg-gray-50 flex flex-col items-center py-3 gap-3">
        <Button type="text" icon={<MenuUnfoldOutlined />} onClick={onToggleCollapse} />
        <Tooltip title="新对话" placement="right">
          <Button type="primary" icon={<PlusOutlined />} onClick={onNewChat} />
        </Tooltip>
      </div>
    );
  }

  const confirmDelete = (s: SessionInfo) => {
    modal.confirm({
      title: "删除对话",
      content: `确定删除「${s.title}」吗？该对话的所有消息将一并删除。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => onDelete(s.id),
    });
  };

  return (
    <div className="w-60 shrink-0 border-r border-gray-100 bg-gray-50 flex flex-col">
      {contextHolder}
      <div className="p-3 flex items-center justify-between">
        <span className="font-semibold text-[15px] pl-1">Medical Agent</span>
        <Button type="text" size="small" icon={<MenuFoldOutlined />} onClick={onToggleCollapse} />
      </div>

      <div className="px-3 pb-2">
        <Button
          type="primary"
          block
          icon={<PlusOutlined />}
          onClick={onNewChat}
          className="!rounded-lg"
        >
          新对话
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {sessions.map((s) => {
          const isActive = s.id === activeId;
          return (
            <div
              key={s.id}
              onClick={() => renamingId !== s.id && onSelect(s.id)}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                isActive ? "bg-[#e8eeff] text-[#4d6bfe]" : "text-gray-700 hover:bg-gray-200/70"
              }`}
            >
              <MessageOutlined className="shrink-0 text-xs" />
              {renamingId === s.id ? (
                <Input
                  size="small"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onPressEnter={async () => {
                    if (renameValue.trim()) await onRename(s.id, renameValue.trim());
                    setRenamingId(null);
                  }}
                  onBlur={async () => {
                    if (renameValue.trim() && renameValue.trim() !== s.title)
                      await onRename(s.id, renameValue.trim());
                    setRenamingId(null);
                  }}
                />
              ) : (
                <span className="flex-1 truncate">{s.title}</span>
              )}
              {renamingId !== s.id && (
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      {
                        key: "rename",
                        icon: <EditOutlined />,
                        label: "重命名",
                        onClick: ({ domEvent }) => {
                          domEvent.stopPropagation();
                          setRenamingId(s.id);
                          setRenameValue(s.title);
                        },
                      },
                      {
                        key: "delete",
                        icon: <DeleteOutlined />,
                        label: "删除",
                        danger: true,
                        onClick: ({ domEvent }) => {
                          domEvent.stopPropagation();
                          confirmDelete(s);
                        },
                      },
                    ],
                  }}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    className="!opacity-0 group-hover:!opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              )}
            </div>
          );
        })}
        {sessions.length === 0 && (
          <div className="text-center text-xs text-gray-400 pt-8">暂无历史对话</div>
        )}
      </div>

      <div className="p-3 text-[11px] text-gray-400 text-center border-t border-gray-100">
        内容由 AI 生成，仅供参考 · 具体诊疗请咨询医生
      </div>
    </div>
  );
}
