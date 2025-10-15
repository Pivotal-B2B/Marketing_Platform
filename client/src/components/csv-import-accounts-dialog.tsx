
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
  validateAccountRow,
  csvRowToAccount,
  type ValidationError,
  downloadCSV,
  generateAccountsTemplate,
} from "@/lib/csv-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CSVImportAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

type ImportStage = "upload" | "validate" | "preview" | "importing" | "complete";

export function CSVImportAccountsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: CSVImportAccountsDialogProps) {
  const [stage, setStage] = useState<ImportStage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
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
          setHeaders(parsed[0]);
          setCsvData(parsed.slice(1));
          validateData(parsed);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const validateData = (parsed: string[][]) => {
    const dataRows = parsed.slice(1);
    const headerRow = parsed[0];
    const validationErrors: ValidationError[] = [];

    dataRows.forEach((row, index) => {
      const rowErrors = validateAccountRow(row, headerRow, index + 2);
      validationErrors.push(...rowErrors);
    });

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      setStage("preview");
    } else {
      setStage("validate");
    }
  };

  const handleImport = async () => {
    setStage("importing");
    setImportProgress(0);

    let successCount = 0;
    let failedCount = 0;

    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(csvData.length / BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, csvData.length);
      const batchRows = csvData.slice(start, end);

      try {
        const accounts = batchRows.map((row) => csvRowToAccount(row, headers));

        for (const accountData of accounts) {
          try {
            await apiRequest("POST", "/api/accounts", accountData);
            successCount++;
          } catch (error) {
            failedCount++;
            console.error("Failed to import account:", error);
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

    toast({
      title: "Import Complete",
      description: `Successfully imported ${successCount} accounts. ${failedCount} failed.`,
    });

    onImportComplete();
  };

  const downloadTemplate = () => {
    const template = generateAccountsTemplate();
    downloadCSV(
      template,
      `accounts_template_${new Date().toISOString().split("T")[0]}.csv`
    );

    toast({
      title: "Template Downloaded",
      description: "Accounts CSV template has been downloaded",
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
      `account_import_errors_${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  const handleClose = () => {
    setStage("upload");
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setErrors([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Accounts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                  id="csv-upload-accounts"
                />
                <label htmlFor="csv-upload-accounts">
                  <Button variant="outline" asChild>
                    <span>
                      <FileText className="mr-2 h-4 w-4" />
                      Select CSV File
                    </span>
                  </Button>
                </label>
              </div>

              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Need a template? Download a sample CSV file</span>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

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
                          <p className="text-sm text-muted-foreground">{error.error}</p>
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
                <Button variant="outline" onClick={downloadErrorReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Error Report
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {stage === "preview" && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Validation passed! Ready to import {csvData.length} account(s).
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

          {stage === "importing" && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  Importing accounts... Please wait.
                </p>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  {importProgress}% complete
                </p>
              </div>
            </div>
          )}

          {stage === "complete" && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Import completed! {importResults.success} account(s) imported successfully.
                  {importResults.failed > 0 && ` ${importResults.failed} account(s) failed.`}
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
              <Button onClick={handleImport}>
                Import {csvData.length} Account(s)
              </Button>
            </>
          )}

          {stage === "complete" && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
