
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Mail } from "lucide-react";

export default function EmailValidationTest() {
  const [email, setEmail] = useState("");
  const [testEmail, setTestEmail] = useState<string | null>(null);

  const { data: testResult, isLoading } = useQuery({
    queryKey: ['/api/test/email-validation'],
    enabled: false,
  });

  const handleTest = () => {
    if (email) {
      setTestEmail(email);
      // Trigger validation test - you can implement this with a mutation
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-primary rounded-2xl p-8 text-white shadow-smooth-lg">
        <h1 className="text-3xl font-bold">Email Validation Test</h1>
        <p className="mt-2 text-white/90">Test the email validation engine</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Email Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              type="email"
              placeholder="Enter email to test..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTest} disabled={!email || isLoading}>
              <Mail className="mr-2 h-4 w-4" />
              Test Email
            </Button>
          </div>

          {testResult && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Validation Results</h3>
                <Badge variant="outline">
                  {testResult.valid ? "Valid" : "Invalid"}
                </Badge>
              </div>

              <div className="grid gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Format Valid</span>
                      {testResult.formatValid ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Domain Valid</span>
                      {testResult.domainValid ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">MX Records</span>
                      {testResult.mxValid ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
