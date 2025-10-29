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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CustomFieldDefinition } from "@shared/schema";
import { ACCOUNT_FIELD_LABELS, ACCOUNT_ADDRESS_LABELS, CONTACT_FIELD_LABELS, CONTACT_ADDRESS_LABELS } from "@shared/field-labels";

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

// Define base/standard fields for Contact and Account (Pivotal B2B Standard Template Compatible)
const BASE_CONTACT_FIELDS = [
  { value: "researchDate", label: CONTACT_FIELD_LABELS.researchDate },
  { value: "fullName", label: CONTACT_FIELD_LABELS.fullName },
  { value: "firstName", label: CONTACT_FIELD_LABELS.firstName },
  { value: "lastName", label: CONTACT_FIELD_LABELS.lastName },
  { value: "jobTitle", label: CONTACT_FIELD_LABELS.jobTitle },
  { value: "department", label: CONTACT_FIELD_LABELS.department },
  { value: "seniorityLevel", label: CONTACT_FIELD_LABELS.seniorityLevel },
  { value: "list", label: CONTACT_FIELD_LABELS.list },
  { value: "linkedinUrl", label: CONTACT_FIELD_LABELS.linkedinUrl },
  { value: "email", label: CONTACT_FIELD_LABELS.email },
  { value: "emailVerificationStatus", label: CONTACT_FIELD_LABELS.emailVerificationStatus },
  { value: "emailAiConfidence", label: CONTACT_FIELD_LABELS.emailAiConfidence },
  { value: "directPhone", label: CONTACT_FIELD_LABELS.directPhone },
  { value: "phoneAiConfidence", label: CONTACT_FIELD_LABELS.phoneAiConfidence },
  { value: "mobilePhone", label: CONTACT_FIELD_LABELS.mobilePhone },
  { value: "city", label: CONTACT_ADDRESS_LABELS.city },
  { value: "state", label: CONTACT_ADDRESS_LABELS.state },
  { value: "stateAbbr", label: CONTACT_ADDRESS_LABELS.stateAbbr },
  { value: "postalCode", label: CONTACT_ADDRESS_LABELS.postalCode },
  { value: "country", label: CONTACT_ADDRESS_LABELS.country },
  { value: "contactLocation", label: CONTACT_ADDRESS_LABELS.contactLocation },
  { value: "formerPosition", label: CONTACT_FIELD_LABELS.formerPosition },
  { value: "timeInCurrentPosition", label: CONTACT_FIELD_LABELS.timeInCurrentPosition },
  { value: "timeInCurrentCompany", label: CONTACT_FIELD_LABELS.timeInCurrentCompany },
  { value: "phoneExtension", label: CONTACT_FIELD_LABELS.phoneExtension },
  { value: "address", label: CONTACT_ADDRESS_LABELS.address },
  { value: "consentBasis", label: CONTACT_FIELD_LABELS.consentBasis },
  { value: "consentSource", label: CONTACT_FIELD_LABELS.consentSource },
  { value: "emailStatus", label: CONTACT_FIELD_LABELS.emailStatus },
  { value: "phoneStatus", label: CONTACT_FIELD_LABELS.phoneStatus },
];

const BASE_ACCOUNT_FIELDS = [
  { value: "name", label: ACCOUNT_FIELD_LABELS.name },
  { value: "companyLocation", label: ACCOUNT_ADDRESS_LABELS.companyLocation },
  { value: "hqStreet1", label: ACCOUNT_ADDRESS_LABELS.hqStreet1 },
  { value: "hqStreet2", label: ACCOUNT_ADDRESS_LABELS.hqStreet2 },
  { value: "hqStreet3", label: ACCOUNT_ADDRESS_LABELS.hqStreet3 },
  { value: "hqCity", label: ACCOUNT_ADDRESS_LABELS.hqCity },
  { value: "hqState", label: ACCOUNT_ADDRESS_LABELS.hqState },
  { value: "hqStateAbbr", label: ACCOUNT_ADDRESS_LABELS.hqStateAbbr },
  { value: "hqPostalCode", label: ACCOUNT_ADDRESS_LABELS.hqPostalCode },
  { value: "hqCountry", label: ACCOUNT_ADDRESS_LABELS.hqCountry },
  { value: "annualRevenue", label: ACCOUNT_FIELD_LABELS.annualRevenue },
  { value: "minAnnualRevenue", label: ACCOUNT_FIELD_LABELS.minAnnualRevenue },
  { value: "maxAnnualRevenue", label: ACCOUNT_FIELD_LABELS.maxAnnualRevenue },
  { value: "revenueRange", label: ACCOUNT_FIELD_LABELS.revenueRange },
  { value: "employeesSizeRange", label: ACCOUNT_FIELD_LABELS.employeesSizeRange },
  { value: "staffCount", label: ACCOUNT_FIELD_LABELS.staffCount },
  { value: "minEmployeesSize", label: ACCOUNT_FIELD_LABELS.minEmployeesSize },
  { value: "maxEmployeesSize", label: ACCOUNT_FIELD_LABELS.maxEmployeesSize },
  { value: "description", label: ACCOUNT_FIELD_LABELS.description },
  { value: "list", label: ACCOUNT_FIELD_LABELS.list },
  { value: "domain", label: ACCOUNT_FIELD_LABELS.domain },
  { value: "yearFounded", label: ACCOUNT_FIELD_LABELS.yearFounded },
  { value: "industryStandardized", label: ACCOUNT_FIELD_LABELS.industryStandardized },
  { value: "linkedinUrl", label: ACCOUNT_FIELD_LABELS.linkedinUrl },
  { value: "linkedinId", label: ACCOUNT_FIELD_LABELS.linkedinId },
  { value: "techStack", label: ACCOUNT_FIELD_LABELS.techStack },
  { value: "sicCode", label: ACCOUNT_FIELD_LABELS.sicCode },
  { value: "naicsCode", label: ACCOUNT_FIELD_LABELS.naicsCode },
  { value: "mainPhone", label: ACCOUNT_FIELD_LABELS.mainPhone },
  { value: "mainPhoneExtension", label: ACCOUNT_FIELD_LABELS.mainPhoneExtension },
  { value: "hqAddress", label: ACCOUNT_ADDRESS_LABELS.hqAddress },
];

export function CSVFieldMapper({
  csvHeaders,
  sampleData,
  onMappingComplete,
  onCancel,
}: CSVFieldMapperProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [autoMapped, setAutoMapped] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFieldForColumn, setCreateFieldForColumn] = useState<string | null>(null);
  const [createFieldEntity, setCreateFieldEntity] = useState<"contact" | "account" | null>(null);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "date" | "boolean">("text");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

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

    // Special case mappings for Pivotal B2B Standard Template + Common variations
    const specialMappings: Record<string, FieldMapping> = {
      // Contact Pivotal Template Exact Matches
      "researchdate": { csvColumn, targetField: "researchDate", targetEntity: "contact" },
      "contactfullname": { csvColumn, targetField: "fullName", targetEntity: "contact" },
      "firstname": { csvColumn, targetField: "firstName", targetEntity: "contact" },
      "lastname": { csvColumn, targetField: "lastName", targetEntity: "contact" },
      "contactliprofileurl": { csvColumn, targetField: "linkedinUrl", targetEntity: "contact" },
      "email1": { csvColumn, targetField: "email", targetEntity: "contact" },
      "email": { csvColumn, targetField: "email", targetEntity: "contact" },
      "email1validation": { csvColumn, targetField: "emailVerificationStatus", targetEntity: "contact" },
      "email1totalai": { csvColumn, targetField: "emailAiConfidence", targetEntity: "contact" },
      "contactphone1": { csvColumn, targetField: "directPhone", targetEntity: "contact" },
      "contactphone1totalai": { csvColumn, targetField: "phoneAiConfidence", targetEntity: "contact" },
      "contactmobilephone": { csvColumn, targetField: "mobilePhone", targetEntity: "contact" },
      "contactcity": { csvColumn, targetField: "city", targetEntity: "contact" },
      "contactstate": { csvColumn, targetField: "state", targetEntity: "contact" },
      "contactstateabbr": { csvColumn, targetField: "stateAbbr", targetEntity: "contact" },
      "contactpostcode": { csvColumn, targetField: "postalCode", targetEntity: "contact" },
      "contactcountry": { csvColumn, targetField: "country", targetEntity: "contact" },
      "contactlocation": { csvColumn, targetField: "contactLocation", targetEntity: "contact" },
      "formerposition": { csvColumn, targetField: "formerPosition", targetEntity: "contact" },
      "timeincurrentposition": { csvColumn, targetField: "timeInCurrentPosition", targetEntity: "contact" },
      "timeincurrentcompany": { csvColumn, targetField: "timeInCurrentCompany", targetEntity: "contact" },
      "title": { csvColumn, targetField: "jobTitle", targetEntity: "contact" },
      "jobtitle": { csvColumn, targetField: "jobTitle", targetEntity: "contact" },
      "department": { csvColumn, targetField: "department", targetEntity: "contact" },
      "seniority": { csvColumn, targetField: "seniorityLevel", targetEntity: "contact" },

      // Account Pivotal Template Exact Matches
      "companynamecleaned": { csvColumn, targetField: "name", targetEntity: "account" },
      "companyname": { csvColumn, targetField: "name", targetEntity: "account" },
      "company": { csvColumn, targetField: "name", targetEntity: "account" },
      "companylocation": { csvColumn, targetField: "companyLocation", targetEntity: "account" },
      "companystreet1": { csvColumn, targetField: "hqStreet1", targetEntity: "account" },
      "companystreet2": { csvColumn, targetField: "hqStreet2", targetEntity: "account" },
      "companystreet3": { csvColumn, targetField: "hqStreet3", targetEntity: "account" },
      "companycity": { csvColumn, targetField: "hqCity", targetEntity: "account" },
      "companystate": { csvColumn, targetField: "hqState", targetEntity: "account" },
      "companystateabbr": { csvColumn, targetField: "hqStateAbbr", targetEntity: "account" },
      "companypostcode": { csvColumn, targetField: "hqPostalCode", targetEntity: "account" },
      "companycountry": { csvColumn, targetField: "hqCountry", targetEntity: "account" },
      "companyannualrevenue": { csvColumn, targetField: "annualRevenue", targetEntity: "account" },
      "companyrevenuerange": { csvColumn, targetField: "revenueRange", targetEntity: "account" },
      "companystaffcountrange": { csvColumn, targetField: "employeesSizeRange", targetEntity: "account" },
      "staffcount": { csvColumn, targetField: "staffCount", targetEntity: "account" },
      "companydescription": { csvColumn, targetField: "description", targetEntity: "account" },
      "companywebsitedomain": { csvColumn, targetField: "domain", targetEntity: "account" },
      "companyfoundeddate": { csvColumn, targetField: "yearFounded", targetEntity: "account" },
      "companyindustry": { csvColumn, targetField: "industryStandardized", targetEntity: "account" },
      "companyliprofileurl": { csvColumn, targetField: "linkedinUrl", targetEntity: "account" },
      "companylinkedinid": { csvColumn, targetField: "linkedinId", targetEntity: "account" },
      "webtechnologies": { csvColumn, targetField: "techStack", targetEntity: "account" },
      "mainphone": { csvColumn, targetField: "mainPhone", targetEntity: "account" },
      "siccode": { csvColumn, targetField: "sicCode", targetEntity: "account" },
      "naicscode": { csvColumn, targetField: "naicsCode", targetEntity: "account" },

      // Generic fallbacks
      "name": { csvColumn, targetField: "fullName", targetEntity: "contact" },
      "organization": { csvColumn, targetField: "name", targetEntity: "account" },
      "phone": { csvColumn, targetField: "directPhone", targetEntity: "contact" },
      "mobile": { csvColumn, targetField: "mobilePhone", targetEntity: "contact" },
      "cell": { csvColumn, targetField: "mobilePhone", targetEntity: "contact" },
      "position": { csvColumn, targetField: "jobTitle", targetEntity: "contact" },
      "role": { csvColumn, targetField: "jobTitle", targetEntity: "contact" },
      "city": { csvColumn, targetField: "city", targetEntity: "contact" },
      "state": { csvColumn, targetField: "state", targetEntity: "contact" },
      "country": { csvColumn, targetField: "country", targetEntity: "contact" },
      "website": { csvColumn, targetField: "domain", targetEntity: "account" },
      "url": { csvColumn, targetField: "domain", targetEntity: "account" },
      "domain": { csvColumn, targetField: "domain", targetEntity: "account" },
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

  // Show loading state while custom fields are being fetched
  if (customFieldsLoading) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Loading field mappings...</p>
      </div>
    );
  }

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

  const openCreateDialog = (csvColumn: string, entity: "contact" | "account") => {
    setCreateFieldForColumn(csvColumn);
    setCreateFieldEntity(entity);
    // Auto-suggest field key from CSV column name
    const suggestedKey = csvColumn.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setNewFieldKey(suggestedKey);
    setNewFieldLabel(csvColumn);
    setShowCreateDialog(true);
  };

  const handleCreateCustomField = async () => {
    if (!newFieldKey || !newFieldLabel || !createFieldEntity) return;

    setIsCreating(true);
    try {
      const response = await apiRequest("POST", "/api/custom-fields", {
        entityType: createFieldEntity,
        fieldKey: newFieldKey,
        displayLabel: newFieldLabel,
        fieldType: newFieldType,
        active: true,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create custom field");
      }

      // Refresh custom fields
      await queryClient.invalidateQueries({ queryKey: ['/api/custom-fields'] });

      // Auto-map the column to the newly created field
      if (createFieldForColumn) {
        updateMapping(createFieldForColumn, `custom_${newFieldKey}`, createFieldEntity);
      }

      toast({
        title: "Custom Field Created",
        description: `Created "${newFieldLabel}" and mapped it to column "${createFieldForColumn}"`,
      });

      // Reset dialog state
      setShowCreateDialog(false);
      setCreateFieldForColumn(null);
      setCreateFieldEntity(null);
      setNewFieldKey("");
      setNewFieldLabel("");
      setNewFieldType("text");
    } catch (error) {
      console.error("Failed to create custom field:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create custom field",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const mappedCount = mappings.filter(m => m.targetField !== null).length;
  const unmappedCount = mappings.length - mappedCount;
  const unmappedColumns = mappings.filter(m => m.targetField === null).map(m => m.csvColumn);

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
      
      {unmappedCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: {unmappedCount} Unmapped Column{unmappedCount > 1 ? 's' : ''}</AlertTitle>
          <AlertDescription>
            <p className="mb-2">The following CSV columns are not mapped and will be skipped during import:</p>
            <div className="flex flex-wrap gap-1">
              {unmappedColumns.map(col => (
                <Badge key={col} variant="outline" className="font-mono text-xs">
                  {col}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs">Map them above or select "Skip Column" to dismiss this warning.</p>
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
                      onValueChange={(value) => {
                        if (value === "__CREATE_NEW__") {
                          openCreateDialog(mapping.csvColumn, mapping.targetEntity!);
                        } else {
                          updateMapping(mapping.csvColumn, value, mapping.targetEntity);
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1" data-testid={`select-field-${mapping.csvColumn}`}>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__CREATE_NEW__" className="font-medium text-primary">
                          <div className="flex items-center gap-2">
                            <Plus className="h-3 w-3" />
                            <span>Create New Custom Field</span>
                          </div>
                        </SelectItem>
                        <div className="my-1 border-t" />
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

      {/* Create Custom Field Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Field</DialogTitle>
            <DialogDescription>
              Create a new custom {createFieldEntity} field and map column "{createFieldForColumn}" to it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="field-key">Field Key*</Label>
              <Input
                id="field-key"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="e.g., custom_field_name"
                data-testid="input-field-key"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for this field (lowercase, numbers, underscores only)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-label">Display Label*</Label>
              <Input
                id="field-label"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="e.g., Custom Field Name"
                data-testid="input-field-label"
              />
              <p className="text-xs text-muted-foreground">
                Human-readable name shown in the UI
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-type">Field Type*</Label>
              <Select value={newFieldType} onValueChange={(value: any) => setNewFieldType(value)}>
                <SelectTrigger id="field-type" data-testid="select-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustomField}
              disabled={!newFieldKey || !newFieldLabel || isCreating}
              data-testid="button-create-field"
            >
              {isCreating ? "Creating..." : "Create & Map"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}