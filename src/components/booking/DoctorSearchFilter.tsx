import { useState } from "react";
import { Search, Filter, X, Star, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DoctorSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  minRating: number;
  onMinRatingChange: (rating: number) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function DoctorSearchFilter({
  searchQuery,
  onSearchChange,
  minRating,
  onMinRatingChange,
  sortBy,
  onSortByChange,
  onClearFilters,
  hasActiveFilters,
}: DoctorSearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search doctors by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  !
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rating</SelectItem>
              <SelectItem value="experience">Most Experience</SelectItem>
              <SelectItem value="fee-low">Lowest Fee</SelectItem>
              <SelectItem value="fee-high">Highest Fee</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-4">
          <div className="p-4 rounded-xl border border-border bg-card space-y-4">
            {/* Rating Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Minimum Rating: {minRating.toFixed(1)}
              </label>
              <Slider
                value={[minRating]}
                onValueChange={([value]) => onMinRatingChange(value)}
                min={0}
                max={5}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Any</span>
                <span>5 Stars</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchQuery}"
              <button onClick={() => onSearchChange("")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {minRating > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Star className="w-3 h-3" />
              {minRating}+ stars
              <button onClick={() => onMinRatingChange(0)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}