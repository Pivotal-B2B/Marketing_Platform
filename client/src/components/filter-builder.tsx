import { useState } from "react";
import { Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  FilterGroup, 
  FilterCondition, 
  textOperators,
  numberOperators,
  arrayOperators,
  booleanOperators,
  accountFilterFields,
  contactFilterFields,
  type TextOperator,
  type NumberOperator,
  type ArrayOperator,
  type BooleanOperator
} from "@shared/filter-types";

type EntityType = 'account' | 'contact';

interface FilterBuilderProps {
  entityType: EntityType;
  onApplyFilter: (filterGroup: FilterGroup | undefined) => void;
  initialFilter?: FilterGroup;
}

export function FilterBuilder({ entityType, onApplyFilter, initialFilter }: FilterBuilderProps) {
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(
    initialFilter || {
      logic: 'AND',
      conditions: []
    }
  );
  const [open, setOpen] = useState(false);

  const filterFields = entityType === 'account' ? accountFilterFields : contactFilterFields;

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: `${Date.now()}-${Math.random()}`,
      field: Object.keys(filterFields)[0],
      operator: 'equals',
      value: ''
    };
    setFilterGroup({
      ...filterGroup,
      conditions: [...filterGroup.conditions, newCondition]
    });
  };

  const removeCondition = (id: string) => {
    setFilterGroup({
      ...filterGroup,
      conditions: filterGroup.conditions.filter(c => c.id !== id)
    });
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setFilterGroup({
      ...filterGroup,
      conditions: filterGroup.conditions.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    });
  };

  const getOperatorsForField = (field: string) => {
    const fieldConfig = filterFields[field as keyof typeof filterFields];
    const fieldType = fieldConfig?.type;
    switch (fieldType) {
      case 'text':
        return textOperators;
      case 'number':
        return numberOperators;
      case 'array':
        return arrayOperators;
      case 'boolean':
        return booleanOperators;
      default:
        return textOperators;
    }
  };

  const renderValueInput = (condition: FilterCondition) => {
    const fieldConfig = filterFields[condition.field as keyof typeof filterFields];
    const fieldType = fieldConfig?.type || 'text';
    const operator = condition.operator;

    if (fieldType === 'boolean') {
      return (
        <Select
          value={condition.value ? 'true' : 'false'}
          onValueChange={(val) => updateCondition(condition.id, { value: val === 'true' })}
        >
          <SelectTrigger data-testid={`select-value-${condition.id}`}>
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (operator === 'between') {
      const rangeValue = (condition.value as any) || { from: '', to: '' };
      const isNumber = fieldType === 'number';
      return (
        <div className="flex gap-2">
          <Input
            type={isNumber ? 'number' : 'text'}
            placeholder="From"
            value={rangeValue.from}
            onChange={(e) => updateCondition(condition.id, {
              value: { ...rangeValue, from: isNumber ? Number(e.target.value) : e.target.value }
            })}
            data-testid={`input-value-from-${condition.id}`}
          />
          <Input
            type={isNumber ? 'number' : 'text'}
            placeholder="To"
            value={rangeValue.to}
            onChange={(e) => updateCondition(condition.id, {
              value: { ...rangeValue, to: isNumber ? Number(e.target.value) : e.target.value }
            })}
            data-testid={`input-value-to-${condition.id}`}
          />
        </div>
      );
    }

    if (operator === 'isEmpty' || operator === 'isNotEmpty') {
      return <div className="text-sm text-muted-foreground">No value needed</div>;
    }

    if (fieldType === 'array' && (operator === 'containsAny' || operator === 'containsAll')) {
      const arrayValue = Array.isArray(condition.value) ? condition.value.join(', ') : '';
      return (
        <Input
          placeholder="Enter values separated by commas"
          value={arrayValue}
          onChange={(e) => {
            const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
            updateCondition(condition.id, { value: values });
          }}
          data-testid={`input-value-${condition.id}`}
        />
      );
    }

    const isNumber = fieldType === 'number';
    return (
      <Input
        type={isNumber ? 'number' : 'text'}
        placeholder="Enter value"
        value={condition.value as string}
        onChange={(e) => updateCondition(condition.id, {
          value: isNumber ? Number(e.target.value) : e.target.value
        })}
        data-testid={`input-value-${condition.id}`}
      />
    );
  };

  const handleApply = () => {
    if (filterGroup.conditions.length === 0) {
      onApplyFilter(undefined);
    } else {
      onApplyFilter(filterGroup);
    }
    setOpen(false);
  };

  const handleClear = () => {
    setFilterGroup({
      logic: 'AND',
      conditions: []
    });
    onApplyFilter(undefined);
    setOpen(false);
  };

  const activeFilterCount = filterGroup.conditions.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative" data-testid="button-open-filters">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs" data-testid="badge-filter-count">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
          <SheetDescription>
            Build complex filters with multiple conditions
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Logic Selector */}
          <div className="flex items-center gap-4">
            <Label>Match</Label>
            <Select
              value={filterGroup.logic}
              onValueChange={(val: 'AND' | 'OR') => setFilterGroup({ ...filterGroup, logic: val })}
            >
              <SelectTrigger className="w-32" data-testid="select-logic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">All (AND)</SelectItem>
                <SelectItem value="OR">Any (OR)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">of the following conditions</span>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            {filterGroup.conditions.map((condition, index) => (
              <div key={condition.id} className="border rounded-lg p-4 space-y-3" data-testid={`filter-condition-${condition.id}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Condition {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(condition.id)}
                    data-testid={`button-remove-condition-${condition.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3">
                  {/* Field Selector */}
                  <div>
                    <Label className="text-xs">Field</Label>
                    <Select
                      value={condition.field}
                      onValueChange={(val) => {
                        const operators = getOperatorsForField(val);
                        updateCondition(condition.id, {
                          field: val,
                          operator: operators[0] as any,
                          value: ''
                        });
                      }}
                    >
                      <SelectTrigger data-testid={`select-field-${condition.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(filterFields).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Operator Selector */}
                  <div>
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={condition.operator}
                      onValueChange={(val) => updateCondition(condition.id, { operator: val as any, value: '' })}
                    >
                      <SelectTrigger data-testid={`select-operator-${condition.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperatorsForField(condition.field).map((op) => (
                          <SelectItem key={op} value={op}>
                            {op.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Value Input */}
                  <div>
                    <Label className="text-xs">Value</Label>
                    {renderValueInput(condition)}
                  </div>
                </div>
              </div>
            ))}

            {filterGroup.conditions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No filters added yet. Click the button below to add your first filter.
              </div>
            )}
          </div>

          {/* Add Condition Button */}
          <Button
            variant="outline"
            onClick={addCondition}
            className="w-full"
            data-testid="button-add-condition"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Condition
          </Button>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClear} data-testid="button-clear-filters">
            Clear All
          </Button>
          <Button onClick={handleApply} data-testid="button-apply-filters">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
