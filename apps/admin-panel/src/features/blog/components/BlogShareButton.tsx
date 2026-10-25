"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/atoms";

export function BlogShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={() => void share()}>
      {copied ? (
        <>
          <Check className="size-4" /> لینک کپی شد
        </>
      ) : (
        <>
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <Share2 className="size-4" />
          ) : (
            <Link2 className="size-4" />
          )}
          اشتراک‌گذاری
        </>
      )}
    </Button>
  );
}
