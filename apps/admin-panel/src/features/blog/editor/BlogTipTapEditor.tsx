"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Package,
  Quote,
  Search,
  Table as TableIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, ModalBody, ModalFooter } from "@/components/atoms";
import { ProductEmbed } from "@/features/blog/editor/extensions/product-embed";
import { useBlogInternalLinkSearch } from "@/features/blog/queries";
import { emptyTipTapDoc } from "@/features/blog/schema";
import { MEDIA_FOLDERS } from "@/lib/media/folders";
import { useUploadMedia } from "@/features/media/queries";
import { handleApiError } from "@/lib/api/client";

type TipTapDoc = Record<string, unknown>;

export interface BlogTipTapEditorProps {
  value: TipTapDoc;
  onChange: (value: TipTapDoc) => void;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg p-1.5 ${active ? "bg-primary/15 text-primary" : "text-muted hover:bg-white/50 hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

export function BlogTipTapEditor({ value, onChange, disabled }: BlogTipTapEditorProps) {
  const t = useTranslations("admin.blog.editor");
  const upload = useUploadMedia();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkQ, setLinkQ] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const linkSearch = useBlogInternalLinkSearch(linkQ);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: t("placeholder") }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ProductEmbed,
    ],
    content: value?.type ? value : emptyTipTapDoc,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON() as TipTapDoc);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value);
    if (current !== next) {
      editor.commands.setContent(value.type ? value : emptyTipTapDoc, { emitUpdate: false });
    }
  }, [editor, value]);

  async function insertImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      setError(null);
      try {
        const alt = window.prompt(t("altTextRequired"), file.name)?.trim();
        if (!alt) {
          setError(t("altTextRequiredError"));
          return;
        }
        const media = await upload.mutateAsync({
          file,
          options: { folder: MEDIA_FOLDERS.BLOG, altText: alt, title: file.name },
        });
        editor.chain().focus().setImage({ src: media.url, alt }).run();
      } catch (err) {
        setError(handleApiError(err));
      }
    };
    input.click();
  }

  function applyHref(href: string) {
    if (!editor || !href.trim()) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
    setLinkOpen(false);
    setLinkQ("");
    setManualUrl("");
  }

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/40">
      <div className="flex flex-wrap gap-0.5 border-b border-white/50 p-2">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="H2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="H3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Ordered"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Table"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <TableIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton title={t("insertLink")} onClick={() => setLinkOpen(true)}>
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton title={t("insertImage")} onClick={() => void insertImage()}>
          <ImageIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title={t("productEmbed")}
          onClick={() => editor.chain().focus().insertContent({ type: "productEmbed", attrs: { productId: null } }).run()}
        >
          <Package className="size-4" />
        </ToolbarButton>
      </div>

      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 min-h-[280px] focus:outline-none [&_.ProseMirror]:min-h-[260px] [&_.ProseMirror]:outline-none"
      />

      {error ? <p className="px-4 pb-3 text-sm text-danger">{error}</p> : null}

      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title={t("insertLink")} size="md">
        <ModalBody className="grid gap-mol">
          <Input
            label={t("searchInternal")}
            value={linkQ}
            onChange={(e) => setLinkQ(e.target.value)}
            startAddon={<Search className="size-4" />}
          />
          <ul className="max-h-48 space-y-1 overflow-auto">
            {(linkSearch.data?.posts ?? []).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-start text-sm hover:bg-white/60"
                  onClick={() => applyHref(p.href)}
                >
                  {p.titleFa} <span className="text-muted">({p.href})</span>
                </button>
              </li>
            ))}
            {(linkSearch.data?.products ?? []).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-start text-sm hover:bg-white/60"
                  onClick={() => applyHref(p.href)}
                >
                  {p.title} <span className="text-muted">({p.href})</span>
                </button>
              </li>
            ))}
          </ul>
          <Input
            label={t("manualUrl")}
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            dir="ltr"
          />
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={() => applyHref(manualUrl)}>
            {t("applyLink")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
