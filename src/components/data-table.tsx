"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
}

export type TableCellValue = string | number | boolean | null | undefined;
export type TableRowData = Record<string, TableCellValue>;

function buildColumnDefs(columns: Column[]): ColumnDef<TableRowData>[] {
  return columns.map((c) => ({
    accessorKey: c.key,
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className={c.align === "right" ? "ml-auto flex" : ""}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {c.label}
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="ml-1 h-3 w-3" />
        ) : (
          <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
        )}
      </Button>
    ),
    cell: ({ getValue }) => (
      <div className={c.align === "right" ? "text-right tabular-nums" : "tabular-nums"}>{getValue() as React.ReactNode}</div>
    ),
  }));
}

export function DataTable({
  title,
  columns,
  rows,
  pageSize = 10,
}: {
  title: string;
  columns: Column[];
  rows: TableRowData[];
  pageSize?: number;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  // Memoize defs: a fresh array each render would bust useReactTable's
  // memoization and reset sorting/pagination on every parent re-render.
  const columnDefs = React.useMemo(() => buildColumnDefs(columns), [columns]);
  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <Card className="w-full">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full rounded-md border">
          <Table>
            <TableHeader className="bg-muted/60">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => {
                    const align = columns.find((col) => col.key === header.column.id)?.align;
                    return (
                      <TableHead key={header.id} className={align === "right" ? "text-right" : ""}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-20 text-center text-xs text-muted-foreground">
                    No data for this period.
                  </TableCell>
                </TableRow>
              )}
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between space-x-2 py-3">
          <div className="text-xs text-muted-foreground">
            {rows.length} row(s) · page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
