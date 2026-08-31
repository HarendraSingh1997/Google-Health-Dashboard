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
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, Dumbbell, Flame, Heart, Footprints, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WorkoutLog } from "@/lib/types";

export function WorkoutsTable({ workouts }: { workouts: WorkoutLog[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "date", desc: true }]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedActivity, setSelectedActivity] = React.useState<string>("all");

  const activityTypes = React.useMemo(() => {
    const types = new Set<string>();
    workouts.forEach((w) => types.add(w.activityName));
    return Array.from(types).sort();
  }, [workouts]);

  const filteredWorkouts = React.useMemo(() => {
    return workouts.filter((w) => {
      const matchSearch =
        w.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.date.includes(searchTerm);
      const matchType = selectedActivity === "all" || w.activityName === selectedActivity;
      return matchSearch && matchType;
    });
  }, [workouts, searchTerm, selectedActivity]);

  const columns = React.useMemo<ColumnDef<WorkoutLog>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1 h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-foreground tabular-nums">
            {row.original.date}
          </div>
        ),
      },
      {
        accessorKey: "activityName",
        header: "Activity",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-semibold">
            <Dumbbell className="mr-1 h-3 w-3 text-primary" />
            {row.original.activityName}
          </Badge>
        ),
      },
      {
        accessorKey: "durationMin",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto flex h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Duration
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1 h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1 text-right tabular-nums text-foreground">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{row.original.durationMin} min</span>
          </div>
        ),
      },
      {
        accessorKey: "calories",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto flex h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Burn
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1 h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1 text-right font-semibold text-foreground tabular-nums">
            <Flame className="h-3 w-3 text-primary" />
            <span>{row.original.calories.toLocaleString()} kcal</span>
          </div>
        ),
      },
      {
        accessorKey: "avgHr",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto flex h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Avg HR
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1 h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1 text-right tabular-nums text-foreground">
            {row.original.avgHr ? (
              <>
                <Heart className="h-3 w-3 text-destructive" />
                <span>{row.original.avgHr} bpm</span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "steps",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto flex h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Steps
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1 h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1 text-right tabular-nums text-foreground">
            {row.original.steps > 0 ? (
              <>
                <Footprints className="h-3 w-3 text-primary" />
                <span>{row.original.steps.toLocaleString()}</span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        ),
      },
      {
        id: "zones",
        header: () => <div className="text-right">HR Zones (min)</div>,
        cell: ({ row }) => {
          const { fatBurnMin, cardioMin, peakMin } = row.original;
          const totalActive = fatBurnMin + cardioMin + peakMin;
          if (totalActive === 0) return <div className="text-right text-xs text-muted-foreground">—</div>;
          return (
            <div className="flex items-center justify-end gap-1 text-[11px] tabular-nums">
              {fatBurnMin > 0 && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                  {fatBurnMin}m FatBurn
                </span>
              )}
              {cardioMin > 0 && (
                <span className="rounded bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                  {cardioMin}m Cardio
                </span>
              )}
              {peakMin > 0 && (
                <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-foreground">
                  {peakMin}m Peak
                </span>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredWorkouts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-card-foreground">
              Workout &amp; Activity Sessions
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {workouts.length.toLocaleString()} total logged workouts in this view.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search workouts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-44 rounded-xl border border-input bg-background pl-8 pr-3 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
              />
            </div>

            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
            >
              <option value="all">All Activities ({workouts.length})</option>
              {activityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-xs text-muted-foreground">
                    No workouts matching the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Showing {table.getRowModel().rows.length} of {filteredWorkouts.length} filtered session(s)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="text-xs">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
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
