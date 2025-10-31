import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Sparkles,
  Layers,
  FileText,
  Filter,
  Users,
  ArrowLeft,
  Workflow,
  ShieldCheck,
  UploadCloud,
  Star,
  Wand2,
  BarChart3,
  Check,
  Clock,
  AlertCircle,
  Gauge,
  RefreshCw,
  Copy,
  Calendar,
  Database,
  MessageSquare,
  ArrowRight,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const projects = [
  {
    id: "proj_tech",
    name: "Q4 ABM Campaign – Tech Segment",
    clients: ["Pivotal HQ", "Vanguard Cloud", "Northwind AI"],
    launchDate: "2025-01-15",
  },
  {
    id: "proj_manufacturing",
    name: "C-Suite Manufacturing Expansion",
    clients: ["Fabricon", "MetalWorks", "Atlas Robotics"],
    launchDate: "2025-02-02",
  },
  {
    id: "proj_health",
    name: "Healthcare Revenue Acceleration",
    clients: ["CureTech", "Vitalis", "Medisphere"],
    launchDate: "2025-03-10",
  },
];

const personas = [
  { id: "cxo", label: "C-Suite", tone: "Visionary, concise" },
  { id: "vp", label: "VP / Director", tone: "Strategic, ROI-focused" },
  { id: "manager", label: "Manager", tone: "Operational, action-oriented" },
  { id: "practitioner", label: "Practitioner", tone: "Detailed, how-to" },
];

const tones = [
  { id: "consultative", label: "Consultative", description: "Advisory tone that guides the reader" },
  { id: "authoritative", label: "Authoritative", description: "Confident tone for executive audiences" },
  { id: "warm", label: "Warm", description: "Friendly, human-first approach" },
  { id: "energetic", label: "Energetic", description: "High-energy product launches" },
];

const initialInputs = {
  projectId: projects[0].id,
  campaignGoal: "Webinar Invite for AI Ops Leaders",
  tone: "consultative",
  variantCount: 3,
  includeAccountInsights: true,
  includePersonaInsights: true,
  includePerformanceSignals: true,
  keyMessage: "Showcase how our AI-powered orchestration accelerates outbound personalization for enterprise revenue teams.",
  cta: "Book a Strategy Call",
  additionalNotes:
    "Highlight existing integrations with Salesforce and Dynamics. Reinforce compliance posture and human-in-the-loop safeguards.",
};

const qaChecklist = [
  "Tone aligned with project guidelines",
  "Compliance (CAN-SPAM/GDPR) checks",
  "Dynamic fields validated",
  "No sensitive or restricted claims",
  "CTA approved by campaign owner",
  "Links and tracking parameters verified",
];

const dataSources = [
  { label: "Industry", value: "Software & Cloud", impact: "Tailors opening value proposition" },
  { label: "Last Engagement", value: "Product demo 14 days ago", impact: "References existing momentum" },
  { label: "Lead Stage", value: "Evaluation", impact: "Triggers mid-funnel nurture tone" },
  { label: "Firmographic", value: "$850M ARR, 2.4k employees", impact: "Positions enterprise-grade messaging" },
  { label: "QA Insights", value: "Prefers consultative approach", impact: "Personalizes closing statement" },
];

const feedbackLabels = [
  "On-brand",
  "Needs punchier CTA",
  "Too technical",
  "Great personalization",
  "Tone mismatch",
  "Compliance flagged",
];

type TemplateVariant = {
  id: string;
  subject: string;
  tone: string;
  confidence: number;
  persona: string;
  body: string;
};

const generateMockVariants = (persona: string, tone: string, cta: string, count: number): TemplateVariant[] => {
  const personaLabel = personas.find(item => item.id === persona)?.label || "Persona";
  const toneLabel = tones.find(item => item.id === tone)?.label || tone;
  const base = [
    {
      intro: "We’ve been following your expansion into AI-powered customer journeys",
      insight: "teams like yours are prioritizing orchestrated engagement across marketing and revenue",
    },
    {
      intro: "Your recent growth in enterprise pipeline stood out to our strategy team",
      insight: "revenue leaders in cloud software are shifting toward account-based experiences that feel bespoke",
    },
    {
      intro: "We analyzed your latest product updates and partner initiatives",
      insight: "top-performing GTM teams are pairing data-led insights with human-reviewed outreach",
    },
  ];

  return Array.from({ length: count }).map((_, index) => ({
    id: `variant-${index + 1}`,
    persona: personaLabel,
    tone: toneLabel,
    confidence: 0.84 + index * 0.04,
    subject: `${personaLabel} | ${toneLabel} path to higher engagement`,
    body: `Hi {{Contact.FirstName}},\n\n${base[index % base.length].intro}.${
      tone === "authoritative"
        ? ""
        : ""} We built a blueprint that shows how ${personaLabel.toLowerCase()} teams ${base[index % base.length].insight}.\n\nWhy it matters now:\n• Activates intent data + CRM signals with zero heavy lift\n• Applies guardrails your compliance team already approved\n• Keeps humans in control with QA-ready workflows\n\n${cta ? `${cta} →` : "Let’s open up the conversation."}\n\nPivotal ABM Studio`,
  }));
};

export default function AITemplateWizardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formState, setFormState] = useState(initialInputs);
  const [persona, setPersona] = useState(personas[0].id);
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedVariant, setSelectedVariant] = useState("variant-1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<TemplateVariant[]>(() =>
    generateMockVariants(persona, formState.tone, formState.cta, formState.variantCount),
  );
  const [qaSignals, setQaSignals] = useState(
    Object.fromEntries(qaChecklist.map(item => [item, item !== "Compliance (CAN-SPAM/GDPR) checks"])),
  );
  const [qaRating, setQaRating] = useState(4.6);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>(["Great personalization"]);

  const currentVariant = useMemo(
    () => variants.find(variant => variant.id === selectedVariant) ?? variants[0],
    [selectedVariant, variants],
  );

  const selectedProject = useMemo(
    () => projects.find(project => project.id === formState.projectId) ?? projects[0],
    [formState.projectId],
  );

  const handleFormChange = <K extends keyof typeof initialInputs>(key: K, value: (typeof initialInputs)[K]) => {
    setFormState(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const regenerateVariants = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const nextVariants = generateMockVariants(persona, formState.tone, formState.cta, formState.variantCount);
      setVariants(nextVariants);
      setSelectedVariant(nextVariants[0]?.id ?? "variant-1");
      setIsGenerating(false);
      toast({
        title: "Templates refreshed",
        description: `${nextVariants.length} tailored variants generated for ${selectedProject.name}.`,
      });
    }, 900);
  };

  const approveSelectedVariant = () => {
    toast({
      title: "Variant approved",
      description: "Template promoted to campaign library and ready for send.",
    });
  };

  const copyVariantToClipboard = () => {
    if (!currentVariant) return;
    navigator.clipboard.writeText(`${currentVariant.subject}\n\n${currentVariant.body}`);
    toast({
      title: "Template copied",
      description: "Variant copied to clipboard for quick collaboration.",
    });
  };

  const toggleQaSignal = (label: string) => {
    setQaSignals(prev => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const toggleFeedback = (label: string) => {
    setSelectedFeedback(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label],
    );
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-50">
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_55%)]" />
        <div className="relative z-10 flex items-center justify-between gap-6 px-6 py-8">
          <div className="flex items-start gap-4">
            <Button variant="secondary" size="icon" className="bg-white/10 text-white hover:bg-white/20" onClick={() => setLocation("/campaigns")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <Badge className="bg-cyan-500/20 text-cyan-200">AI + Human</Badge>
                <Badge className="bg-emerald-500/15 text-emerald-200">Account-Based</Badge>
                <Badge className="bg-indigo-500/15 text-indigo-200">Version 1.3</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">AI Template Wizard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">Generate account-personalized email templates blending CRM intelligence, campaign objectives, and human-guided tone controls. Every variant stays review-ready for QA and compliance teams.</p>
            </div>
          </div>
          <div className="hidden shrink-0 flex-col items-end sm:flex">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current project</p>
            <p className="mt-2 text-right text-lg font-medium text-white">{selectedProject.name}</p>
            <p className="text-sm text-slate-400">Launch window · {selectedProject.launchDate}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 pb-10 pt-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800/60 text-slate-200 md:w-auto">
                <TabsTrigger value="generate" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                  <Sparkles className="mr-2 h-4 w-4" /> Generate
                </TabsTrigger>
                <TabsTrigger value="qa" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                  <ShieldCheck className="mr-2 h-4 w-4" /> QA & Approve
                </TabsTrigger>
                <TabsTrigger value="insights" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                  <BarChart3 className="mr-2 h-4 w-4" /> Performance
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-3">
                <Button variant="outline" className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800" onClick={copyVariantToClipboard}>
                  <Copy className="mr-2 h-4 w-4" /> Copy Variant
                </Button>
                <Button className="bg-cyan-500 text-slate-900 hover:bg-cyan-400" onClick={approveSelectedVariant}>
                  <Check className="mr-2 h-4 w-4" /> Approve Variant
                </Button>
              </div>
            </div>
            <TabsContent value="generate" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                          <Layers className="h-4 w-4 text-cyan-400" /> Campaign Context
                        </CardTitle>
                        <CardDescription className="mt-1 text-slate-300">Connect the AI engine with project, audience, and messaging controls.</CardDescription>
                      </div>
                      <Badge variant="outline" className="border-cyan-500 text-cyan-300">Step 1</Badge>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-slate-200">Project</Label>
                          <Select value={formState.projectId} onValueChange={value => handleFormChange("projectId", value)}>
                            <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 text-slate-100">
                              {projects.map(project => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-200">Launch Window</Label>
                          <Input
                            value={selectedProject.launchDate}
                            readOnly
                            className="border-slate-700 bg-slate-900 text-slate-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">Campaign Goal</Label>
                        <Input
                          value={formState.campaignGoal}
                          onChange={event => handleFormChange("campaignGoal", event.target.value)}
                          className="border-slate-700 bg-slate-900 text-slate-100"
                          placeholder="e.g. Drive webinar registrations for AI operations leaders"
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-slate-200">Tone & Style</Label>
                          <Select
                            value={formState.tone}
                            onValueChange={value => handleFormChange("tone", value)}
                          >
                            <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100">
                              <SelectValue placeholder="Select tone" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 text-slate-100">
                              {tones.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  <div className="flex flex-col">
                                    <span>{item.label}</span>
                                    <span className="text-xs text-slate-400">{item.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-200">Persona Focus</Label>
                          <Select value={persona} onValueChange={value => setPersona(value)}>
                            <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100">
                              <SelectValue placeholder="Select persona" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 text-slate-100">
                              {personas.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  <div className="flex flex-col">
                                    <span>{item.label}</span>
                                    <span className="text-xs text-slate-400">{item.tone}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-slate-200">Variant Count</Label>
                          <Slider
                            value={[formState.variantCount]}
                            min={2}
                            max={6}
                            step={1}
                            onValueChange={([value]) => handleFormChange("variantCount", value)}
                            className="mt-2"
                          />
                          <p className="text-sm text-slate-400">
                            {formState.variantCount} tailored variants per account will be generated.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-200">Call-To-Action</Label>
                          <Input
                            value={formState.cta}
                            onChange={event => handleFormChange("cta", event.target.value)}
                            className="border-slate-700 bg-slate-900 text-slate-100"
                            placeholder="Book a strategy session"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">Key Value Proposition</Label>
                        <Textarea
                          value={formState.keyMessage}
                          onChange={event => handleFormChange("keyMessage", event.target.value)}
                          rows={3}
                          className="border-slate-700 bg-slate-900 text-slate-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">Additional Guidance</Label>
                        <Textarea
                          value={formState.additionalNotes}
                          onChange={event => handleFormChange("additionalNotes", event.target.value)}
                          rows={3}
                          className="border-slate-700 bg-slate-900 text-slate-100"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <ToggleInsight
                          title="Account Insights"
                          description="Industry, firmographics, recent activity"
                          icon={Database}
                          active={formState.includeAccountInsights}
                          onChange={value => handleFormChange("includeAccountInsights", value)}
                        />
                        <ToggleInsight
                          title="Persona Signals"
                          description="Role-specific tone adjustments"
                          icon={Users}
                          active={formState.includePersonaInsights}
                          onChange={value => handleFormChange("includePersonaInsights", value)}
                        />
                        <ToggleInsight
                          title="Performance Data"
                          description="Open/click probability, QA score"
                          icon={Gauge}
                          active={formState.includePerformanceSignals}
                          onChange={value => handleFormChange("includePerformanceSignals", value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <Button
                          className="bg-cyan-500 text-slate-900 hover:bg-cyan-400"
                          onClick={regenerateVariants}
                          disabled={isGenerating}
                        >
                          <Wand2 className={cn("mr-2 h-4 w-4", isGenerating && "animate-spin")}
                          />
                          {isGenerating ? "Generating" : "Generate Templates"}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800"
                        >
                          <Workflow className="mr-2 h-4 w-4" />
                          Save as Blueprint
                        </Button>
                        <Button
                          variant="outline"
                          className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800"
                        >
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Export JSON
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                          <FileText className="h-4 w-4 text-cyan-400" /> Template Variants
                        </CardTitle>
                        <CardDescription className="mt-1 text-slate-300">
                          Review AI-generated drafts with transparency into data usage and predicted performance.
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="border-cyan-500 text-cyan-300">Step 2</Badge>
                    </CardHeader>
                    <CardContent className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                      <ScrollArea className="h-[420px] rounded-lg border border-slate-800/70 bg-slate-900/60">
                        <div className="divide-y divide-slate-800/80">
                          {variants.map(variant => (
                            <button
                              key={variant.id}
                              onClick={() => setSelectedVariant(variant.id)}
                              className={cn(
                                "w-full px-5 py-4 text-left transition",
                                selectedVariant === variant.id
                                  ? "bg-cyan-500/15 text-white"
                                  : "hover:bg-slate-800/60"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-100">{variant.subject}</p>
                                  <p className="mt-1 text-xs uppercase tracking-wide text-cyan-200">
                                    {variant.persona} • {variant.tone}
                                  </p>
                                </div>
                                <Badge className="bg-emerald-500/20 text-emerald-200">
                                  Confidence {Math.round(variant.confidence * 100)}%
                                </Badge>
                              </div>
                              <p className="mt-3 line-clamp-3 text-sm text-slate-300 whitespace-pre-line">
                                {variant.body}
                              </p>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="flex h-full flex-col gap-4">
                        <Card className="h-full border border-slate-800/80 bg-slate-950">
                          <CardHeader className="border-b border-slate-800/80 bg-slate-950/40">
                            <CardTitle className="flex items-center gap-2 text-white">
                              <Sparkles className="h-4 w-4 text-cyan-400" />
                              Variant preview
                            </CardTitle>
                            <CardDescription className="text-slate-300">
                              Includes merge tags and contextual personalization.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-6">
                            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
                              <span className="flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5 text-cyan-300" />
                                Persona: {currentVariant?.persona}
                              </span>
                              <span className="flex items-center gap-2">
                                <Target className="h-3.5 w-3.5 text-cyan-300" /> Tone: {currentVariant?.tone}
                              </span>
                              <span className="flex items-center gap-2">
                                <Star className="h-3.5 w-3.5 text-amber-300" />
                                Confidence: {currentVariant ? Math.round(currentVariant.confidence * 100) : 0}%
                              </span>
                            </div>
                            <div className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-4 text-sm text-slate-100">
                              <p className="text-cyan-300">{currentVariant?.subject}</p>
                              <Separator className="my-4 border-slate-800/70" />
                              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-100">
                                {currentVariant?.body}
                              </pre>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <ContextTag icon={Calendar} label="Campaign Goal" value={formState.campaignGoal} />
                              <ContextTag icon={Users} label="Persona" value={currentVariant?.persona ?? ""} />
                              <ContextTag icon={Filter} label="Tone" value={currentVariant?.tone ?? ""} />
                              <ContextTag icon={Gauge} label="Performance Signal" value="92% open lift vs. baseline" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border border-slate-800/80 bg-slate-950/80">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm text-slate-200">
                              <AlertCircle className="h-4 w-4 text-amber-300" /> Data used for this variant
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {dataSources.map(source => (
                              <div
                                key={source.label}
                                className="flex items-start justify-between gap-4 rounded-md border border-slate-800/70 bg-slate-900/60 p-3"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-100">{source.label}</p>
                                  <p className="text-xs text-slate-400">{source.impact}</p>
                                </div>
                                <Badge className="bg-slate-800 text-slate-200">{source.value}</Badge>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg text-white">
                        <Workflow className="h-4 w-4 text-cyan-400" /> Generation Timeline
                      </CardTitle>
                      <CardDescription className="text-slate-300">
                        Track how the AI engine orchestrates data ingestion, drafting, and approvals.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <TimelineItem
                        title="Context assembled"
                        time="0.4s"
                        description="Campaign brief merged with CRM account + persona clusters."
                        badge="CRM + Campaign Data"
                      />
                      <TimelineItem
                        title="Variants scored"
                        time="1.2s"
                        description="LLM generated drafts and ranked confidence based on engagement model."
                        badge="AI Template Engine"
                      />
                      <TimelineItem
                        title="QA package prepared"
                        time="0.3s"
                        description="Structured JSON output created with audit trail + compliance context."
                        badge="Human Review"
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg text-white">
                        <ShieldCheck className="h-4 w-4 text-cyan-400" /> QA Checklist Snapshot
                      </CardTitle>
                      <CardDescription className="text-slate-300">
                        QA will inherit these checkpoints for final approval.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {qaChecklist.map(item => (
                        <label
                          key={item}
                          className="flex items-start gap-3 rounded-md border border-slate-800/70 bg-slate-900/60 p-3"
                        >
                          <Switch
                            checked={qaSignals[item]}
                            onCheckedChange={() => toggleQaSignal(item)}
                            className="mt-0.5"
                          />
                          <span className="text-sm text-slate-200">{item}</span>
                        </label>
                      ))}
                    </CardContent>
                    <CardFooter className="flex flex-col items-start gap-2 text-sm text-slate-400">
                      <p>Compliance checks auto-run using the campaign compliance scanner.</p>
                      <Button
                        variant="ghost"
                        className="px-0 text-cyan-300 hover:text-cyan-200"
                        onClick={() => setActiveTab("qa")}
                      >
                        Jump to QA workflow
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg text-white">
                        <Users className="h-4 w-4 text-cyan-400" /> Collaboration Feed
                      </CardTitle>
                      <CardDescription className="text-slate-300">
                        Human reviewers leave guidance that feeds the learning loop.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedProject.clients.map(client => (
                        <div key={client} className="flex items-center gap-3 rounded-md border border-slate-800/70 bg-slate-900/60 p-3">
                          <Avatar className="h-8 w-8 bg-cyan-500/20 text-cyan-200">
                            <AvatarFallback>{client.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-100">{client}</p>
                            <p className="text-xs text-slate-400">
                              Reviewed similar assets last week · Provided tone calibration feedback.
                            </p>
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-200">QA ready</Badge>
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter className="text-xs text-slate-400">
                      Feedback captured here routes to the ai_feedback table for future training.
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qa" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg text-white">
                        <ShieldCheck className="h-4 w-4 text-cyan-400" /> QA Review Workspace
                      </CardTitle>
                      <CardDescription className="text-slate-300">
                        Confirm tone alignment, compliance, and audit trail before approving.
                      </CardDescription>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-200">Human in control</Badge>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-5">
                      <h3 className="text-sm font-medium uppercase tracking-widest text-slate-400">Selected Variant</h3>
                      <p className="mt-3 text-lg font-semibold text-white">{currentVariant?.subject}</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <ContextTag icon={Sparkles} label="Confidence score" value={`${currentVariant ? Math.round(currentVariant.confidence * 100) : 0}%`} />
                        <ContextTag icon={Clock} label="Generated" value="A few seconds ago" />
                        <ContextTag icon={Filter} label="Tone" value={currentVariant?.tone ?? ""} />
                        <ContextTag icon={Users} label="Persona" value={currentVariant?.persona ?? ""} />
                      </div>
                      <Separator className="my-6 border-slate-800/70" />
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-100">
                        {currentVariant?.body}
                      </pre>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="border border-slate-800/70 bg-slate-900/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-sm text-slate-200">
                            <AlertCircle className="h-4 w-4 text-amber-300" /> QA Score
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Slider
                            value={[qaRating]}
                            onValueChange={([value]) => setQaRating(value)}
                            min={1}
                            max={5}
                            step={0.1}
                            className="mt-3"
                          />
                          <p className="text-sm text-slate-300">
                            QA Rating: <span className="font-semibold text-white">{qaRating.toFixed(1)}</span> / 5.0
                          </p>
                          <p className="text-xs text-slate-400">
                            Ratings sync with <code>ai_feedback</code> to fine-tune the engagement model.
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-800/70 bg-slate-900/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-sm text-slate-200">
                            <MessageSquare className="h-4 w-4 text-cyan-300" /> Feedback Tags
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          {feedbackLabels.map(label => (
                            <Badge
                              key={label}
                              onClick={() => toggleFeedback(label)}
                              className={cn(
                                "cursor-pointer border border-slate-700 bg-slate-900 text-slate-200",
                                selectedFeedback.includes(label) && "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                              )}
                            >
                              {label}
                            </Badge>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-slate-200">QA Notes</Label>
                      <Textarea
                        rows={4}
                        placeholder="Summarize final adjustments or escalation notes."
                        className="border-slate-700 bg-slate-900 text-slate-100"
                      />
                      <div className="flex flex-wrap gap-4">
                        <Button className="bg-emerald-500 text-slate-900 hover:bg-emerald-400">
                          <Check className="mr-2 h-4 w-4" /> Approve & publish
                        </Button>
                        <Button variant="outline" className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800">
                          <RefreshCw className="mr-2 h-4 w-4" /> Request regeneration
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <Layers className="h-4 w-4 text-cyan-400" /> Audit & Data Lineage
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Full transparency across inputs, transformations, and outputs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <AuditRow
                      icon={Sparkles}
                      title="AI Template Engine"
                      description="Model version 1.3.7 · Temperature 0.4 · Top-p 0.9"
                      meta="ai_generation_logs"
                    />
                    <AuditRow
                      icon={Database}
                      title="Data Features"
                      description="industry, lead_stage, last_engagement, recent_campaign"
                      meta="email_templates.data_features"
                    />
                    <AuditRow
                      icon={Users}
                      title="Human approvals"
                      description="Reviewed by QA · Approved by Campaign Owner"
                      meta="approved_by"
                    />
                    <AuditRow
                      icon={ShieldCheck}
                      title="Compliance Scanner"
                      description="CAN-SPAM, GDPR, Sensitive language, CTA guardrails"
                      meta="compliance_scan_log"
                    />
                    <AuditRow
                      icon={BarChart3}
                      title="Predicted performance"
                      description="Open rate uplift +24%, CTR uplift +18%, Fit score 91%"
                      meta="confidence_score"
                    />
                  </CardContent>
                  <CardFooter className="text-xs text-slate-400">
                    Approvals create an immutable audit record linking prompts, outputs, and QA decisions.
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <MetricCard
                  title="Open rate lift"
                  value="+24%"
                  description="vs. manual templates"
                  progress={72}
                />
                <MetricCard
                  title="CTA engagement"
                  value="+18%"
                  description="Based on human-only clicks"
                  progress={58}
                />
                <MetricCard
                  title="QA satisfaction"
                  value="4.7 / 5"
                  description="Average QA rating last 30 days"
                  progress={94}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <BarChart3 className="h-4 w-4 text-cyan-400" /> Tone vs. Performance
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Compare how tone selections impact engagement across personas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tones.map((tone, index) => (
                      <div key={tone.id} className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-100">{tone.label}</p>
                            <p className="text-xs text-slate-400">{tone.description}</p>
                          </div>
                          <Badge className="bg-cyan-500/20 text-cyan-100">Top persona: {personas[index % personas.length].label}</Badge>
                        </div>
                        <Progress value={65 + index * 7} className="mt-3 bg-slate-800" />
                        <p className="mt-2 text-xs text-slate-400">
                          Engagement index: <span className="text-white">{85 + index * 3}</span> · Confidence ±{4 - index}%
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <Users className="h-4 w-4 text-cyan-400" /> Persona Highlights
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Quickly spot which personas respond best to the AI variants.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {personas.map((personaOption, index) => (
                      <div key={personaOption.id} className="flex items-center gap-3 rounded-md border border-slate-800/70 bg-slate-900/60 p-3">
                        <Avatar className="h-10 w-10 bg-cyan-500/20 text-cyan-200">
                          <AvatarFallback>{personaOption.label.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-100">{personaOption.label}</p>
                          <p className="text-xs text-slate-400">{personaOption.tone}</p>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <p className="text-sm font-semibold text-cyan-200">{92 - index}% CTR</p>
                          <p>Confidence {Math.max(80 - index * 3, 70)}%</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <BarChart3 className="h-4 w-4 text-cyan-400" /> Learning Loop Summary
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Engagement metrics reinvested into model tuning for the next generation cycle.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <LearningStat label="Model updates" value="Nightly" description="Batch retraining with validated engagement data." />
                  <LearningStat label="Signals captured" value="38" description="Features logged per template in data_features." />
                  <LearningStat label="Feedback coverage" value="87%" description="Templates with QA + marketer commentary." />
                </CardContent>
                <CardFooter className="text-xs text-slate-400">
                  All insights stay tenant-scoped with anonymized aggregates powering global improvements.
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface ToggleInsightProps {
  title: string;
  description: string;
  icon: LucideIcon;
  active: boolean;
  onChange: (value: boolean) => void;
}

function ToggleInsight({ title, description, icon: Icon, active, onChange }: ToggleInsightProps) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-cyan-500/15 p-2 text-cyan-200">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-100">{title}</p>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </div>
        <Switch checked={active} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

interface TimelineItemProps {
  title: string;
  time: string;
  description: string;
  badge: string;
}

function TimelineItem({ title, time, description, badge }: TimelineItemProps) {
  return (
    <div className="relative flex gap-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
      <div className="absolute -left-5 top-6 hidden h-12 w-px bg-gradient-to-b from-cyan-500/40 to-transparent lg:block" />
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-200">
        <Clock className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-white">{title}</p>
          <Badge className="bg-slate-800 text-slate-200">{badge}</Badge>
          <span className="text-xs text-slate-400">{time}</span>
        </div>
        <p className="mt-2 text-sm text-slate-300">{description}</p>
      </div>
    </div>
  );
}

interface ContextTagProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function ContextTag({ icon: Icon, label, value }: ContextTagProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-800/70 bg-slate-900/70 p-3">
      <span className="rounded-full bg-slate-800/80 p-2 text-cyan-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="text-xs text-slate-400">
        <p className="uppercase tracking-widest">{label}</p>
        <p className="mt-1 text-sm text-slate-100">{value}</p>
      </div>
    </div>
  );
}

interface AuditRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  meta: string;
}

function AuditRow({ icon: Icon, title, description, meta }: AuditRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-800/70 bg-slate-900/60 p-4">
      <span className="rounded-lg bg-cyan-500/15 p-2 text-cyan-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <Badge className="bg-slate-800 text-slate-200">{meta}</Badge>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  progress: number;
}

function MetricCard({ title, value, description, progress }: MetricCardProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-200">{title}</CardTitle>
        <CardDescription className="text-xs text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-2xl font-semibold text-white">{value}</p>
        <Progress value={progress} className="bg-slate-800" />
      </CardContent>
    </Card>
  );
}

interface LearningStatProps {
  label: string;
  value: string;
  description: string;
}

function LearningStat({ label, value, description }: LearningStatProps) {
  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </div>
  );
}
