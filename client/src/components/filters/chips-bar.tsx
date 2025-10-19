import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FilterValues } from "@shared/filterConfig";
import { format } from "date-fns";

interface ChipsBarProps {
  filters: FilterValues;
  optionLabels?: Record<string, Record<string, string>>; // field -> id -> label mapping
  onRemove: (field: keyof FilterValues, value?: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ChipsBar({
  filters,
  optionLabels = {},
  onRemove,
  onClearAll,
  className
}: ChipsBarProps) {
  // Helper to get display label for a field value
  const getLabel = (field: string, id: string): string => {
    return optionLabels[field]?.[id] || id;
  };
  // Count total active filters
  const totalFilters = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === 'search' && value) return count + 1;
    if (Array.isArray(value) && value.length > 0) return count + value.length;
    if (value && typeof value === 'object' && 'from' in value) {
      if (value.from || value.to) return count + 1;
    }
    return count;
  }, 0);

  if (totalFilters === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap p-3 bg-muted/50 rounded-md border", className)}>
      <span className="text-sm font-medium text-muted-foreground">
        Active Filters ({totalFilters}):
      </span>

      {/* Search Filter */}
      {filters.search && (
        <Badge
          variant="secondary"
          className="gap-1"
          data-testid="chip-search"
        >
          Search: {filters.search}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('search')}
          />
        </Badge>
      )}

      {/* Multi-select Array Filters */}
      {filters.industries?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-industries-${value}`}
        >
          Industry: {getLabel('industries', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('industries', value)}
          />
        </Badge>
      ))}

      {filters.companySizes?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-companysize-${value}`}
        >
          Company Size: {getLabel('companySizes', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('companySizes', value)}
          />
        </Badge>
      ))}

      {filters.companyRevenue?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-revenue-${value}`}
        >
          Revenue: {getLabel('companyRevenue', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('companyRevenue', value)}
          />
        </Badge>
      ))}

      {filters.seniorityLevels?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-seniority-${value}`}
        >
          Seniority: {getLabel('seniorityLevels', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('seniorityLevels', value)}
          />
        </Badge>
      ))}

      {filters.countries?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-country-${value}`}
        >
          Country: {getLabel('countries', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('countries', value)}
          />
        </Badge>
      ))}

      {filters.states?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-state-${value}`}
        >
          State: {getLabel('states', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('states', value)}
          />
        </Badge>
      ))}

      {filters.cities?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-city-${value}`}
        >
          City: {getLabel('cities', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('cities', value)}
          />
        </Badge>
      ))}

      {filters.technologies?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-tech-${value}`}
        >
          Technology: {getLabel('technologies', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('technologies', value)}
          />
        </Badge>
      ))}

      {filters.jobFunctions?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-jobfunction-${value}`}
        >
          Job Function: {getLabel('jobFunctions', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('jobFunctions', value)}
          />
        </Badge>
      ))}

      {filters.departments?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-department-${value}`}
        >
          Department: {getLabel('departments', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('departments', value)}
          />
        </Badge>
      ))}

      {filters.accountOwners?.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1"
          data-testid={`chip-owner-${value}`}
        >
          Owner: {getLabel('accountOwners', value)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('accountOwners', value)}
          />
        </Badge>
      ))}

      {/* Date Range Filters */}
      {filters.createdDate && (filters.createdDate.from || filters.createdDate.to) && (
        <Badge
          variant="secondary"
          className="gap-1"
          data-testid="chip-created-date"
        >
          Created: {filters.createdDate.from && format(new Date(filters.createdDate.from), 'MMM d, yyyy')}
          {filters.createdDate.from && filters.createdDate.to && ' - '}
          {filters.createdDate.to && format(new Date(filters.createdDate.to), 'MMM d, yyyy')}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('createdDate')}
          />
        </Badge>
      )}

      {filters.lastActivity && (filters.lastActivity.from || filters.lastActivity.to) && (
        <Badge
          variant="secondary"
          className="gap-1"
          data-testid="chip-last-activity"
        >
          Last Activity: {filters.lastActivity.from && format(new Date(filters.lastActivity.from), 'MMM d, yyyy')}
          {filters.lastActivity.from && filters.lastActivity.to && ' - '}
          {filters.lastActivity.to && format(new Date(filters.lastActivity.to), 'MMM d, yyyy')}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemove('lastActivity')}
          />
        </Badge>
      )}

      {/* Clear All Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="ml-auto"
        data-testid="button-clear-all-filters"
      >
        Clear All
      </Button>
    </div>
  );
}
