/**
 * @level atom
 * @spacing internal: px-pad-mol py-pad-atom-md (Th/Td) | external: none
 */
import { cn } from "@/lib/utils";

export function Table({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table
        className={cn("min-w-full divide-y divide-border text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-surface-2", className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-border bg-surface", className)}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function Th({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "px-pad-mol py-pad-atom-md text-start text-xs font-semibold uppercase tracking-wider text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("whitespace-nowrap px-pad-mol py-pad-atom-md text-start text-foreground", className)}
      {...props}
    >
      {children}
    </td>
  );
}

export function Tr({
  className,
  hoverable = true,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { hoverable?: boolean }) {
  return (
    <tr
      className={cn(hoverable && "hover:bg-surface-2 transition-colors", className)}
      {...props}
    >
      {children}
    </tr>
  );
}
