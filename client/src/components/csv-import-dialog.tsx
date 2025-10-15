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
          
          // Auto-detect format: check if headers contain account_ prefix
          const hasAccountFields = headers.some(h => h.startsWith('account_'));
          
          if (hasAccountFields) {
            // Unified format detected - go to mapping
            setStage("mapping");
          } else {
            // Contacts-only format - skip mapping, go directly to validation
            setStage("validate");
            validateContactsOnlyData(parsed);
          }
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleMappingComplete = (mappings: FieldMapping[]) => {
    setFieldMappings(mappings);
    // Apply mappings and validate
    setStage("validate");
    validateDataWithMapping(mappings);
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
      // Check if we have field mappings (unified format) or not (contacts-only)
      const isUnifiedFormat = fieldMappings.length > 0;

      // Process in batches for better performance with large files
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(csvData.length / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, csvData.length);
        const batchRows = csvData.slice(start, end);

        try {
          if (isUnifiedFormat) {
            // Unified format with account data
            const mappedHeaders = fieldMappings.map(m => {
              if (!m.targetField || !m.targetEntity) return "";
              return m.targetEntity === "account" ? `account_${m.targetField}` : m.targetField;
            });

            const records = batchRows.map((row) => {
              const mappedRow = fieldMappings.map((mapping, idx) => row[idx] || "");
              const contactData = csvRowToContactFromUnified(mappedRow, mappedHeaders);
              const accountData = csvRowToAccountFromUnified(mappedRow, mappedHeaders);
              return { contact: contactData, account: accountData };
            });

            const response = await apiRequest(
              "POST",
              "/api/contacts/batch-import",
              { records }
            );
            
            const result = await response.json() as {
              success: number;
              failed: number;
              errors: Array<{ index: number; error: string }>;
            };
            
            successCount += result.success;
            failedCount += result.failed;

            if (result.errors.length > 0) {
              result.errors.forEach((err: { index: number; error: string }) => {
                console.error(`Row ${start + err.index + 2}: ${err.error}`);
              });
            }
          } else {
            // Contacts-only format
            const contacts = batchRows.map((row) => csvRowToContact(row, headers));

            for (const contactData of contacts) {
              try {
                await apiRequest("POST", "/api/contacts", contactData);
                successCount++;
              } catch (error) {
                failedCount++;
                console.error("Failed to import contact:", error);
              }
            }
          }
        } catch (error) {
          failedCount += batchRows.length;
          console.error(`Failed to import batch ${batchIndex + 1}:`, error);
        }

        setImportProgress(Math.round(((end) / csvData.length) * 100));
      }

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

  const downloadTemplate = () => {
    const template = generateContactsWithAccountTemplate();
    
    downloadCSV(
      template,
      `contacts_with_accounts_template_${new Date().toISOString().split("T")[0]}.csv`
    );

    toast({
      title: "Template Downloaded",
      description: "Contacts with Accounts CSV template has been downloaded",
    });
  };

  const downloadContactsOnlyTemplate = () => {
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
      "customFields",
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
      '{"favorite_color":"blue"}',
    ];

    const csv = [headers.join(","), sampleRow.join(",")].join("\n");
    
    downloadCSV(
      csv,
      `contacts_only_template_${new Date().toISOString().split("T")[0]}.csv`
    );

    toast({
      title: "Template Downloaded",
      description: "Contacts-only CSV template has been downloaded",
    });
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
                      <p className="font-medium">Download a template to get started:</p>
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
          {stage === "mapping" && (
            <CSVFieldMapper
              csvHeaders={headers}
              sampleData={csvData.slice(0, 3)}
              onMappingComplete={handleMappingComplete}
              onCancel={handleClose}
            />
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
