import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
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

  return (
    <div className="flex items-center gap-2 p-2 border rounded-md bg-card hover-elevate" data-testid={`filter-row-${condition.id}`}>
      {/* Field Selector */}
      <Select value={condition.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-[200px]" data-testid="select-field">
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
        <SelectTrigger className="w-[150px]" data-testid="select-operator">
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

      {/* Value Input (Chips) */}
      {needsValueInput && (
        <div className="flex-1 flex flex-wrap items-center gap-1 p-1 border rounded-md min-h-[36px] bg-background">
          {/* Chips for selected values */}
          {condition.values.map((value, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1"
              data-testid={`chip-${value}`}
            >
              {String(value)}
              <button
                type="button"
                onClick={() => handleRemoveValue(value)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                data-testid={`remove-chip-${value}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {/* Input for adding new values */}
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setShowTypeAhead(true)}
            onBlur={() => setTimeout(() => setShowTypeAhead(false), 200)}
            placeholder={condition.values.length === 0 ? "Type value and press Enter..." : ""}
            className="flex-1 min-w-[150px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
            data-testid="input-value"
          />

          {/* Type-ahead suggestions */}
          {showTypeAhead && fieldConfig?.typeAhead && typeAheadOptions?.data && typeAheadOptions.data.length > 0 && (
            <div className="absolute mt-1 w-full max-h-[200px] overflow-auto bg-popover border rounded-md shadow-md z-50">
              {typeAheadOptions.data.slice(0, 10).map((option: { id: string; name: string }) => (
                <div
                  key={option.id}
                  className="px-3 py-2 hover-elevate cursor-pointer"
                  onMouseDown={() => handleAddValue(option.name)}
                  data-testid={`typeahead-option-${option.id}`}
                >
                  {option.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Value count badge for operators that don't need input */}
      {!needsValueInput && (
        <div className="flex-1 flex items-center text-sm text-muted-foreground">
          {operatorLabels[condition.operator]}
        </div>
      )}

      {/* Chip count badge */}
      {needsValueInput && condition.values.length > 0 && (
        <Badge variant="outline" className="whitespace-nowrap">
          {condition.values.length} selected
        </Badge>
      )}

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0"
        data-testid="button-remove-condition"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
