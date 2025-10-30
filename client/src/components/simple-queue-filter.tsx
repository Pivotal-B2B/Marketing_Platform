import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import type { FilterGroup } from "@shared/filter-types";

interface SimpleQueueFilterProps {
  onChange: (filters: FilterGroup | null) => void;
}

export function SimpleQueueFilter({ onChange }: SimpleQueueFilterProps) {
  const [field, setField] = useState("jobTitle");
  const [operator, setOperator] = useState("contains");
  const [inputValue, setInputValue] = useState("");
  const [chips, setChips] = useState<string[]>([]);

  const handleAddChip = () => {
    if (inputValue.trim()) {
      const newChips = [...chips, inputValue.trim()];
      setChips(newChips);
      setInputValue("");
      
      // Immediately emit the updated filter
      onChange({
        logic: "AND",
        conditions: [{
          id: Date.now().toString(),
          field,
          operator,
          values: newChips
        }]
      });
    }
  };

  const handleRemoveChip = (index: number) => {
    const newChips = chips.filter((_, i) => i !== index);
    setChips(newChips);
    
    // Emit updated filter or null if no chips
    if (newChips.length > 0) {
      onChange({
        logic: "AND",
        conditions: [{
          id: Date.now().toString(),
          field,
          operator,
          values: newChips
        }]
      });
    } else {
      onChange(null);
    }
  };

  const handleClearAll = () => {
    setChips([]);
    setInputValue("");
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Field</Label>
          <Select value={field} onValueChange={setField}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jobTitle">Job Title</SelectItem>
              <SelectItem value="firstName">First Name</SelectItem>
              <SelectItem value="lastName">Last Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="state">State/Region</SelectItem>
              <SelectItem value="country">Country</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Operator</Label>
          <Select value={operator} onValueChange={setOperator}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="equals">Equals</SelectItem>
              <SelectItem value="starts_with">Starts With</SelectItem>
              <SelectItem value="ends_with">Ends With</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Values</Label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddChip();
              }
            }}
            placeholder="Type and press Enter to add..."
            className="h-9 flex-1"
            data-testid="input-filter-value"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddChip}
            disabled={!inputValue.trim()}
            className="h-9"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Active Filters ({chips.length})</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 text-xs"
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="gap-1 pr-1"
              >
                <span>{chip}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveChip(index)}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {chips.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
          No filters applied - all contacts will be queued
        </div>
      )}
    </div>
  );
}
