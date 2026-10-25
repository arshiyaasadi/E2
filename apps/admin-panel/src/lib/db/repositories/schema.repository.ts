import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface SchemaColumnRow {
  tableName: string;
  columnName: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  columnDefault: string | null;
}

export interface SchemaTableGroup {
  tableName: string;
  columns: SchemaColumnRow[];
}

export async function getDatabaseSchema(): Promise<SchemaTableGroup[]> {
  const rows = await prisma.$queryRaw<
    {
      table_name: string;
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
    }[]
  >(Prisma.sql`
    SELECT
      table_name,
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const grouped = new Map<string, SchemaColumnRow[]>();

  for (const row of rows) {
    const columns = grouped.get(row.table_name) ?? [];
    columns.push({
      tableName: row.table_name,
      columnName: row.column_name,
      dataType: row.data_type,
      udtName: row.udt_name,
      isNullable: row.is_nullable === "YES",
      columnDefault: row.column_default,
    });
    grouped.set(row.table_name, columns);
  }

  return Array.from(grouped.entries()).map(([tableName, columns]) => ({
    tableName,
    columns,
  }));
}
