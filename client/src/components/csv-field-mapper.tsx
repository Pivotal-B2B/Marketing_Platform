import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import type { CustomFieldDefinition } from "@shared/schema";

interface FieldMapping {
  csvColumn: string;
  targetField: string | null;
  targetEntity: "contact" | "account" | null;
}

interface CSVFieldMapperProps {
  csvHeaders: string[];
  sampleData: string[][];
  onMappingComplete: (mapping: FieldMapping[]) => void;
  onCancel: () => void;
}

// Define base/standard fields for Contact and Account
const BASE_CONTACT_FIELDS = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "fullName", label: "Full Name" },
  { value: "email", label: "Email" },
  { value: "jobTitle", label: "Job Title" },
  { value: "directPhone", label: "Direct Phone" },
  { value: "phoneExtension", label: "Phone Extension" },
  { value: "seniorityLevel", label: "Seniority Level" },
  { value: "department", label: "Department" },
  { value: "address", label: "Address" },
  { value: "linkedinUrl", label: "LinkedIn URL" },
  { value: "consentBasis", label: "Consent Basis" },
  { value: "consentSource", label: "Consent Source" },
  { value: "emailStatus", label: "Email Status" },
  { value: "phoneStatus", label: "Phone Status" },
];

const BASE_ACCOUNT_FIELDS = [
  { value: "name", label: "Account Name" },
  { value: "domain", label: "Domain" },
  { value: "industryStandardized", label: "Industry" },
  { value: "annualRevenue", label: "Annual Revenue" },
  { value: "employeesSizeRange", label: "Employee Size Range" },
  { value: "staffCount", label: "Staff Count" },
  { value: "description", label: "Description" },
  { value: "hqAddress", label: "HQ Address" },
  { value: "hqCity", label: "HQ City" },
  { value: "hqState", label: "HQ State" },
  { value: "hqCountry", label: "HQ Country" },
  { value: "yearFounded", label: "Year Founded" },
  { value: "sicCode", label: "SIC Code" },
  { value: "naicsCode", label: "NAICS Code" },
  { value: "linkedinUrl", label: "LinkedIn URL" },
  { value: "mainPhone", label: "Main Phone" },
  { value: "mainPhoneExtension", label: "Main Phone Extension" },
];

export function CSVFieldMapper({
  csvHeaders,
  sampleData,
  onMappingComplete,
  onCancel,
}: CSVFieldMapperProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [autoMapped, setAutoMapped] = useState(false);

  // Fetch custom fields
  const { data: customFields, isLoading: customFieldsLoading } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['/api/custom-fields'],
  });

  // Build complete field lists with custom fields
  const CONTACT_FIELDS = [
    ...BASE_CONTACT_FIELDS,
    ...(customFields?.filter(f => f.entityType === 'contact' && f.active).map(f => ({
      value: `custom_${f.fieldKey}`,
      label: `${f.displayLabel} (Custom)`,
    })) || []),
  ];

  const ACCOUNT_FIELDS = [
    ...BASE_ACCOUNT_FIELDS,
    ...(customFields?.filter(f => f.entityType === 'account' && f.active).map(f => ({
      value: `custom_${f.fieldKey}`,
      label: `${f.displayLabel} (Custom)`,
    })) || []),
  ];

  // Show loading state while custom fields are being fetched
  if (customFieldsLoading) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Loading field mappings...</p>
      </div>
    );
  }

  // Auto-mapping logic based on column name similarity
  const autoMapColumn = (csvColumn: string): FieldMapping => {
    const normalized = csvColumn.toLowerCase().replace(/[_\s-]/g, "");
    
    // Check for account fields (account_ prefix)
    if (csvColumn.toLowerCase().startsWith("account_")) {
      const fieldName = csvColumn.substring(8); // Remove "account_" prefix
      const normalizedField = fieldName.toLowerCase().replace(/[_\s-]/g, "");
      
      for (const field of ACCOUNT_FIELDS) {
        const fieldNormalized = field.value.toLowerCase();
        if (normalizedField === fieldNormalized || normalizedField.includes(fieldNormalized) || fieldNormalized.includes(normalizedField)) {
          return {
            csvColumn,
            targetField: field.value,
            targetEntity: "account",
          };
        }
      }
    }
    
    // Check for contact fields
    for (const field of CONTACT_FIELDS) {
      const fieldNormalized = field.value.toLowerCase();
      if (normalized === fieldNormalized || normalized.includes(fieldNormalized) || fieldNormalized.includes(normalized)) {
        return {
          csvColumn,
          targetField: field.value,
          targetEntity: "contact",
        };
      }
    }
    
    // Special case mappings
    const specialMappings: Record<string, FieldMapping> = {
      "name": { csvColumn, targetField: "fullName", targetEntity: "contact" },
      "company": { csvColumn, targetField: "name", targetEntity: "account" },
      "companyname": { csvColumn, targetField: "name", targetEntity: "account" },
      "organization": { csvColumn, targetField: "name", targetEntity: "account" },
      "phone": { csvColumn, targetField: "directPhone", targetEntity: "contact" },
      "mobile": { csvColumn, targetField: "directPhone", targetEntity: "contact" },
      "cell": { csvColumn, targetField: "directPhone", targetEntity: "contact" },
      "title": { csvColumn, targetField: "jobTitle", targetEntity: "contact" },
      "position": { csvColumn, targetField: "jobTitle", targetEntity: "contact" },
      "role": { csvColumn, targetField: "jobTitle", targetEntity: "contact" },
      "city": { csvColumn, targetField: "hqCity", targetEntity: "account" },
      "state": { csvColumn, targetField: "hqState", targetEntity: "account" },
      "country": { csvColumn, targetField: "hqCountry", targetEntity: "account" },
      "website": { csvColumn, targetField: "domain", targetEntity: "account" },
      "url": { csvColumn, targetField: "domain", targetEntity: "account" },
    };
    
    if (specialMappings[normalized]) {
      return specialMappings[normalized];
    }
    
    return {
      csvColumn,
      targetField: null,
      targetEntity: null,
    };
  };

  useEffect(() => {
    // Auto-map on initial load - only when custom fields are loaded
    if (customFields !== undefined) {
      const initialMappings = csvHeaders.map(autoMapColumn);
      setMappings(initialMappings);
      
      // Check if any were auto-mapped
      const hasAutoMapped = initialMappings.some(m => m.targetField !== null);
      setAutoMapped(hasAutoMapped);
    }
  }, [csvHeaders, customFields]);

  const updateMapping = (csvColumn: string, targetField: string | null, targetEntity: "contact" | "account" | null) => {
    setMappings(prev =>
      prev.map(m =>
        m.csvColumn === csvColumn
          ? { ...m, targetField, targetEntity }
          : m
      )
    );
  };

  const handleApplyMapping = () => {
    onMappingComplete(mappings);
  };

  const mappedCount = mappings.filter(m => m.targetField !== null).length;
  const unmappedCount = mappings.length - mappedCount;

  return (
    <div className="space-y-4">
      {autoMapped && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            We automatically mapped {mappedCount} field(s) based on column names. Please review and adjust as needed.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Map CSV Columns to Fields</h4>
          <p className="text-sm text-muted-foreground">
            Map each CSV column to the corresponding Contact or Account field
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">
            {mappedCount} mapped
          </Badge>
          {unmappedCount > 0 && (
            <Badge variant="outline">
              {unmappedCount} unmapped
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="h-[400px] border rounded-lg p-4">
        <div className="space-y-3">
          {mappings.map((mapping, idx) => (
            <div key={mapping.csvColumn} className="flex items-start gap-3 p-3 border rounded-md hover-elevate">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {mapping.csvColumn}
                  </Badge>
                  {sampleData[0] && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      e.g., "{sampleData[0][idx]}"
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  
                  <Select
                    value={mapping.targetEntity || ""}
                    onValueChange={(value) => {
                      if (value === "skip") {
                        updateMapping(mapping.csvColumn, null, null);
                      } else {
                        updateMapping(mapping.csvColumn, mapping.targetField, value as "contact" | "account");
                      }
                    }}
                  >
                    <SelectTrigger className="w-[150px]" data-testid={`select-entity-${mapping.csvColumn}`}>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">Contact</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="skip">Skip Column</SelectItem>
                    </SelectContent>
                  </Select>

                  {mapping.targetEntity && (mapping.targetEntity === "contact" || mapping.targetEntity === "account") && (
                    <Select
                      value={mapping.targetField || ""}
                      onValueChange={(value) => updateMapping(mapping.csvColumn, value, mapping.targetEntity)}
                    >
                      <SelectTrigger className="flex-1" data-testid={`select-field-${mapping.csvColumn}`}>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {(mapping.targetEntity === "contact" ? CONTACT_FIELDS : ACCOUNT_FIELDS).map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {mapping.targetField && (
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-2" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleApplyMapping}
          disabled={mappedCount === 0}
          data-testid="button-apply-mapping"
        >
          Continue with Mapping
        </Button>
      </div>
    </div>
  );
}
