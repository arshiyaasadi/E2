"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/atoms";
import type { DescriptionBlock } from "@/types/domain";

export function DescriptionBlocksEditor({
  value,
  onChange,
  label,
}: {
  value: DescriptionBlock[];
  onChange: (value: DescriptionBlock[]) => void;
  label?: string;
}) {
  function updateAt(index: number, next: DescriptionBlock) {
    onChange(value.map((item, i) => (i === index ? next : item)));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-mol">
      {label ? <span className="text-sm font-medium text-foreground">{label}</span> : null}
      <p className="text-xs text-muted">
        بلوک‌های متن، چک‌لیست و جدول — در صفحه محصول فروشگاه نمایش داده می‌شود
      </p>
      {value.map((block, index) => (
        <div key={index} className="rounded-2xl border border-white/50 bg-white/35 p-pad-mol">
          <div className="mb-pad-atom flex flex-wrap items-center justify-between gap-pad-atom">
            <select
              className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
              value={block.type}
              onChange={(event) => {
                const type = event.target.value as DescriptionBlock["type"];
                if (type === "text") updateAt(index, { type: "text", body: "" });
                else if (type === "checklist") updateAt(index, { type: "checklist", items: [""] });
                else updateAt(index, { type: "table", rows: [{ label: "", value: "" }] });
              }}
            >
              <option value="text">متن</option>
              <option value="checklist">چک‌لیست</option>
              <option value="table">جدول</option>
            </select>
            <Button type="button" size="sm" variant="outline" onClick={() => removeAt(index)}>
              <Trash2 className="size-4" />
            </Button>
          </div>

          {block.type === "text" ? (
            <textarea
              className="min-h-24 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
              value={block.body}
              onChange={(event) => updateAt(index, { type: "text", body: event.target.value })}
            />
          ) : null}

          {block.type === "checklist" ? (
            <div className="grid gap-pad-atom">
              {block.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex gap-pad-atom">
                  <Input
                    value={item}
                    onChange={(event) => {
                      const items = block.items.map((v, i) =>
                        i === itemIndex ? event.target.value : v,
                      );
                      updateAt(index, { type: "checklist", items });
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateAt(index, {
                        type: "checklist",
                        items: block.items.filter((_, i) => i !== itemIndex),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                startIcon={<Plus className="size-4" />}
                onClick={() => updateAt(index, { type: "checklist", items: [...block.items, ""] })}
              >
                آیتم
              </Button>
            </div>
          ) : null}

          {block.type === "table" ? (
            <div className="grid gap-pad-atom">
              {block.rows.map((row, rowIndex) => (
                <div key={rowIndex} className="grid gap-pad-atom sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    placeholder="برچسب"
                    value={row.label}
                    onChange={(event) => {
                      const rows = block.rows.map((r, i) =>
                        i === rowIndex ? { ...r, label: event.target.value } : r,
                      );
                      updateAt(index, { type: "table", rows });
                    }}
                  />
                  <Input
                    placeholder="مقدار"
                    value={row.value}
                    onChange={(event) => {
                      const rows = block.rows.map((r, i) =>
                        i === rowIndex ? { ...r, value: event.target.value } : r,
                      );
                      updateAt(index, { type: "table", rows });
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateAt(index, {
                        type: "table",
                        rows: block.rows.filter((_, i) => i !== rowIndex),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                startIcon={<Plus className="size-4" />}
                onClick={() =>
                  updateAt(index, {
                    type: "table",
                    rows: [...block.rows, { label: "", value: "" }],
                  })
                }
              >
                ردیف
              </Button>
            </div>
          ) : null}
        </div>
      ))}

      <div className="flex flex-wrap gap-pad-atom">
        <Button
          type="button"
          size="sm"
          variant="outline"
          startIcon={<Plus className="size-4" />}
          onClick={() => onChange([...value, { type: "text", body: "" }])}
        >
          بلوک متن
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          startIcon={<Plus className="size-4" />}
          onClick={() => onChange([...value, { type: "checklist", items: [""] }])}
        >
          چک‌لیست
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          startIcon={<Plus className="size-4" />}
          onClick={() => onChange([...value, { type: "table", rows: [{ label: "", value: "" }] }])}
        >
          جدول
        </Button>
      </div>
    </div>
  );
}
