import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Globe, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { insertDomainSetSchema, type DomainSet } from "@shared/schema";

const domainSetFormSchema = insertDomainSetSchema.omit({
  domains: true,
}).extend({
  name: z.string().min(1, "Name required"),
  domainsText: z.string().min(1, "At least one domain required"),
});

type DomainSetFormData = z.infer<typeof domainSetFormSchema>;

export default function DomainSetsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: domainSets = [], isLoading } = useQuery<DomainSet[]>({
    queryKey: ['/api/domain-sets'],
  });

  const form = useForm<DomainSetFormData>({
    resolver: zodResolver(domainSetFormSchema),
    defaultValues: {
      name: '',
      domainsText: '',
      ownerId: user?.id || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DomainSetFormData) => {
      // Parse domains from text input (comma or newline separated)
      const domains = data.domainsText
        .split(/[\n,]+/)
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0);

      return await apiRequest('POST', '/api/domain-sets', {
        name: data.name,
        domains,
        ownerId: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domain-sets'], refetchType: 'active' });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Domain set created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create domain set",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DomainSetFormData) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-domain-sets">Domain Sets</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage target domain lists for account matching
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-domain-set">
          <Plus className="mr-2 h-4 w-4" />
          Upload Domains
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search domain sets..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-domain-sets"
          />
        </div>
      </div>

      {domainSets.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No domain sets yet"
          description="Upload your first domain list to begin account matching"
          action={
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-upload-first">
              <Plus className="mr-2 h-4 w-4" />
              Upload Domains
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {domainSets.map((set) => (
            <Card key={set.id} className="hover-elevate" data-testid={`card-domain-set-${set.id}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg" data-testid={`text-domain-set-name-${set.id}`}>
                    {set.name}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Domains</span>
                  <Badge variant="secondary">{set.domains?.length || 0}</Badge>
                </div>
                {set.domains && set.domains.length > 0 && (
                  <div className="text-xs text-muted-foreground font-mono space-y-1">
                    {set.domains.slice(0, 3).map((domain, idx) => (
                      <div key={idx}>{domain}</div>
                    ))}
                    {set.domains.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{set.domains.length - 3} more
                      </div>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Created {new Date(set.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-domain-set">
          <DialogHeader>
            <DialogTitle>Upload Domain Set</DialogTitle>
            <DialogDescription>
              Add a list of target domains for account matching and campaign targeting
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Set Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Fortune 500 Tech" data-testid="input-set-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="domainsText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domains</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="example.com, acme.io&#10;techcorp.com&#10;startup.ai"
                        rows={8}
                        className="font-mono text-sm"
                        data-testid="textarea-domains"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter domains separated by commas or newlines
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel-domain-set"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-domain-set"
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Upload Domains
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
