"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Search, Table2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Card, EmptyState, Input, Spinner } from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { StatCard } from "@/components/molecules/StatCard";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { isProjectConfigTable } from "@/config/project-tables";
import { useDatabaseSchema } from "@/features/schema/queries";
import type { SchemaTableGroup } from "@/lib/db/repositories/schema.repository";
import { cn } from "@/lib/utils";

function formatType(dataType: string, udtName: string) {
  if (dataType === "USER-DEFINED") return udtName;
  if (dataType === "ARRAY") return `${udtName.replace(/^_/, "")}[]`;
  return udtName || dataType;
}

function typeBadgeVariant(type: string): "primary" | "secondary" | "success" | "warning" | "neutral" {
  const value = type.toLowerCase();
  if (value.includes("uuid") || value.includes("enum")) return "primary";
  if (value.includes("int") || value.includes("numeric") || value.includes("decimal")) return "warning";
  if (value.includes("timestamp") || value.includes("date")) return "success";
  if (value.includes("bool")) return "secondary";
  if (value.includes("char") || value.includes("text") || value.includes("json")) return "neutral";
  return "neutral";
}

function DatabaseTableChips({
  tables,
  selectedTable,
  onSelect,
}: {
  tables: SchemaTableGroup[];
  selectedTable: string | null;
  onSelect: (tableName: string) => void;
}) {
  const t = useTranslations("admin.database");

  if (tables.length === 0) {
    return (
      <div className="p-mol-md">
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    );
  }

  const sorted = [...tables].sort((a, b) => {
    const aConfig = isProjectConfigTable(a.tableName) ? 0 : 1;
    const bConfig = isProjectConfigTable(b.tableName) ? 0 : 1;
    if (aConfig !== bConfig) return aConfig - bConfig;
    return a.tableName.localeCompare(b.tableName);
  });

  return (
    <div className="flex flex-wrap gap-pad-atom p-pad-mol">
      {sorted.map((table) => {
        const active = selectedTable === table.tableName;
        const isConfig = isProjectConfigTable(table.tableName);

        return (
          <button
            key={table.tableName}
            type="button"
            onClick={() => onSelect(table.tableName)}
            className={cn(
              "inline-flex items-center gap-pad-atom rounded-full border px-pad-mol py-pad-atom text-xs transition-all",
              active
                ? "border-primary/30 bg-primary/10 font-medium text-primary shadow-sm ring-1 ring-primary/15"
                : "border-white/50 bg-white/40 text-foreground hover:bg-white/65",
            )}
          >
            <span className="font-mono">{table.tableName}</span>
            <span className={cn("tabular-nums", active ? "text-primary/70" : "text-muted")}>
              {table.columns.length}
            </span>
            {isConfig ? (
              <Badge variant={active ? "primary" : "secondary"} className="px-1.5 py-0 text-[10px]">
                {t("configBadge")}
              </Badge>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function DatabaseTableDetail({ table }: { table: SchemaTableGroup | null }) {
  const t = useTranslations("admin.database");

  if (!table) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-pad-atom-md p-mol-md text-center">
        <div className="rounded-2xl bg-white/50 p-mol-md text-muted">
          <Database className="size-10" />
        </div>
        <p className="text-sm text-muted">{t("selectTable")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[24rem] flex-col">
      <div className="flex items-center justify-between border-b border-white/45 px-mol-md py-pad-mol glass-toolbar">
        <div className="flex min-w-0 items-center gap-pad-atom-md">
          <div className="rounded-xl bg-primary/10 p-pad-atom text-primary">
            <Table2 className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-mono text-base font-semibold text-foreground">{table.tableName}</h3>
            <p className="text-xs text-muted">{t("columnCount", { count: table.columns.length })}</p>
          </div>
        </div>
        {isProjectConfigTable(table.tableName) ? (
          <Badge variant="secondary">{t("configBadge")}</Badge>
        ) : null}
      </div>

      <div className="overflow-auto">
        <Table className="rounded-none border-0 bg-transparent shadow-none">
          <TableHead>
            <Tr hoverable={false}>
              <Th>{t("column")}</Th>
              <Th>{t("type")}</Th>
              <Th>{t("nullable")}</Th>
              <Th>{t("default")}</Th>
            </Tr>
          </TableHead>
          <TableBody>
            {table.columns.map((column) => {
              const typeLabel = formatType(column.dataType, column.udtName);
              return (
                <Tr key={column.columnName}>
                  <Td className="font-mono text-xs">{column.columnName}</Td>
                  <Td>
                    <Badge variant={typeBadgeVariant(typeLabel)} className="font-mono">
                      {typeLabel}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={column.isNullable ? "neutral" : "success"}>
                      {column.isNullable ? t("yes") : t("no")}
                    </Badge>
                  </Td>
                  <Td className="max-w-xs truncate font-mono text-xs text-muted" title={column.columnDefault ?? undefined}>
                    {column.columnDefault ?? "—"}
                  </Td>
                </Tr>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DatabaseLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-mol-md p-mol-md">
      <div className="flex flex-wrap gap-pad-atom">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="h-8 w-28 animate-pulse rounded-full bg-white/40" />
        ))}
      </div>
      <div className="flex min-h-[24rem] items-center justify-center">
        <Spinner size="lg" />
      </div>
    </div>
  );
}

export function AdminDatabaseTables() {
  const t = useTranslations("admin.database");
  const { data, isLoading, isError } = useDatabaseSchema();
  const [query, setQuery] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const filteredTables = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;

    return data
      .map((table) => {
        const tableMatch = table.tableName.toLowerCase().includes(q);
        const columns = tableMatch
          ? table.columns
          : table.columns.filter(
              (column) =>
                column.columnName.toLowerCase().includes(q) ||
                column.dataType.toLowerCase().includes(q) ||
                column.udtName.toLowerCase().includes(q),
            );

        if (tableMatch || columns.length > 0) {
          return { ...table, columns };
        }
        return null;
      })
      .filter(Boolean) as SchemaTableGroup[];
  }, [data, query]);

  const totalColumns = filteredTables.reduce((sum, table) => sum + table.columns.length, 0);
  const activeTable = filteredTables.find((table) => table.tableName === selectedTable) ?? null;

  useEffect(() => {
    if (filteredTables.length === 0) {
      setSelectedTable(null);
      return;
    }

    const stillVisible = filteredTables.some((table) => table.tableName === selectedTable);
    if (!stillVisible) {
      setSelectedTable(filteredTables[0].tableName);
    }
  }, [filteredTables, selectedTable]);

  return (
    <AdminPageShell
      title={t("title")}
      description={t("subtitle")}
      stats={
        <div className="grid gap-mol sm:grid-cols-3">
          <StatCard label={t("statsTables")} value={data?.length ?? "—"} />
          <StatCard
            label={t("statsColumns")}
            value={data ? data.reduce((sum, table) => sum + table.columns.length, 0) : "—"}
          />
          <StatCard label={t("statsFiltered")} value={`${filteredTables.length} / ${totalColumns}`} />
        </div>
      }
    >
      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-white/45 p-mol-md glass-toolbar">
          <Input
            label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            startAddon={<Search className="size-4" />}
          />
        </div>

        {isLoading ? (
          <DatabaseLoadingSkeleton />
        ) : isError ? (
          <div className="p-mol-md">
            <Alert variant="danger">{t("error")}</Alert>
          </div>
        ) : (
          <>
            <div className="border-b border-white/40">
              <div className="border-b border-white/40 px-mol-md py-pad-mol">
                <p className="text-xs font-medium tracking-wide text-muted">{t("tableList")}</p>
              </div>
              <DatabaseTableChips
                tables={filteredTables}
                selectedTable={selectedTable}
                onSelect={setSelectedTable}
              />
            </div>

            <section className="min-w-0">
              <DatabaseTableDetail table={activeTable} />
            </section>
          </>
        )}
      </Card>
    </AdminPageShell>
  );
}
