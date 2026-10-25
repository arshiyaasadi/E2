/**
 * @level atom
 * @spacing internal: -space-x-pad-atom-md (group overlap) | external: none
 */
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  className?: string;
  status?: "online" | "offline" | "busy";
}

const sizes: Record<AvatarSize, string> = {
  xs: "size-6 text-xs",
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-12 text-lg",
  xl: "size-16 text-xl",
};

const statusStyles = {
  online:  "bg-green-500",
  offline: "bg-gray-400",
  busy:    "bg-amber-500",
};

function getInitials(name?: string): string {
  if (!name) return "؟";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export function Avatar({ src, name, size = "md", className, status }: AvatarProps) {
  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          "rounded-full overflow-hidden inline-flex items-center justify-center font-semibold",
          "bg-primary-100 text-primary-700",
          sizes[size],
          className,
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name ?? "avatar"} className="h-full w-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            "absolute bottom-0 end-0 block rounded-full ring-2 ring-surface",
            size === "xs" || size === "sm" ? "size-2" : "size-2.5",
            statusStyles[status],
          )}
        />
      )}
    </div>
  );
}

export function AvatarGroup({
  avatars,
  max = 4,
}: {
  avatars: AvatarProps[];
  max?: number;
}) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className="flex items-center -space-x-pad-atom-md space-x-reverse">
      {visible.map((avatar, i) => (
        <Avatar
          key={i}
          {...avatar}
          className={cn("ring-2 ring-surface", avatar.className)}
        />
      ))}
      {overflow > 0 && (
        <div className="inline-flex size-10 items-center justify-center rounded-full bg-surface-2 ring-2 ring-surface text-sm font-medium text-muted">
          +{overflow}
        </div>
      )}
    </div>
  );
}
