import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Download, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  parseCSV,
  validateContactWithAccountRow,
  validateContactRow,
  csvRowToContactFromUnified,
  csvRowToAccountFromUnified,
  csvRowToContact,
  type ValidationError,
  downloadCSV,
  generateContactsWithAccountTemplate,
} from "@/lib/csv-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CSVFieldMapper } from "@/components/csv-field-mapper";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface FieldMapping {
  csvColumn: string;
  targetField: string | null;
  targetEntity: "contact" | "account" | null;
}

type ImportStage = "upload" | "mapping" | "validate" | "preview" | "importing" | "complete";

export function CSVImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: CSVImportDialogProps) {
  const [stage, setStage] = useState<ImportStage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const parsed = parseCSV(content);
        
        if (parsed.length > 0) {
          const headers = parsed[0];
          setHeaders(headers);
          setCsvData(parsed.slice(1));
          
          // Always go to mapping stage first - let user review/confirm field mappings
          setStage("mapping");
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleMappingComplete = (mappings: FieldMapping[]) => {
    setFieldMappings(mappings);
    
    // Check if this is unified format (has account fields) or contacts-only
    const hasAccountFields = mappings.some(m => m.targetEntity === "account");
    
    if (hasAccountFields) {
      // Unified format - validate with mapping
      setStage("validate");
      validateDataWithMapping(mappings);
    } else {
      // Contacts-only format - validate contacts only
      setStage("validate");
      validateContactsOnlyWithMapping(mappings);
    }
  };

  const validateContactsOnlyWithMapping = (mappings: FieldMapping[]) => {
    const validationErrors: ValidationError[] = [];

    csvData.forEach((row, index) => {
      // Map the row data to match the expected contact format
      const mappedRow = mappings.map((mapping, idx) => row[idx] || "");
      const mappedHeaders = mappings.map(m => m.targetField || "");
      
      const rowErrors = validateContactRow(mappedRow, mappedHeaders, index + 2);
      validationErrors.push(...rowErrors);
    });

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      setStage("preview");
    }
  };

  const validateContactsOnlyData = (parsed: string[][]) => {
    const dataRows = parsed.slice(1);
    const headerRow = parsed[0];
    const validationErrors: ValidationError[] = [];

    dataRows.forEach((row, index) => {
      const rowErrors = validateContactRow(row, headerRow, index + 2);
      validationErrors.push(...rowErrors);
    });

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      setStage("preview");
    } else {
      setStage("validate");
    }
  };

  const validateDataWithMapping = (mappings: FieldMapping[]) => {
    // Create a mapped headers array based on the field mappings
    const mappedHeaders = mappings.map(m => {
      if (!m.targetField || !m.targetEntity) return "";
      return m.targetEntity === "account" ? `account_${m.targetField}` : m.targetField;
    });
    
    const validationErrors: ValidationError[] = [];

    csvData.forEach((row, index) => {
      // Map the row data to match the expected format
      const mappedRow = mappings.map((mapping, idx) => row[idx] || "");
      const rowErrors = validateContactWithAccountRow(mappedRow, mappedHeaders, index + 2);
      validationErrors.push(...rowErrors);
    });

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      setStage("preview");
    }
  };

  const validateData = (parsed: string[][]) => {
    const dataRows = parsed.slice(1);
    const headerRow = parsed[0];
    const validationErrors: ValidationError[] = [];

    dataRows.forEach((row, index) => {
      const rowErrors = validateContactWithAccountRow(row, headerRow, index + 2); // +2 for header and 1-based
      validationErrors.push(...rowErrors);
    });

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      setStage("preview");
    }
  };

  const handleImport = async () => {
    setStage("importing");
    setImportProgress(0);

    let successCount = 0;
    let failedCount = 0;

    try {
      console.log('[CSV-IMPORT] Starting import with', csvData.length, 'rows');
      console.log('[CSV-IMPORT] Field mappings:', fieldMappings);

      // Check if we have account fields in the mapping
      const hasAccountFields = fieldMappings.some(m => m.targetEntity === "account");
      const isUnifiedFormat = hasAccountFields;

      console.log('[CSV-IMPORT] Is unified format:', isUnifiedFormat);

      // Process in batches for better performance with large files
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(csvData.length / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, csvData.length);
        const batchRows = csvData.slice(start, end);

        console.log(`[CSV-IMPORT] Processing batch ${batchIndex + 1}/${totalBatches} (${batchRows.length} rows)`);

        try {
          if (isUnifiedFormat) {
            // Unified format with account data
            const mappedHeaders = fieldMappings.map(m => {
              if (!m.targetField || !m.targetEntity) return "";
              return m.targetEntity === "account" ? `account_${m.targetField}` : m.targetField;
            });

            const records = batchRows
              .map((row, idx) => {
                const mappedRow = fieldMappings.map((mapping, mapIdx) => row[mapIdx] || "");
                const contactData = csvRowToContactFromUnified(mappedRow, mappedHeaders);
                const accountData = csvRowToAccountFromUnified(mappedRow, mappedHeaders);
                return { 
                  contact: contactData, 
                  account: accountData,
                  rowIndex: start + idx + 2
                };
              })
              .filter((record) => {
                // Filter out records with empty emails
                if (!record.contact.email || !record.contact.email.trim()) {
                  failedCount++;
                  console.error(`Row ${record.rowIndex}: Skipped - Email is required`);
                  return false;
                }
                return true;
              });

            console.log('[CSV-IMPORT] Filtered records:', records.length);

            if (records.length > 0) {
              const response = await apiRequest(
                "POST",
                "/api/contacts/batch-import",
                { records: records.map(r => ({ contact: r.contact, account: r.account })) }
              );
              
              const result = await response.json() as {
                success: number;
                failed: number;
                errors: Array<{ index: number; error: string }>;
              };
              
              console.log('[CSV-IMPORT] Batch result:', result);
              
              successCount += result.success;
              failedCount += result.failed;

              if (result.errors.length > 0) {
                result.errors.forEach((err: { index: number; error: string }) => {
                  const actualRowIndex = records[err.index]?.rowIndex || (start + err.index + 2);
                  console.error(`Row ${actualRowIndex}: ${err.error}`);
                });
              }
            }
          } else {
            // Contacts-only format with mapping
            const mappedHeaders = fieldMappings.map(m => m.targetField || "");
            const contacts = batchRows.map((row, idx) => {
              const mappedRow = fieldMappings.map((mapping, mapIdx) => row[mapIdx] || "");
              return { 
                data: csvRowToContact(mappedRow, mappedHeaders),
                rowIndex: start + idx + 2 // +2 for header and 1-based indexing
              };
            });

            console.log('[CSV-IMPORT] Contacts to import:', contacts.length);

            for (const contact of contacts) {
              try {
                // Skip contacts with empty or invalid email
                if (!contact.data.email || !contact.data.email.trim()) {
                  failedCount++;
                  console.error(`Row ${contact.rowIndex}: Skipped - Email is required`);
                  continue;
                }
                
                console.log(`[CSV-IMPORT] Importing contact at row ${contact.rowIndex}:`, contact.data.email);
                await apiRequest("POST", "/api/contacts", contact.data);
                successCount++;
              } catch (error) {
                failedCount++;
                console.error(`Row ${contact.rowIndex}: Failed to import contact -`, error);
              }
            }
          }
        } catch (error) {
          failedCount += batchRows.length;
          console.error(`Failed to import batch ${batchIndex + 1}:`, error);
        }

        setImportProgress(Math.round(((end) / csvData.length) * 100));
      }

      console.log('[CSV-IMPORT] Import complete - Success:', successCount, 'Failed:', failedCount);

      setImportResults({ success: successCount, failed: failedCount });
      setStage("complete");

      const message = isUnifiedFormat 
        ? `Successfully imported ${successCount} contacts with accounts. ${failedCount} failed.`
        : `Successfully imported ${successCount} contacts. ${failedCount} failed.`;

      toast({
        title: "Import Complete",
        description: message,
      });

      onImportComplete();
    } catch (error) {
      console.error("Import failed:", error);
      setStage("upload");
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = async () => {
    try {
      // Fetch current custom fields configuration
      const [contactFieldsRes, accountFieldsRes] = await Promise.all([
        apiRequest("GET", "/api/custom-fields/contact"),
        apiRequest("GET", "/api/custom-fields/account"),
      ]);

      const contactCustomFields = await contactFieldsRes.json() as Array<{ name: string; type: string }>;
      const accountCustomFields = await accountFieldsRes.json() as Array<{ name: string; type: string }>;

      // Build headers with custom fields
      const headers = [
        // Contact fields
        "firstName",
        "lastName", 
        "fullName",
        "email",
        "directPhone",
        "jobTitle",
        "department",
        "seniorityLevel",
        "linkedinUrl",
        "consentBasis",
        "consentSource",
        "tags",
        // Contact custom fields (dynamic)
        ...contactCustomFields.map(f => `custom_${f.name}`),
        // Account fields (prefixed with account_)
        "account_name",
        "account_domain",
        "account_industry",
        "account_employeesSize",
        "account_revenue",
        "account_city",
        "account_state",
        "account_country",
        "account_phone",
        "account_linkedinUrl",
        "account_description",
        "account_techStack",
        "account_tags",
        // Account custom fields (dynamic)
        ...accountCustomFields.map(f => `account_custom_${f.name}`),
      ];

      // Build sample row with examples
      const sampleRow = [
        // Contact data
        "John",
        "Doe",
        "John Doe",
        "john.doe@example.com",
        "+14155551234",
        "VP of Sales",
        "Sales",
        "Executive",
        "https://linkedin.com/in/johndoe",
        "legitimate_interest",
        "Website Form",
        "enterprise,vip",
        // Contact custom fields examples
        ...contactCustomFields.map(f => {
          if (f.type === 'number') return "100";
          if (f.type === 'date') return "2024-01-15";
          if (f.type === 'boolean') return "true";
          return `Sample ${f.name}`;
        }),
        // Account data
        "Acme Corporation",
        "acme.com",
        "Technology",
        "1000-5000",
        "$50M-$100M",
        "San Francisco",
        "CA",
        "United States",
        "+14155559999",
        "https://linkedin.com/company/acme",
        "Leading technology company",
        "Salesforce,HubSpot,AWS",
        "Enterprise,Hot Lead",
        // Account custom fields examples
        ...accountCustomFields.map(f => {
          if (f.type === 'number') return "250";
          if (f.type === 'date') return "2024-06-01";
          if (f.type === 'boolean') return "false";
          return `Sample ${f.name}`;
        }),
      ];

      const csv = [headers.join(","), sampleRow.join(",")].join("\n");
      
      downloadCSV(
        csv,
        `contacts_accounts_template_${new Date().toISOString().split("T")[0]}.csv`
      );

      toast({
        title: "Template Downloaded",
        description: `Template includes ${contactCustomFields.length} contact custom fields and ${accountCustomFields.length} account custom fields`,
      });
    } catch (error) {
      console.error("Failed to generate template:", error);
      // Fallback to basic template
      const template = generateContactsWithAccountTemplate();
      downloadCSV(
        template,
        `contacts_accounts_template_${new Date().toISOString().split("T")[0]}.csv`
      );
      
      toast({
        title: "Template Downloaded",
        description: "Basic template downloaded (custom fields not included)",
      });
    }
  };

  const downloadContactsOnlyTemplate = async () => {
    try {
      // Fetch current custom fields configuration
      const contactFieldsRes = await apiRequest("GET", "/api/custom-fields/contact");
      const contactCustomFields = await contactFieldsRes.json() as Array<{ name: string; type: string }>;

      const headers = [
        "firstName",
        "lastName", 
        "fullName",
        "email",
        "directPhone",
        "jobTitle",
        "department",
        "seniorityLevel",
        "linkedinUrl",
        "consentBasis",
        "consentSource",
        "tags",
        // Dynamic custom fields
        ...contactCustomFields.map(f => `custom_${f.name}`),
      ];

      const sampleRow = [
        "John",
        "Doe",
        "John Doe",
        "john.doe@example.com",
        "+14155551234",
        "VP of Sales",
        "Sales",
        "Executive",
        "https://linkedin.com/in/johndoe",
        "legitimate_interest",
        "Website Form",
        "enterprise,vip",
        // Custom fields examples
        ...contactCustomFields.map(f => {
          if (f.type === 'number') return "100";
          if (f.type === 'date') return "2024-01-15";
          if (f.type === 'boolean') return "true";
          return `Sample ${f.name}`;
        }),
      ];

      const csv = [headers.join(","), sampleRow.join(",")].join("\n");
      
      downloadCSV(
        csv,
        `contacts_only_template_${new Date().toISOString().split("T")[0]}.csv`
      );

      toast({
        title: "Template Downloaded",
        description: `Template includes ${contactCustomFields.length} custom fields from your settings`,
      });
    } catch (error) {
      console.error("Failed to generate template:", error);
      // Fallback to basic template
      const headers = [
        "firstName", "lastName", "fullName", "email", "directPhone",
        "jobTitle", "department", "seniorityLevel", "linkedinUrl",
        "consentBasis", "consentSource", "tags",
      ];
      const sampleRow = [
        "John", "Doe", "John Doe", "john.doe@example.com", "+14155551234",
        "VP of Sales", "Sales", "Executive", "https://linkedin.com/in/johndoe",
        "legitimate_interest", "Website Form", "enterprise,vip",
      ];
      const csv = [headers.join(","), sampleRow.join(",")].join("\n");
      
      downloadCSV(csv, `contacts_only_template_${new Date().toISOString().split("T")[0]}.csv`);
      
      toast({
        title: "Template Downloaded",
        description: "Basic template downloaded (custom fields not included)",
      });
    }
  };

  const downloadErrorReport = () => {
    const errorReport = [
      ["Row", "Field", "Value", "Error"],
      ...errors.map((err) => [
        err.row.toString(),
        err.field,
        err.value,
        err.error,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    downloadCSV(
      errorReport,
      `contact_import_errors_${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  const handleClose = () => {
    setStage("upload");
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setFieldMappings([]);
    setErrors([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Import Contacts from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import contacts. Supports both contacts-only format and unified contacts+accounts format.
            The system will automatically detect the format and handle account linking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Stage */}
          {stage === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Select a CSV file to import
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                  data-testid="input-csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button variant="outline" asChild data-testid="button-select-csv">
                    <span>
                      <FileText className="mr-2 h-4 w-4" />
                      Select CSV File
                    </span>
                  </Button>
                </label>
              </div>

              <div className="space-y-2">
                <Alert>
                  <Download className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-medium">Download a sample template to see the exact format:</p>
                      <p className="text-xs text-muted-foreground">
                        Templates include all your custom fields from Settings with sample data
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadContactsOnlyTemplate}
                          data-testid="button-download-contacts-template"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Contacts Only
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadTemplate}
                          data-testid="button-download-unified-template"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Contacts + Accounts
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Mapping Stage */}
          {stage === "mapping" && headers.length > 0 && (
            <div className="space-y-4">
              <CSVFieldMapper
                csvHeaders={headers}
                sampleData={csvData.slice(0, 3)}
                onMappingComplete={handleMappingComplete}
                onCancel={handleClose}
              />
            </div>
          )}

          {/* Validation Stage */}
          {stage === "validate" && errors.length > 0 && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Found {errors.length} validation error(s) in your CSV file.
                  Please fix these errors and try again.
                </AlertDescription>
              </Alert>

              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-2">
                  {errors.map((error, idx) => (
                    <div key={idx} className="p-3 border rounded-md bg-destructive/5">
                      <div className="flex items-start gap-2">
                        <Badge variant="destructive">Row {error.row}</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{error.field}</p>
                          <p className="text-sm text-muted-foreground">
                            {error.error}
                          </p>
                          {error.value && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              Value: "{error.value}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadErrorReport}
                  data-testid="button-download-errors"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Error Report
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Preview Stage */}
          {stage === "preview" && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Validation passed! Ready to import {csvData.length} record(s).
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Preview (first 5 rows)</h4>
                <ScrollArea className="h-[200px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {headers.slice(0, 6).map((header, idx) => (
                          <th key={idx} className="text-left p-2 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b">
                          {row.slice(0, 6).map((cell, cellIdx) => (
                            <td key={cellIdx} className="p-2">
                              {cell || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Importing Stage */}
          {stage === "importing" && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  Importing records... Please wait.
                </p>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  {importProgress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Complete Stage */}
          {stage === "complete" && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Import completed! {importResults.success} record(s) imported
                  successfully.
                  {importResults.failed > 0 &&
                    ` ${importResults.failed} record(s) failed.`}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          {stage === "preview" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} data-testid="button-start-import">
                Import {csvData.length} Record(s)
              </Button>
            </>
          )}

          {stage === "complete" && (
            <Button onClick={handleClose} data-testid="button-close-import">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
