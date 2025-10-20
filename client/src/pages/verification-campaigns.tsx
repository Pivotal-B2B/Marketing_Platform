import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Settings, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function VerificationCampaignsPage() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/verification-campaigns"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Verification Campaigns
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Configure and manage data verification campaigns with customizable eligibility rules
          </p>
        </div>
        <Link href="/verification/campaigns/new">
          <Button data-testid="button-create-campaign">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground" data-testid="text-loading">
              Loading campaigns...
            </div>
          ) : campaigns && (campaigns as any[]).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Monthly Target</TableHead>
                  <TableHead>Lead Cap/Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campaigns as any[]).map((campaign: any) => (
                  <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                    <TableCell className="font-medium" data-testid={`text-campaign-name-${campaign.id}`}>
                      {campaign.name}
                    </TableCell>
                    <TableCell data-testid={`text-target-${campaign.id}`}>
                      {campaign.monthlyTarget}
                    </TableCell>
                    <TableCell data-testid={`text-cap-${campaign.id}`}>
                      {campaign.leadCapPerAccount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={campaign.status === 'active' ? 'default' : 'secondary'}
                        data-testid={`badge-status-${campaign.id}`}
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/verification/upload/${campaign.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-upload-${campaign.id}`}>
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                          </Button>
                        </Link>
                        <Link href={`/verification/console/${campaign.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-console-${campaign.id}`}>
                            Console
                          </Button>
                        </Link>
                        <Link href={`/verification/campaigns/${campaign.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-config-${campaign.id}`}>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8" data-testid="text-no-campaigns">
              <p className="text-muted-foreground">No campaigns found. Create one to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
