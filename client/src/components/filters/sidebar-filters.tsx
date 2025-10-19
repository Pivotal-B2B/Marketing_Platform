import { useState, useEffect } from "react";
import { Filter, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FilterGroup, FilterCondition } from "@shared/filter-types";
import { UnifiedFilterRow } from "./unified-filter-row";

interface SidebarFiltersProps {
  entityType: "account" | "contact";
  onApplyFilter: (filterGroup: FilterGroup | undefined) => void;
  initialFilter?: FilterGroup;
}

/**
 * Beautiful Left Sidebar Filter Panel
 * 
 * Enterprise-grade filter UI with:
 * - Persistent left sidebar (≥1280px) or drawer (<1280px)
 * - Unified 8-operator model
 * - Multi-value chips input
 * - Real-time result count
 * - Smooth animations
 */
export function SidebarFilters({
  entityType,
  onApplyFilter,
  initialFilter,
}: SidebarFiltersProps) {
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(
    initialFilter || {
      logic: "AND",
      conditions: [],
    }
  );
  const [isApplying, setIsApplying] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync local filterGroup with initialFilter prop changes (e.g., when parent clears)
  useEffect(() => {
    if (initialFilter) {
      setFilterGroup(initialFilter);
    } else {
      setFilterGroup({
        logic: "AND",
        conditions: [],
      });
    }
  }, [initialFilter]);

  // Fetch filter count in real-time (updates as filters change)
  const { data: countData, isLoading: isCountLoading } = useQuery<{
    count: number;
  }>({
    queryKey: [`/api/filters/count/${entityType}`, JSON.stringify(filterGroup)],
    queryFn: async () => {
      if (filterGroup.conditions.length === 0) {
        return { count: 0 };
      }
      const response = await apiRequest(
        "POST",
        `/api/filters/count/${entityType}`,
        { filterGroup }
      );
      return response.json();
    },
    enabled: filterGroup.conditions.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fresh - updates immediately when filterGroup changes
  });

  const resultsCount = countData?.count ?? 0;

  // Add new condition
  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: `${Date.now()}-${Math.random()}`,
      field: entityType === "account" ? "name" : "fullName",
      operator: "equals",
      values: [],
    };
    setFilterGroup({
      ...filterGroup,
      conditions: [...filterGroup.conditions, newCondition],
    });
  };

  // Remove condition
  const removeCondition = (id: string) => {
    setFilterGroup({
      ...filterGroup,
      conditions: filterGroup.conditions.filter((c) => c.id !== id),
    });
  };

  // Update condition
  const updateCondition = (id: string, updatedCondition: FilterCondition) => {
    setFilterGroup({
      ...filterGroup,
      conditions: filterGroup.conditions.map((c) =>
        c.id === id ? updatedCondition : c
      ),
    });
  };

  // Apply filters with animation
  const handleApply = async () => {
    setIsApplying(true);
    const filterToApply =
      filterGroup.conditions.length === 0 ? undefined : filterGroup;
    
    // Brief delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    onApplyFilter(filterToApply);
    setIsApplying(false);
    setMobileOpen(false);
  };

  // Clear all filters
  const handleClear = () => {
    setFilterGroup({
      logic: "AND",
      conditions: [],
    });
    onApplyFilter(undefined);
  };

  const activeFilterCount = filterGroup.conditions.length;

  // Sidebar Content Component (reused for both desktop and mobile)
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        
        {/* Result Count */}
        {filterGroup.conditions.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-slate-500"
            data-testid="text-result-count"
          >
            {isCountLoading ? (
              "Counting..."
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {resultsCount.toLocaleString()}
                </span>{" "}
                {resultsCount === 1 ? "result" : "results"}
              </>
            )}
          </motion.p>
        )}
        
        {/* AND/OR Logic Toggle */}
        {activeFilterCount > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-3"
          >
            <span className="text-xs text-slate-600 font-medium">Match:</span>
            <ToggleGroup
              type="single"
              value={filterGroup.logic}
              onValueChange={(value) => {
                if (value === "AND" || value === "OR") {
                  setFilterGroup({ ...filterGroup, logic: value });
                }
              }}
              className="bg-slate-200 rounded-md p-1"
            >
              <ToggleGroupItem
                value="AND"
                className="px-3 py-1 text-xs font-medium data-[state=on]:bg-blue-600 data-[state=on]:text-white"
                data-testid="toggle-logic-and"
              >
                ALL (AND)
              </ToggleGroupItem>
              <ToggleGroupItem
                value="OR"
                className="px-3 py-1 text-xs font-medium data-[state=on]:bg-blue-600 data-[state=on]:text-white"
                data-testid="toggle-logic-or"
              >
                ANY (OR)
              </ToggleGroupItem>
            </ToggleGroup>
          </motion.div>
        )}
      </div>

      {/* Body - Filter Conditions */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filterGroup.conditions.map((condition) => (
              <motion.div
                key={condition.id}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <UnifiedFilterRow
                  condition={condition}
                  entityType={entityType}
                  onChange={(updated) => updateCondition(condition.id, updated)}
                  onRemove={() => removeCondition(condition.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {filterGroup.conditions.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-sm text-slate-400"
            >
              <Filter className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No filters added</p>
              <p className="text-xs mt-1">Click below to add your first filter</p>
            </motion.div>
          )}

          {/* Add Condition Button */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button
              variant="outline"
              onClick={addCondition}
              className="w-full border-dashed border-2 hover:border-blue-600 hover:bg-blue-50 transition-colors"
              data-testid="button-add-condition"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Filter
            </Button>
          </motion.div>
        </div>
      </ScrollArea>

      {/* Footer - Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={activeFilterCount === 0 || isApplying}
            className="text-slate-700 hover:text-slate-900"
            data-testid="button-clear-filters"
          >
            Clear
          </Button>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1"
          >
            <Button
              onClick={handleApply}
              disabled={isApplying}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              data-testid="button-apply-filters"
            >
              {isApplying ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Applying...
                </>
              ) : (
                "Apply Filters"
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: Persistent Sidebar (≥1280px) */}
      <aside className="hidden xl:block w-[340px] shrink-0 border-r border-slate-200 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile: Drawer (<1280px) */}
      <div className="xl:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="relative"
              data-testid="button-open-mobile-filters"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-2 h-5 px-1.5 text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[340px] p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
