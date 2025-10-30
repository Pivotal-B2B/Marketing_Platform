import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
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
  const maxValues = condition.field === 'state' || condition.field === 'city' ? 5 : 10;
  const valueCount = condition.values.length;
  const isAtMax = valueCount >= maxValues;

  return (
    <motion.div
      layout
      className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow"
      data-testid={`filter-row-${condition.id}`}
    >
      <div className="space-y-2">
        {/* Field + Operator Row */}
        <div className="flex items-center gap-1.5">
          {/* Field Selector - Grouped by Category */}
          <Select value={condition.field} onValueChange={handleFieldChange}>
            <SelectTrigger className="flex-1 text-xs h-8 border-slate-300 dark:border-slate-600 focus:border-blue-600 focus:ring-blue-600" data-testid="select-field">
              <SelectValue placeholder="Select field..." />
            </SelectTrigger>
            <SelectContent>
              {(() => {
                // Group fields by category
                const groupedFields: Record<string, Array<[string, FieldConfig]>> = {};
                Object.entries(fieldConfigs).forEach(([fieldName, config]) => {
                  const category = config.category || 'Other';
                  if (!groupedFields[category]) {
                    groupedFields[category] = [];
                  }
                  groupedFields[category].push([fieldName, config]);
                });

                // Render groups in order
                const categoryOrder = [
                  'Contact Information',
                  'Contact Geography',
                  'Account - Firmographic',
                  'Account - Technology',
                  'Account - Metadata',
                  'Account Geography',
                  'Company Information',
                  'Lists & Segments',
                  'Campaigns',
                  'Campaign',
                  'Email',
                  'Call',
                  'Ownership',
                  'Compliance',
                  'Dates',
                  'QA & Verification',
                  'Verification',
                  'Other'
                ];

                return categoryOrder.map(category => {
                  const fields = groupedFields[category];
                  if (!fields || fields.length === 0) return null;

                  return (
                    <SelectGroup key={category}>
                      <SelectLabel className="text-xs font-semibold text-slate-600 px-2 py-1.5">
                        {category}
                      </SelectLabel>
                      {fields.map(([fieldName, config]) => (
                        <SelectItem key={fieldName} value={fieldName}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                });
              })()}
            </SelectContent>
          </Select>

          {/* Operator Selector */}
          <Select value={condition.operator} onValueChange={handleOperatorChange}>
            <SelectTrigger className="flex-1 text-xs h-8 border-slate-300 dark:border-slate-600 focus:border-blue-600 focus:ring-blue-600" data-testid="select-operator">
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
            className="shrink-0 h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600"
            data-testid="button-remove-condition"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Value Input (Chips) */}
        {needsValueInput && (
          <div className="space-y-1.5">
            <div className="relative flex flex-wrap items-center gap-1 p-1.5 border border-slate-300 dark:border-slate-600 rounded-lg min-h-[36px] bg-white dark:bg-slate-900 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
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
                      className="flex items-center gap-0.5 text-xs bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800"
                      data-testid={`chip-${value}`}
                    >
                      {String(value)}
                      <button
                        type="button"
                        onClick={() => handleRemoveValue(value)}
                        className="ml-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                        data-testid={`remove-chip-${value}`}
                      >
                        <X className="h-2.5 w-2.5" />
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
                  placeholder={condition.values.length === 0 ? "Type value and press Enter" : "Type and press Enter..."}
                  className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-xs placeholder:text-amber-600 dark:placeholder:text-amber-400 placeholder:font-medium"
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
                  className="absolute top-full left-0 right-0 mt-1 max-h-[200px] overflow-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50"
                >
                  {typeAheadOptions.data.slice(0, 10).map((option: { id: string; name: string }) => (
                    <div
                      key={option.id}
                      className="px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer transition-colors text-xs"
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
            <div className="flex items-center justify-between text-[10px]">
              {valueCount > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  {fieldConfig?.label} ({valueCount}/{maxValues})
                </span>
              )}
              {isAtMax && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Max {maxValues} values
                </span>
              )}
            </div>
          </div>
        )}

        {/* Value display for operators that don't need input */}
        {!needsValueInput && (
          <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {operatorLabels[condition.operator]}
          </div>
        )}
      </div>
    </motion.div>
  );
}
