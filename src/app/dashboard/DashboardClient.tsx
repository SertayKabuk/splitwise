"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, ClipboardList, ArrowRight, Search, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DeleteGroupButton from "./DeleteGroupButton";

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: number;
  member_count: number;
  expense_count: number;
  isSettled: boolean;
}

interface DashboardClientProps {
  initialGroups: GroupRow[];
  currentUserId: string;
}

type FilterType = "all" | "open" | "settled";

export default function DashboardClient({ initialGroups, currentUserId }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Calculate counts based on initial groups
  const totalCount = initialGroups.length;
  const openCount = initialGroups.filter((g) => !g.isSettled).length;
  const settledCount = initialGroups.filter((g) => g.isSettled).length;

  // Filter groups based on search and active tab
  const filteredGroups = initialGroups.filter((group) => {
    const matchesSearch =
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "open" && !group.isSettled) ||
      (activeFilter === "settled" && group.isSettled);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-2xl border shadow-sm">
        {/* Filter Tabs */}
        <div className="w-full min-w-0 overflow-x-auto md:flex-1">
          <div className="flex w-max min-w-full items-center gap-1.5 rounded-xl border border-muted/80 bg-muted/60 p-1">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeFilter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Groups
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-muted-foreground/10 text-muted-foreground">
                {totalCount}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter("open")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === "open"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Open
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                activeFilter === "open"
                  ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                  : "bg-muted-foreground/10 text-muted-foreground"
              }`}>
                {openCount}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter("settled")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === "settled"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Settled Up
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                activeFilter === "settled"
                  ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted-foreground/10 text-muted-foreground"
              }`}>
                {settledCount}
              </span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-xs md:flex-none">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groups..."
            className="pl-10 h-10 w-full rounded-xl border-muted bg-background focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-2xl mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No groups found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? "We couldn't find any groups matching your search query. Try typing another name."
              : activeFilter === "settled"
              ? "None of your groups are settled up yet. Keep splitting those bills!"
              : "No open groups. Great job, everyone is settled up!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="group flex flex-col gap-4 p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300 relative overflow-hidden bg-card"
            >
              {/* Decorative top gradient border on hover */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-start justify-between">
                <div className="space-y-1.5 max-w-[70%]">
                  <h2 className="font-semibold text-foreground text-lg leading-tight group-hover:text-primary transition-colors duration-200 truncate">
                    {group.name}
                  </h2>
                  {group.description ? (
                    <p className="text-muted-foreground text-sm line-clamp-2 min-h-[2.5rem]">
                      {group.description}
                    </p>
                  ) : (
                    <p className="text-muted-foreground/40 text-sm italic min-h-[2.5rem]">
                      No description provided
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                  {group.created_by === currentUserId && (
                    <DeleteGroupButton groupId={group.id} />
                  )}
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <span className="text-primary font-bold text-sm">
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center">
                {group.isSettled ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 gap-1.5 font-medium rounded-full py-0.5 px-2.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Settled Up
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 gap-1.5 font-medium rounded-full py-0.5 px-2.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    {group.expense_count === 0 ? "No Expenses" : "Open Balance"}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm mt-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4 text-muted-foreground/75" />
                  <span>
                    {group.member_count} member{group.member_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <ClipboardList className="w-4 h-4 text-muted-foreground/75" />
                  <span>
                    {group.expense_count} expense{group.expense_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <Button asChild className="mt-auto gap-2 group-hover:bg-primary shadow-sm">
                <Link href={`/groups/${group.id}`}>
                  View Group
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
