import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, User, Building2, MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function DvAgentConsole() {
  const [, params] = useRoute('/dv/console/:projectId');
  const projectId = params?.projectId;
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState('');
  
  // Editable contact fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  
  // Editable company fields
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [website, setWebsite] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');

  const { data: queue = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/dv/queue', projectId],
    enabled: !!projectId,
  });

  const currentRecord = queue[currentIndex];

  // Load record data when current record changes
  useEffect(() => {
    if (currentRecord) {
      setFirstName(currentRecord.firstName || '');
      setLastName(currentRecord.lastName || '');
      setEmail(currentRecord.email || '');
      setPhone(currentRecord.phoneRaw || '');
      setJobTitle(currentRecord.jobTitle || '');
      setLinkedinUrl(currentRecord.linkedinUrl || '');
      setCompanyName(currentRecord.accountName || '');
      setCompanyDomain(currentRecord.accountDomain || '');
      setWebsite(currentRecord.website || '');
      setAddress1(currentRecord.address1 || '');
      setAddress2(currentRecord.address2 || '');
      setAddress3(currentRecord.address3 || '');
      setCity(currentRecord.city || '');
      setState(currentRecord.state || '');
      setZip(currentRecord.zip || '');
      setCountry(currentRecord.country || '');
      setNotes('');
    }
  }, [currentRecord]);

  const updateRecordMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/dv/records/${currentRecord?.id}`, data),
  });

  const dispositionMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/dv/runs', data),
    onSuccess: () => {
      toast({ title: 'Record processed', description: 'Changes saved and disposition recorded' });
      queryClient.invalidateQueries({ queryKey: ['/api/dv/queue', projectId] });
      setCurrentIndex(prev => prev + 1);
    },
  });

  const handleDisposition = async (disposition: string) => {
    if (!currentRecord) return;

    // First update the record with edited fields
    await updateRecordMutation.mutateAsync({
      firstName,
      lastName,
      email,
      phoneRaw: phone,
      jobTitle,
      linkedinUrl,
      accountName: companyName,
      accountDomain: companyDomain,
      website,
      address1,
      address2,
      address3,
      city,
      state,
      zip,
      country,
    });

    // Then submit disposition
    dispositionMutation.mutate({
      recordId: currentRecord.id,
      projectId,
      disposition,
      notes,
      checks: {
        email: email ? 'valid' : 'missing',
        phone: phone ? 'valid' : 'missing',
        company: companyName ? 'valid' : 'missing',
      },
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-spinner"/>
    </div>;
  }

  if (!queue || queue.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/dv/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Agent Console</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Queue is empty</h3>
              <p className="text-muted-foreground">
                No records available for verification
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentIndex >= queue.length) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/dv/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Agent Console</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">All records processed</h3>
              <p className="text-muted-foreground mb-4">
                You've reviewed all records in the queue
              </p>
              <Link href={`/dv/projects/${projectId}`}>
                <Button data-testid="button-back-to-project">Back to Project</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href={`/dv/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Data Verification Console</h1>
        </div>
        <Badge variant="secondary" data-testid="badge-progress">
          Record {currentIndex + 1} of {queue.length}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Contact Information
            </CardTitle>
            <CardDescription>Verify and edit contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  data-testid="input-firstName"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  data-testid="input-lastName"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone"
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Enter job title"
                data-testid="input-jobTitle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
              <Input
                id="linkedinUrl"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                data-testid="input-linkedinUrl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Company Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </CardTitle>
            <CardDescription>Verify and edit company details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                data-testid="input-companyName"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyDomain">Company Domain</Label>
              <Input
                id="companyDomain"
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value)}
                placeholder="company.com"
                data-testid="input-companyDomain"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                data-testid="input-website"
              />
            </div>

            <Separator className="my-4" />

            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="w-4 h-4" />
              <span>Company Address</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address1">Address Line 1</Label>
              <Input
                id="address1"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                placeholder="Street address"
                data-testid="input-address1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <Input
                  id="address2"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="Suite, floor, etc."
                  data-testid="input-address2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address3">Address Line 3</Label>
                <Input
                  id="address3"
                  value={address3}
                  onChange={(e) => setAddress3(e.target.value)}
                  placeholder="Additional info"
                  data-testid="input-address3"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  data-testid="input-state"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP/Postal Code</Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="Postal code"
                  data-testid="input-zip"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  data-testid="input-country"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes and Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Verification Notes & Disposition</CardTitle>
          <CardDescription>Add notes and submit your disposition decision</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any verification notes or observations..."
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleDisposition('Verified')}
              disabled={dispositionMutation.isPending}
              className="flex-1 sm:flex-none"
              data-testid="button-verified"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Verified
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDisposition('NeedsManualReview')}
              disabled={dispositionMutation.isPending}
              className="flex-1 sm:flex-none"
              data-testid="button-needs-review"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Needs Review
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDisposition('DoNotUse')}
              disabled={dispositionMutation.isPending}
              className="flex-1 sm:flex-none"
              data-testid="button-invalid"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Invalid
            </Button>
          </div>

          {updateRecordMutation.isPending && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Save className="w-4 h-4 animate-pulse" />
              Saving changes...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
