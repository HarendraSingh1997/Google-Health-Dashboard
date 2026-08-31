"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Trophy, Search, Footprints, Mountain, Compass } from "lucide-react";
import type { BadgeItem } from "@/lib/types";

export function BadgesGallery({ badges }: { badges: BadgeItem[] }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    badges.forEach((b) => cats.add(b.category));
    return Array.from(cats).sort();
  }, [badges]);

  const filteredBadges = React.useMemo(() => {
    return badges.filter((b) => {
      const matchSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.earnedDate.includes(searchTerm);
      const matchCat = selectedCategory === "all" || b.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [badges, searchTerm, selectedCategory]);

  const getBadgeIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("step")) return <Footprints className="h-5 w-5 text-primary" />;
    if (c.includes("distance") || c.includes("climb")) return <Mountain className="h-5 w-5 text-primary" />;
    if (c.includes("lifetime")) return <Compass className="h-5 w-5 text-primary" />;
    return <Trophy className="h-5 w-5 text-primary" />;
  };

  return (
    <Card className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl font-bold text-card-foreground">
                Fitbit Milestones &amp; Achievement Trophies
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {badges.length} badges earned throughout your fitness journey.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search badges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-44 rounded-xl border border-input bg-background pl-8 pr-3 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
            >
              <option value="all">All Categories ({badges.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {filteredBadges.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            No badges found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredBadges.map((badge) => (
              <div
                key={badge.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted transition-transform duration-300 group-hover:scale-110">
                    {getBadgeIcon(badge.category)}
                  </div>
                  {badge.timesAchieved > 1 && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {badge.timesAchieved}× Earned
                    </Badge>
                  )}
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-card-foreground">
                    {badge.name}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {badge.category}
                  </span>
                  <span>{badge.earnedDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
