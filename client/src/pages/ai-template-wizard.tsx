import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCopy,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { Stepper } from "@/components/patterns/stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProjectOption {
  id: string;
  name: string;
  client: string;
  manager: string;
  dueDate: string;
}

interface PersonaOption {
  id: string;
  label: string;
  description: string;
  elevatorPitch: string;
  focusPoints: string[];
}

interface AccountPersonaAngle {
  intro: string;
  outcomes: string[];
  proofPoint: string;
}

interface LandingPageSnapshot {
  url: string;
  headline: string;
  asset: string;
  conversionsLast30: number;
  updatedAt: string;
}

interface AccountRecord {
  id: string;
  name: string;
  industry: string;
  revenue: string;
  hq: string;
  lastEngagement: string;
  activeInitiative: string;
  personaNotes: Record<string, AccountPersonaAngle>;
  landingPage: LandingPageSnapshot;
}

interface FormState {
  projectId: string;
  campaignGoal: string;
  tone: string;
  variantCount: number;
  includeAccountInsights: boolean;
  includePersonaInsights: boolean;
  includePerformanceSignals: boolean;
  cta: string;
  keyMessage: string;
  additionalNotes: string;
}

interface TemplateVariant {
  id: string;
  subject: string;
  preheader: string;
  body: string;
  tone: string;
  cta: string;
  confidence: number;
  highlights: string[];
  recommendations: string[];
}

interface GeneratedAccountTemplates {
  accountId: string;
  accountName: string;
  personaLabel: string;
  templates: TemplateVariant[];
}

const projectOptions: ProjectOption[] = [
  {
    id: "proj-tech",
    name: "Q4 ABM Campaign – Tech Segment",
    client: "Pivotal HQ",
    manager: "Holly Diaz",
    dueDate: "2025-01-18",
  },
  {
    id: "proj-mfg",
    name: "Manufacturing Expansion Sprint",
    client: "Atlas Robotics",
    manager: "Liam O'Connor",
    dueDate: "2025-02-04",
  },
  {
    id: "proj-health",
    name: "Healthcare Pipeline Acceleration",
    client: "Vitalis",
    manager: "Sameera Patel",
    dueDate: "2025-03-01",
  },
];

const personaOptions: PersonaOption[] = [
  {
    id: "cxo",
    label: "C-Suite Leadership",
    description: "Executive narrative emphasising market impact, governance, and board-level confidence.",
    elevatorPitch: "Frame the platform as a lever for strategic differentiation and defensible revenue growth.",
    focusPoints: ["Strategic revenue impact", "Executive-ready insight packets", "Compliance guardrails"],
  },
  {
    id: "vp",
    label: "VP / Director",
    description: "Operators balancing growth mandates with cross-functional alignment.",
    elevatorPitch: "Show how we orchestrate multichannel plays without overwhelming their teams.",
    focusPoints: ["Cross-team alignment", "Operational dashboards", "Fast experimentation"],
  },
  {
    id: "manager",
    label: "Manager",
    description: "Hands-on builders looking for replicable plays and automation.",
    elevatorPitch: "Highlight reusable playbooks, QA workflows, and human-in-the-loop controls.",
    focusPoints: ["Workflow templates", "QA collaboration", "Faster iteration"],
  },
  {
    id: "practitioner",
    label: "Practitioner",
    description: "Specialists executing campaigns and measuring response patterns.",
    elevatorPitch: "Offer tactical guardrails, enriched data, and actionable QA insights.",
    focusPoints: ["Dynamic personalization", "Performance snapshots", "Data provenance"],
  },
];

const accountCatalog: AccountRecord[] = [
  {
    id: "acc-northwind",
    name: "Northwind AI",
    industry: "Cloud Infrastructure",
    revenue: "$420M",
    hq: "Seattle, WA",
    lastEngagement: "Executive workshop · 9 days ago",
    activeInitiative: "Consolidate marketing automation footprint across EMEA",
    personaNotes: {
      cxo: {
        intro: "Northwind's board mandated higher-quality pipeline from strategic accounts.",
        outcomes: [
          "Defend market share in enterprise ML platforms",
          "Ensure compliance-ready outreach for regulated industries",
          "Compress sales cycle with intelligence surfaced from QA",
        ],
        proofPoint: "Pivotal drove 31% faster executive meeting booking for peers in the same revenue band.",
      },
      vp: {
        intro: "Revenue operations is consolidating tooling under a single reporting layer.",
        outcomes: ["Automate ABM journeys", "Surface QA insights back to SDR pods", "Reuse winning sequences"],
        proofPoint: "Shared dashboards reduced handoff friction by 24% in pilot programs.",
      },
      manager: {
        intro: "Campaign managers are stretched across three product lines.",
        outcomes: ["Prefill landing pages with relevant assets", "Centralise QA tasks", "Version control templates"],
        proofPoint: "QA assisted workflows cut review time from 3 days to 6 hours.",
      },
      practitioner: {
        intro: "Demand generation associates need fast personalisation cues.",
        outcomes: ["Dynamic industry copy blocks", "Highlight verified data sources", "Instant send readiness checks"],
        proofPoint: "Account-level snippets increased reply quality scores by 18%.",
      },
    },
    landingPage: {
      url: "https://pivotal.app/campaigns/northwind",
      headline: "Modernise enterprise outreach with AI-assisted QA",
      asset: "ABM Playbook · Cloud Infrastructure",
      conversionsLast30: 14,
      updatedAt: "2025-01-04",
    },
  },
  {
    id: "acc-vanguard",
    name: "Vanguard Cloud",
    industry: "Cybersecurity",
    revenue: "$310M",
    hq: "Austin, TX",
    lastEngagement: "Security council session · 6 days ago",
    activeInitiative: "Launch managed threat services for financial institutions",
    personaNotes: {
      cxo: {
        intro: "Board expects differentiated go-to-market for high-compliance sectors.",
        outcomes: ["Strengthen trust signals", "Map AI content to risk frameworks", "Improve attribution for renewals"],
        proofPoint: "Confidence scoring identified risky claims before release for 96% of sends.",
      },
      vp: {
        intro: "Marketing is coordinating with product for co-authored thought leadership.",
        outcomes: ["Blend campaign data into sales rooms", "De-risk compliance reviews", "Launch thought leadership tracks"],
        proofPoint: "Persona-based variant testing increased webinar attendance by 41%.",
      },
      manager: {
        intro: "Enablement team is new to AI-driven workflows.",
        outcomes: ["Surface safe copy patterns", "Share QA findings", "Automate launch recaps"],
        proofPoint: "QA guardrails cut rework loops from 5 to 1 iteration.",
      },
      practitioner: {
        intro: "Marketing specialists handle heavy merge field usage.",
        outcomes: ["Confidence overlay on subject lines", "Prefilled landing page CTAs", "QA feed for copy tweaks"],
        proofPoint: "Prefilled landing pages drove 12% lift in conversion on recent campaign.",
      },
    },
    landingPage: {
      url: "https://pivotal.app/campaigns/vanguard",
      headline: "Earn trust with verifiable cybersecurity storytelling",
      asset: "Managed Threat Briefing Kit",
      conversionsLast30: 11,
      updatedAt: "2025-01-09",
    },
  },
  {
    id: "acc-fabricon",
    name: "Fabricon",
    industry: "Advanced Manufacturing",
    revenue: "$880M",
    hq: "Chicago, IL",
    lastEngagement: "Pilot performance review · 12 days ago",
    activeInitiative: "Scale predictive maintenance offering to global accounts",
    personaNotes: {
      cxo: {
        intro: "Fabricon is shifting from legacy sales-led to marketing-driven expansions.",
        outcomes: ["Quantify net-new pipeline from digital plays", "Show risk mitigation", "Highlight sustainability wins"],
        proofPoint: "ABM programs connected to 4.3x pipeline in similar manufacturing firms.",
      },
      vp: {
        intro: "Regional directors require consistency across product families.",
        outcomes: ["Centralise content governance", "Expose QA audits", "Coordinate launch playbooks"],
        proofPoint: "Unified QA dashboards lowered compliance escalations to under 2%.",
      },
      manager: {
        intro: "Field marketing needs more ready-to-send variants.",
        outcomes: ["Template libraries per persona", "Dynamic win stories", "Auto attach spec sheets"],
        proofPoint: "Variant reuse saved 18 hours per campaign.",
      },
      practitioner: {
        intro: "Digital team emphasises on-site conversions for demos.",
        outcomes: ["Dynamic CTA scheduling", "Prefilled landing modules", "Confidence tied to conversion"],
        proofPoint: "Prefilled forms cut bounce rate by 27%.",
      },
    },
    landingPage: {
      url: "https://pivotal.app/campaigns/fabricon",
      headline: "Modernise maintenance outreach across every plant",
      asset: "Predictive Maintenance ROI Calculator",
      conversionsLast30: 19,
      updatedAt: "2025-01-02",
    },
  },
];

const qaChecklist = [
  { id: "tone", label: "Tone aligned with project guidelines" },
  { id: "compliance", label: "Compliance scan clean (CAN-SPAM / GDPR)" },
  { id: "personalisation", label: "Dynamic fields validated" },
  { id: "accuracy", label: "Value prop and proof points verified" },
  { id: "cta", label: "CTA approved by campaign owner" },
  { id: "links", label: "Links and UTM parameters confirmed" },
];

const steps = [
  {
    id: "brief",
    label: "Campaign Brief",
    description: "Connect AI generation to the right project, persona, and accounts.",
  },
  {
    id: "generation",
    label: "AI Generation",
    description: "Create and refine personalised variants per account.",
  },
  {
    id: "qa",
    label: "QA & Approval",
    description: "Verify compliance, capture feedback, and approve for launch.",
  },
];

const initialForm: FormState = {
  projectId: projectOptions[0].id,
  campaignGoal: "Webinar invite for AI Ops leaders",
  tone: "consultative",
  variantCount: 3,
  includeAccountInsights: true,
  includePersonaInsights: true,
  includePerformanceSignals: true,
  cta: "Book a strategy session",
  keyMessage:
    "Demonstrate how our AI-assisted orchestration removes manual lift for high-touch ABM programs while keeping QA in the loop.",
  additionalNotes: "Reference Salesforce + Dynamics integrations. Reinforce governance and auditability.",
};

const formatConfidence = (value: number) => `${Math.round(value * 100)}%`;

function buildTemplate(
  account: AccountRecord,
  persona: PersonaOption,
  form: FormState,
  variantIndex: number,
): TemplateVariant {
  const personaAngle = account.personaNotes[persona.id];
  const subjectFocus = persona.focusPoints[variantIndex % persona.focusPoints.length];
  const subject = `${account.name}: ${subjectFocus} now within reach`;
  const preheader = `${personaAngle.intro} – ${form.cta}`;

  const proof = personaAngle.proofPoint;
  const outcomeBullets = personaAngle.outcomes
    .slice(0, 2 + (variantIndex % 2))
    .map(item => `• ${item}`)
    .join("\n");

  const body = `Hi {{Contact.FirstName}},

${personaAngle.intro}

${form.keyMessage}

${outcomeBullets}

What your peers see:
${proof}

Next step: ${form.cta}.
We already prefilled the landing page (${account.landingPage.asset}) so your team can move quickly.

Regards,
Pivotal Campaign Studio`;

  const highlights = [
    `${account.industry} insights injected`,
    `Landing page updated ${account.landingPage.updatedAt}`,
    `${persona.label} persona framing`,
  ];

  const recommendations = [
    "Sync with sales for follow-up call scripts",
    "Pair with predictive send-time once QA finalises",
    `Promote ${account.landingPage.asset} within nurture sequence`,
  ];

  return {
    id: `${account.id}-${variantIndex + 1}`,
    subject,
    preheader,
    body,
    tone: form.tone,
    cta: form.cta,
    confidence: Math.min(0.68 + variantIndex * 0.07, 0.95),
    highlights,
    recommendations,
  };
}

export default function AITemplateWizardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedPersonaId, setSelectedPersonaId] = useState(personaOptions[0].id);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([
    accountCatalog[0].id,
    accountCatalog[1].id,
  ]);
  const [generatedAccounts, setGeneratedAccounts] = useState<GeneratedAccountTemplates[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qaState, setQaState] = useState<Record<string, boolean>>(
    Object.fromEntries(qaChecklist.map(item => [item.id, false])),
  );
  const [qaNotes, setQaNotes] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  const selectedPersona = useMemo(
    () => personaOptions.find(persona => persona.id === selectedPersonaId) ?? personaOptions[0],
    [selectedPersonaId],
  );

  const selectedAccounts = useMemo(
    () => accountCatalog.filter(account => selectedAccountIds.includes(account.id)),
    [selectedAccountIds],
  );

  const selectedAccountTemplates = useMemo(
    () => generatedAccounts.find(account => account.accountId === selectedAccountId) ?? generatedAccounts[0],
    [generatedAccounts, selectedAccountId],
  );

  const selectedVariant = useMemo(() => {
    if (!selectedAccountTemplates) return undefined;
    return (
      selectedAccountTemplates.templates.find(template => template.id === selectedVariantId) ??
      selectedAccountTemplates.templates[0]
    );
  }, [selectedAccountTemplates, selectedVariantId]);

  useEffect(() => {
    if (!selectedAccountTemplates) return;
    const hasExisting = selectedAccountTemplates.templates.some(template => template.id === selectedVariantId);
    if (!hasExisting) {
      setSelectedVariantId(selectedAccountTemplates.templates[0]?.id ?? null);
    }
  }, [selectedAccountTemplates, selectedVariantId]);

  useEffect(() => {
    if (generatedAccounts.length === 0) {
      setSelectedAccountId(null);
      setSelectedVariantId(null);
      return;
    }

    if (!selectedAccountId || !generatedAccounts.some(account => account.accountId === selectedAccountId)) {
      setSelectedAccountId(generatedAccounts[0].accountId);
      setSelectedVariantId(generatedAccounts[0].templates[0]?.id ?? null);
    }
  }, [generatedAccounts, selectedAccountId]);

  const canContinueFromBrief = form.campaignGoal.trim().length > 0 && selectedAccountIds.length > 0;
  const qaComplete = useMemo(() => Object.values(qaState).every(Boolean), [qaState]);

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) {
        if (prev.length === 1) {
          return prev; // ensure at least one account remains selected
        }
        return prev.filter(id => id !== accountId);
      }
      return [...prev, accountId];
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsApproved(false);
    try {
      await new Promise(resolve => setTimeout(resolve, 1100));

      const persona = personaOptions.find(item => item.id === selectedPersonaId) ?? personaOptions[0];
      const templates: GeneratedAccountTemplates[] = selectedAccounts.map(account => ({
        accountId: account.id,
        accountName: account.name,
        personaLabel: persona.label,
        templates: Array.from({ length: form.variantCount }, (_, index) =>
          buildTemplate(account, persona, form, index),
        ),
      }));

      setGeneratedAccounts(templates);
      toast({
        title: "Templates ready",
        description: `Created ${templates.reduce((count, item) => count + item.templates.length, 0)} variants across ${templates.length} accounts.`,
      });
      setCurrentStep(2); // Move to QA once generation completes
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Something interrupted the AI generation. Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = () => {
    if (!qaComplete) {
      toast({
        title: "QA checklist incomplete",
        description: "Please confirm each QA item before approving templates.",
        variant: "destructive",
      });
      return;
    }

    setIsApproved(true);
    toast({
      title: "Templates approved",
      description: "Templates have been approved for campaign hand-off and logged for learning.",
    });
  };

  const handleCopyVariant = async () => {
    if (!selectedVariant) return;
    try {
      await navigator.clipboard.writeText(selectedVariant.body);
      toast({
        title: "Copied",
        description: "Template copied to clipboard for quick editing.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleQaChange = (id: string, value: boolean) => {
    setQaState(prev => ({ ...prev, [id]: value }));
  };

  const resetToSetup = () => {
    setGeneratedAccounts([]);
    setSelectedAccountId(null);
    setSelectedVariantId(null);
    setCurrentStep(0);
    setIsApproved(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="gap-2" onClick={() => setLocation("/campaigns")}>\n            <ArrowLeft className="h-4 w-4" /> Back to Campaigns\n          </Button>
          <Badge variant="outline" className="text-xs font-medium uppercase tracking-wide">
            AI Template Engine
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI assists, humans approve.</span>
          <Separator orientation="vertical" className="h-4" />
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Full QA audit trail enabled</span>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle>AI Template Wizard</CardTitle>
          <CardDescription>
            Generate persona-perfect email templates with data provenance, QA workflow, and landing page alignment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Stepper steps={steps} currentStep={currentStep} allowStepClick onStepClick={setCurrentStep} />
        </CardContent>
      </Card>

      {currentStep === 0 && (
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="border-primary/20">
            <CardHeader className="space-y-1">
              <CardTitle>Campaign Brief</CardTitle>
              <CardDescription>Link the AI engine to your project goals and target accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={form.projectId}
                    onValueChange={value => setForm(prev => ({ ...prev, projectId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectOptions.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {projectOptions.find(project => project.id === form.projectId)?.client} · Owner {" "}
                    {projectOptions.find(project => project.id === form.projectId)?.manager}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Primary persona</Label>
                  <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {personaOptions.map(persona => (
                        <SelectItem key={persona.id} value={persona.id}>
                          {persona.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{selectedPersona.description}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Campaign goal</Label>
                  <Input
                    value={form.campaignGoal}
                    onChange={event => setForm(prev => ({ ...prev, campaignGoal: event.target.value }))}
                    placeholder="e.g. Executive briefing invite"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Call to action</Label>
                  <Input
                    value={form.cta}
                    onChange={event => setForm(prev => ({ ...prev, cta: event.target.value }))}
                    placeholder="e.g. Book a strategy session"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Key message</Label>
                <Textarea
                  value={form.keyMessage}
                  onChange={event => setForm(prev => ({ ...prev, keyMessage: event.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium">Accounts for this generation</Label>
                <div className="grid gap-3">
                  {accountCatalog.map(account => {
                    const personaAngle = account.personaNotes[selectedPersonaId];
                    return (
                      <label
                        key={account.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition", 
                          selectedAccountIds.includes(account.id)
                            ? "border-primary/50 bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-muted"
                        )}
                      >
                        <Checkbox
                          checked={selectedAccountIds.includes(account.id)}
                          onCheckedChange={() => handleAccountToggle(account.id)}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{account.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {account.industry}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {account.lastEngagement} · Active initiative: {account.activeInitiative}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Persona focus: {personaAngle.intro}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  At least one account must remain selected. Toggle off accounts not needed in this generation run.
                </p>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select
                    value={form.tone}
                    onValueChange={value => setForm(prev => ({ ...prev, tone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultative">Consultative</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Variant count per account</Label>
                  <div className="space-y-2">
                    <Slider
                      min={1}
                      max={4}
                      step={1}
                      value={[form.variantCount]}
                      onValueChange={([value]) =>
                        setForm(prev => ({ ...prev, variantCount: value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.variantCount} variant{form.variantCount > 1 ? "s" : ""} will be generated per account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Account insights</p>
                    <p className="text-xs text-muted-foreground">Industry, engagement, initiative</p>
                  </div>
                  <Switch
                    checked={form.includeAccountInsights}
                    onCheckedChange={value =>
                      setForm(prev => ({ ...prev, includeAccountInsights: value }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Persona signals</p>
                    <p className="text-xs text-muted-foreground">Tone + focus from CRM</p>
                  </div>
                  <Switch
                    checked={form.includePersonaInsights}
                    onCheckedChange={value =>
                      setForm(prev => ({ ...prev, includePersonaInsights: value }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Performance overlays</p>
                    <p className="text-xs text-muted-foreground">Confidence + historic stats</p>
                  </div>
                  <Switch
                    checked={form.includePerformanceSignals}
                    onCheckedChange={value =>
                      setForm(prev => ({ ...prev, includePerformanceSignals: value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional guidance</Label>
                <Textarea
                  value={form.additionalNotes}
                  onChange={event => setForm(prev => ({ ...prev, additionalNotes: event.target.value }))}
                  rows={3}
                  placeholder="Compliance reminders, voice guidelines, competitor considerations..."
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Landing pages already prepared</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {selectedAccounts.map(account => (
                      <Badge key={account.id} variant="outline">{account.landingPage.asset}</Badge>
                    ))}
                  </div>
                </div>
                <Target className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
            <div className="flex items-center justify-between border-t bg-muted/40 px-6 py-4">
              <div className="text-xs text-muted-foreground">
                Need to restart later? Your selections autosave to the project brief.
              </div>
              <Button onClick={() => setCurrentStep(1)} disabled={!canContinueFromBrief} className="gap-2">
                Continue to AI generation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="h-4 w-4 text-primary" /> Persona guidance
                </CardTitle>
                <CardDescription>{selectedPersona.elevatorPitch}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedPersona.focusPoints.map(point => (
                  <div key={point} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{point}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">Project context</CardTitle>
                <CardDescription>
                  {projectOptions.find(project => project.id === form.projectId)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback>
                      {projectOptions
                        .find(project => project.id === form.projectId)
                        ?.manager.split(" ")
                        .map(part => part[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {projectOptions.find(project => project.id === form.projectId)?.manager}
                    </p>
                    <p>Campaign Manager</p>
                  </div>
                </div>
                <Separator />
                <ul className="space-y-2">
                  <li>Due date: {projectOptions.find(project => project.id === form.projectId)?.dueDate}</li>
                  <li>Client: {projectOptions.find(project => project.id === form.projectId)?.client}</li>
                  <li>QA owner: Taylor Chen</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {currentStep === 1 && (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="border-primary/20">
            <CardHeader className="space-y-1">
              <CardTitle>Generation controls</CardTitle>
              <CardDescription>
                Finalise AI parameters before producing variants for each account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={form.tone} onValueChange={value => setForm(prev => ({ ...prev, tone: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultative">Consultative</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Variant count per account</Label>
                  <Slider
                    min={1}
                    max={4}
                    step={1}
                    value={[form.variantCount]}
                    onValueChange={([value]) => setForm(prev => ({ ...prev, variantCount: value }))}
                  />
                  <p className="text-xs text-muted-foreground">{form.variantCount} per account</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Accounts</p>
                  <p className="text-2xl font-semibold">{selectedAccountIds.length}</p>
                  <p className="text-xs text-muted-foreground">Will receive personalised variants</p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Persona</p>
                  <p className="text-2xl font-semibold">{selectedPersona.label}</p>
                  <p className="text-xs text-muted-foreground">Signals sourced from CRM + QA</p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Landing pages</p>
                  <p className="text-2xl font-semibold">{selectedAccountIds.length}</p>
                  <p className="text-xs text-muted-foreground">Prefilled for each account</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Include account insights</Label>
                  <p className="text-xs text-muted-foreground">Industry, revenue, initiative context.</p>
                </div>
                <Switch
                  checked={form.includeAccountInsights}
                  onCheckedChange={value => setForm(prev => ({ ...prev, includeAccountInsights: value }))}
                />
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Include persona insights</Label>
                  <p className="text-xs text-muted-foreground">Tone, focus areas, proof points.</p>
                </div>
                <Switch
                  checked={form.includePersonaInsights}
                  onCheckedChange={value => setForm(prev => ({ ...prev, includePersonaInsights: value }))}
                />
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Performance overlays</Label>
                  <p className="text-xs text-muted-foreground">Confidence scoring based on past campaigns.</p>
                </div>
                <Switch
                  checked={form.includePerformanceSignals}
                  onCheckedChange={value => setForm(prev => ({ ...prev, includePerformanceSignals: value }))}
                />
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <p className="text-xs uppercase text-muted-foreground">AI prompt</p>
                <p className="mt-2 text-muted-foreground">
                  We will combine your brief with CRM data, campaign intelligence, and landing page metadata. Human approval
                  remains mandatory.
                </p>
              </div>
            </CardContent>
            <div className="flex items-center justify-between border-t bg-muted/40 px-6 py-4">
              <Button variant="ghost" className="gap-2" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="h-4 w-4" /> Back to brief
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating templates...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate templates
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">Landing page readiness</CardTitle>
              <CardDescription>Prefilled assets linked to each account for fast launch.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {selectedAccounts.map(account => (
                <div key={account.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.landingPage.url}</p>
                    </div>
                    <Badge variant="outline">{account.landingPage.conversionsLast30} conversions · 30d</Badge>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-sm font-medium">{account.landingPage.headline}</p>
                  <p className="text-xs text-muted-foreground">Featured asset: {account.landingPage.asset}</p>
                  <p className="text-xs text-muted-foreground">Last updated {account.landingPage.updatedAt}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {currentStep === 2 && (
        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card className="border-primary/20">
            <CardHeader className="space-y-1">
              <CardTitle>QA review</CardTitle>
              <CardDescription>
                Confirm compliance, note edits, and approve the template variants for launch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {qaChecklist.map(item => (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition", 
                      qaState[item.id] ? "border-emerald-500/60 bg-emerald-500/10" : "hover:border-primary/40"
                    )}
                  >
                    <Checkbox
                      checked={qaState[item.id]}
                      onCheckedChange={value => handleQaChange(item.id, value as boolean)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <Label>QA notes & feedback</Label>
                <Textarea
                  value={qaNotes}
                  onChange={event => setQaNotes(event.target.value)}
                  rows={4}
                  placeholder="Document tone edits, compliance flags, or follow-up actions for the AI learning loop."
                />
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Approval summary</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Accounts covered</p>
                    <p className="text-base font-semibold">{generatedAccounts.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total variants</p>
                    <p className="text-base font-semibold">
                      {generatedAccounts.reduce((count, account) => count + account.templates.length, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence range</p>
                    <p className="text-base font-semibold">
                      {generatedAccounts
                        .flatMap(account => account.templates)
                        .map(template => template.confidence)
                        .reduce((range, value) => {
                          const [min, max] = range;
                          return [Math.min(min, value), Math.max(max, value)];
                        }, [1, 0])
                        .map(formatConfidence)
                        .join(" – ")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 px-6 py-4">
              <Button variant="ghost" onClick={resetToSetup} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Start over
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => toast({ title: "Sent back", description: "Marked for more edits from content team." })}
                >
                  Request edits
                </Button>
                <Button onClick={handleApprove} className="gap-2">
                  <ShieldCheck className="h-4 w-4" /> Approve templates
                </Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">Template variants</CardTitle>
              <CardDescription>Review account-specific drafts, copy, and confirm confidence scores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Generate templates first to review QA details here.
                </div>
              ) : (
                <Tabs value={selectedAccountTemplates?.accountId} onValueChange={setSelectedAccountId}>
                  <TabsList className="flex w-full flex-wrap justify-start gap-2">
                    {generatedAccounts.map(account => (
                      <TabsTrigger key={account.accountId} value={account.accountId} className="text-xs">
                        {account.accountName}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {generatedAccounts.map(account => (
                    <TabsContent key={account.accountId} value={account.accountId} className="mt-4 space-y-4">
                      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                        <ScrollArea className="h-[360px] rounded-md border">
                          <div className="space-y-1 p-2">
                            {account.templates.map(template => (
                              <button
                                key={template.id}
                                onClick={() => setSelectedVariantId(template.id)}
                                className={cn(
                                  "w-full rounded-md border p-3 text-left text-sm transition",
                                  selectedVariant?.id === template.id
                                    ? "border-primary bg-primary/10"
                                    : "border-transparent hover:border-primary/40"
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium text-foreground">{template.subject}</p>
                                  <Badge variant="outline">{formatConfidence(template.confidence)}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{template.preheader}</p>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>

                        {selectedVariant ? (
                          <div className="flex h-[360px] flex-col rounded-md border bg-muted/30">
                            <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
                              <div>
                                <p className="font-medium text-foreground">{selectedVariant.subject}</p>
                                <p className="text-xs text-muted-foreground">Tone: {selectedVariant.tone}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopyVariant}>
                                <ClipboardCopy className="h-4 w-4" /> Copy
                              </Button>
                            </div>
                            <ScrollArea className="flex-1">
                              <div className="space-y-4 p-4 text-sm">
                                <div>
                                  <p className="font-medium text-foreground">Preheader</p>
                                  <p className="text-muted-foreground">{selectedVariant.preheader}</p>
                                </div>
                                <Separator />
                                <div className="whitespace-pre-wrap rounded-md bg-background p-3 text-sm text-foreground shadow-sm">
                                  {selectedVariant.body}
                                </div>
                                <Separator />
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <p className="text-xs uppercase text-muted-foreground">Highlights</p>
                                    <ul className="mt-2 space-y-1 text-sm">
                                      {selectedVariant.highlights.map(item => (
                                        <li key={item} className="flex items-start gap-2">
                                          <Sparkles className="mt-0.5 h-3.5 w-3.5 text-primary" />
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase text-muted-foreground">Recommended next actions</p>
                                    <ul className="mt-2 space-y-1 text-sm">
                                      {selectedVariant.recommendations.map(item => (
                                        <li key={item} className="flex items-start gap-2">
                                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-primary" />
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs uppercase text-muted-foreground">Predicted engagement</p>
                                  <div className="mt-1 flex items-center gap-3">
                                    <Progress value={selectedVariant.confidence * 100} className="h-2" />
                                    <span className="text-xs font-medium text-foreground">
                                      {formatConfidence(selectedVariant.confidence)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </ScrollArea>
                          </div>
                        ) : (
                          <div className="flex h-[360px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                            Select a variant to preview.
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
            {isApproved && (
              <div className="border-t bg-emerald-500/10 px-6 py-4 text-sm text-emerald-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Approved for campaign and logged for learning.
                </div>
                <Button
                  className="mt-3"
                  variant="secondary"
                  onClick={() => setLocation("/campaigns/email")}
                >
                  Open email campaigns
                </Button>
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
