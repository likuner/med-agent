"use client";

import { useState } from "react";
import { Collapse } from "antd";
import { BulbOutlined } from "@ant-design/icons";

export default function ThinkingProcess({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState<string[]>(["think"]);
  if (!thinking) return null;
  return (
    <div className="mb-2" onClick={(e) => e.stopPropagation()}>
      <Collapse
        activeKey={open}
        onChange={(k) => setOpen(Array.isArray(k) ? k : [k as string])}
        size="small"
        className="!bg-gray-50 !rounded-lg !border-gray-100"
        items={[
          {
            key: "think",
            label: (
              <span className="text-[13px] text-gray-500 flex items-center gap-1.5">
                <BulbOutlined /> 已深度思考
              </span>
            ),
            children: (
              <div className="text-[13px] leading-relaxed text-gray-500 whitespace-pre-wrap">
                {thinking}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
