import { useState } from "react";
import { Search, SlidersHorizontal, Star, X, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLanguage } from "@/hooks/useLanguage";

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
  const { t } = useLanguage();

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("booking.searchDoctor")}
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
        <div className="flex items-center gap-2 flex-wrap">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {t("booking.filters")}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  !
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[160px] h-9">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t("booking.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">{t("booking.highestRating")}</SelectItem>
              <SelectItem value="experience">{t("booking.mostExperience")}</SelectItem>
              <SelectItem value="fee-low">{t("booking.lowestFee")}</SelectItem>
              <SelectItem value="fee-high">{t("booking.highestFee")}</SelectItem>
              <SelectItem value="name">{t("booking.nameAZ")}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="w-4 h-4 mr-1" />
              {t("common.clearFilters")}
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-4">
          <div className="p-4 rounded-lg border bg-muted/50">
            {/* Rating Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {t("booking.minRating")}: {minRating.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[minRating]}
                onValueChange={([value]) => onMinRatingChange(value)}
                min={0}
                max={5}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("common.all")}</span>
                <span>5 {t("reviews.stars")}</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {t("common.search")}: "{searchQuery}"
              <button onClick={() => onSearchChange("")}>
                <X className="w-3 h-3 ml-1" />
              </button>
            </Badge>
          )}
          {minRating > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              {minRating}+ {t("reviews.stars")}
              <button onClick={() => onMinRatingChange(0)}>
                <X className="w-3 h-3 ml-1" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
