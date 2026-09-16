"use client";

import { useState } from "react";
import { Collapse, Empty, Tag, Tooltip } from "antd";
import { FileSearchOutlined, LinkOutlined } from "@ant-design/icons";
import type { Citation } from "@/lib/api";

export default function CitationPanel({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = useState<string[]>([]);
  if (!citations?.length) return null;
  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      <Collapse
        activeKey={open}
        onChange={(k) => setOpen(Array.isArray(k) ? k : [k as string])}
        size="small"
        ghost
        className="!rounded-lg citation-collapse"
        items={[
          {
            key: "cite",
            label: (
              <span className="text-[13px] text-gray-500 flex items-center gap-1.5">
                <FileSearchOutlined /> 参考来源（{citations.length}）
              </span>
            ),
            children: (
              <div className="space-y-2">
                {citations.map((c, i) => (
                  <div
                    key={c.chunk_id}
                    className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-[13px]"
                  >
                    <div className="flex items-center gap-2">
                      <Tag color="blue" className="!m-0">
                        {i + 1}
                      </Tag>
                      <span className="font-medium text-gray-800 flex-1 truncate">
                        {c.title || "未命名文献"}
                      </span>
                      <Tooltip title={`相似度 ${c.score}`}>
                        <span className="text-xs text-gray-400">{c.score}</span>
                      </Tooltip>
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4d6bfe]"
                        >
                          <LinkOutlined />
                        </a>
                      )}
                    </div>
                    <div className="text-gray-500 mt-1 line-clamp-2 text-xs leading-relaxed">
                      {c.snippet}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">来源: {c.source}</div>
                  </div>
                ))}
                {citations.length === 0 && <Empty description="无引用" />}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
