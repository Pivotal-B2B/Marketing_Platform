import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { FilterCondition, accountFilterFields, contactFilterFields, FieldConfig, operatorLabels, type Operator } from "@shared/filter-types";

interface UnifiedFilterRowProps {
  condition: FilterCondition;
  entityType: "account" | "contact";
  onChange: (condition: FilterCondition) => void;
  onRemove: () => void;
}

/**
 * Unified Filter Row Component
 * 
 * Provides compact single-row layout:
 * [Field Dropdown] [Operator Dropdown] [Chip Input] [Remove Button]
 */
export function UnifiedFilterRow({
  condition,
  entityType,
  onChange,
  onRemove
}: UnifiedFilterRowProps) {
  const [inputValue, setInputValue] = useState("");
  const [showTypeAhead, setShowTypeAhead] = useState(false);
  
  // Get field configurations based on entity type
  const fieldConfigs = entityType === "account" ? accountFilterFields : contactFilterFields;
  const fieldConfig = fieldConfigs[condition.field];
  
  // Fetch type-ahead suggestions if applicable
  const { data: typeAheadOptions } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: [`/api/filters/options/${fieldConfig?.typeAheadSource}`, inputValue],
    enabled: !!(fieldConfig?.typeAhead && fieldConfig.typeAheadSource && inputValue.length > 0),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Handle field change
  const handleFieldChange = (newField: string) => {
    const newFieldConfig = fieldConfigs[newField];
    // Reset operator to first applicable operator for the new field
    const newOperator = newFieldConfig.applicableOperators[0];
    onChange({
      ...condition,
      field: newField,
      operator: newOperator,
      values: []
    });
  };

  // Handle operator change
  const handleOperatorChange = (newOperator: Operator) => {
    onChange({
      ...condition,
      operator: newOperator,
      // Clear values if switching to is_empty or has_any_value
      values: (newOperator === 'is_empty' || newOperator === 'has_any_value') ? [] : condition.values
    });
  };

  // Handle adding a value (chip)
  const handleAddValue = (value: string) => {
    if (!value.trim()) return;
    if (condition.values.includes(value)) return; // Avoid duplicates
    
    onChange({
      ...condition,
      values: [...condition.values, value.trim()]
    });
    setInputValue("");
    setShowTypeAhead(false);
  };

  // Handle removing a value (chip)
  const handleRemoveValue = (valueToRemove: string | number) => {
    onChange({
      ...condition,
      values: condition.values.filter(v => v !== valueToRemove)
    });
  };

  // Handle Enter key in input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddValue(inputValue);
    }
  };

  // Operators that don't need value input
  const needsValueInput = condition.operator !== 'is_empty' && condition.operator !== 'has_any_value';

  // Calculate max values based on field (per spec)
  const maxValues = fieldConfig?.field === 'state' || fieldConfig?.field === 'city' ? 5 : 10;
  const valueCount = condition.values.length;
  const isAtMax = valueCount >= maxValues;

  return (
    <motion.div
      layout
      className="p-4 border border-slate-200 rounded-[14px] bg-white shadow-sm hover:shadow-md transition-shadow"
      data-testid={`filter-row-${condition.id}`}
    >
      <div className="space-y-3">
        {/* Field + Operator Row */}
        <div className="flex items-center gap-2">
          {/* Field Selector */}
          <Select value={condition.field} onValueChange={handleFieldChange}>
            <SelectTrigger className="flex-1 border-slate-300 focus:border-blue-600 focus:ring-blue-600" data-testid="select-field">
              <SelectValue placeholder="Select field..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(fieldConfigs).map(([fieldName, config]) => (
                <SelectItem key={fieldName} value={fieldName}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operator Selector */}
          <Select value={condition.operator} onValueChange={handleOperatorChange}>
            <SelectTrigger className="flex-1 border-slate-300 focus:border-blue-600 focus:ring-blue-600" data-testid="select-operator">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fieldConfig?.applicableOperators.map((op) => (
                <SelectItem key={op} value={op}>
                  {operatorLabels[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Remove button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="shrink-0 hover:bg-red-50 hover:text-red-600"
            data-testid="button-remove-condition"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Value Input (Chips) */}
        {needsValueInput && (
          <div className="space-y-2">
            <div className="relative flex flex-wrap items-center gap-1.5 p-2 border border-slate-300 rounded-lg min-h-[42px] bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
              {/* Chips for selected values */}
              <AnimatePresence mode="popLayout">
                {condition.values.map((value, index) => (
                  <motion.div
                    key={`${value}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.12 }}
                  >
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 bg-blue-50 text-blue-900 border-blue-200"
                      data-testid={`chip-${value}`}
                    >
                      {String(value)}
                      <button
                        type="button"
                        onClick={() => handleRemoveValue(value)}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        data-testid={`remove-chip-${value}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Input for adding new values */}
              {!isAtMax && (
                <Input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => setShowTypeAhead(true)}
                  onBlur={() => setTimeout(() => setShowTypeAhead(false), 200)}
                  placeholder={condition.values.length === 0 ? "Type and press Enter..." : "Add more..."}
                  className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-[15px]"
                  data-testid="input-value"
                  disabled={isAtMax}
                />
              )}

              {/* Type-ahead suggestions */}
              {showTypeAhead && fieldConfig?.typeAhead && typeAheadOptions?.data && typeAheadOptions.data.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 mt-2 max-h-[240px] overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50"
                >
                  {typeAheadOptions.data.slice(0, 10).map((option: { id: string; name: string }) => (
                    <div
                      key={option.id}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors text-sm"
                      onMouseDown={() => handleAddValue(option.name)}
                      data-testid={`typeahead-option-${option.id}`}
                    >
                      {option.name}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Helper text for value count and cap */}
            <div className="flex items-center justify-between text-xs">
              {valueCount > 0 && (
                <span className="text-slate-500">
                  {fieldConfig?.label} ({valueCount}/{maxValues})
                </span>
              )}
              {isAtMax && (
                <span className="text-amber-600 font-medium">
                  Max {maxValues} values for precise results
                </span>
              )}
            </div>
          </div>
        )}

        {/* Value display for operators that don't need input */}
        {!needsValueInput && (
          <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-200">
            {operatorLabels[condition.operator]}
          </div>
        )}
      </div>
    </motion.div>
  );
}
