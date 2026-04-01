import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertySelector } from "@/components/PropertySelector";
import { toast } from "sonner";
import { Brain, Sparkles, Copy, Check, Lock, ArrowUpRight, RefreshCw, History } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

const GUEST_TYPES = [
  { value: "general", label: "General Travelers" },
  { value: "families", label: "Families with Kids" },
  { value: "couples", label: "Couples / Romantic" },
  { value: "business", label: "Business Travelers" },
  { value: "outdoor", label: "Outdoor Enthusiasts" },
  { value: "event_goers", label: "Event Attendees" },
  { value: "groups", label: "Groups & Friends" },
];

export default function ListingOptimizer() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [guestType, setGuestType] = useState("general");
  const [features, setFeatures] = useState("");
  const [focusEvents, setFocusEvents] = useState("");
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [, navigate] = useLocation();

  const { data: properties = [] } = trpc.property.list.useQuery();
  const { data: subData } = trpc.subscription.get.useQuery();

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const utils = trpc.useUtils();

  const { data: suggestions = [], isLoading: loadingSuggestions } = trpc.listing.getSuggestions.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );

  const generate = trpc.listing.generate.useMutation({
    onSuccess: () => {
      toast.success("AI listing generated!");
      utils.listing.getSuggestions.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markApplied = trpc.listing.markApplied.useMutation({
    onSuccess: () => {
      toast.success("Marked as applied");
      utils.listing.getSuggestions.invalidate();
    },
  });

  const tier = subData?.tier || "free";
  const isLocked = tier === "free";

  const latestSuggestion = suggestions[0];

  const handleGenerate = () => {
    if (!selectedPropertyId) return;
    generate.mutate({
      propertyId: selectedPropertyId,
      guestType,
      focusEvents: focusEvents.split(",").map(e => e.trim()).filter(Boolean),
      propertyFeatures: features.split(",").map(f => f.trim()).filter(Boolean),
    });
  };

  const copyToClipboard = async (text: string, type: "title" | "desc") => {
    await navigator.clipboard.writeText(text);
    if (type === "title") {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } else {
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 2000);
    }
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Listing Optimizer</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Generate compelling titles and descriptions for your listings</p>
        </div>
        <PropertySelector value={selectedPropertyId} onChange={setSelectedPropertyId} />
      </div>

      {/* Locked state for free tier */}
      {isLocked && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Listing Optimizer</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Generate AI-powered listing titles and descriptions tailored to upcoming events and your target guest type. Available on Pro and Advanced plans.
            </p>
            <Button onClick={() => navigate("/subscription")}>
              Upgrade to Pro — $14/mo
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLocked && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Generation form */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Generation Settings
                </CardTitle>
                <CardDescription>Configure the AI to target the right guest and highlight relevant events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Guest Type</Label>
                  <Select value={guestType} onValueChange={setGuestType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GUEST_TYPES.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Property Features to Highlight</Label>
                  <Input
                    value={features}
                    onChange={e => setFeatures(e.target.value)}
                    placeholder="hot tub, mountain views, pet-friendly, fire pit..."
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated list of standout features</p>
                </div>

                <div className="space-y-2">
                  <Label>Focus Events (optional)</Label>
                  <Input
                    value={focusEvents}
                    onChange={e => setFocusEvents(e.target.value)}
                    placeholder="Bikes Blues BBQ, Walmart AMP concerts..."
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Override auto-detected events. Comma-separated.</p>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generate.isPending || !selectedPropertyId}
                  className="w-full"
                >
                  {generate.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Listing Copy
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Latest result */}
          <div className="space-y-4">
            {generate.isPending && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Brain className="w-10 h-10 text-primary mb-3 animate-pulse" />
                  <p className="text-sm text-muted-foreground">AI is crafting your listing copy...</p>
                </CardContent>
              </Card>
            )}

            {!generate.isPending && latestSuggestion && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Latest Generation
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {latestSuggestion.isApplied && (
                        <Badge variant="outline" className="text-xs text-primary border-primary/30">Applied</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(latestSuggestion.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Listing Title</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => copyToClipboard(latestSuggestion.generatedTitle || "", "title")}
                      >
                        {copiedTitle ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copiedTitle ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border text-sm font-medium leading-relaxed">
                      {latestSuggestion.generatedTitle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {latestSuggestion.generatedTitle?.length || 0} characters
                      {(latestSuggestion.generatedTitle?.length || 0) > 80 && (
                        <span className="text-yellow-400 ml-2">⚠ Airbnb recommends under 80 chars</span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => copyToClipboard(latestSuggestion.generatedDescription || "", "desc")}
                      >
                        {copiedDesc ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copiedDesc ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                    <Textarea
                      value={latestSuggestion.generatedDescription || ""}
                      readOnly
                      rows={6}
                      className="resize-none text-sm bg-muted/30"
                    />
                  </div>

                  {/* Context tags */}
                  {latestSuggestion.eventContextJson && (
                    <div>
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Events Referenced</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {(JSON.parse(latestSuggestion.eventContextJson) as string[]).map((e, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {!latestSuggestion.isApplied && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => markApplied.mutate({ id: latestSuggestion.id! })}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark as Applied to Listing
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {!generate.isPending && !latestSuggestion && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="w-10 h-10 text-muted-foreground mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">
                    Configure your settings and click "Generate" to create AI-optimized listing copy
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {!isLocked && suggestions.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              Generation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.slice(1, 6).map(s => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.generatedTitle}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.guestType} · {format(new Date(s.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                  {s.isApplied && (
                    <Badge variant="outline" className="text-xs text-primary border-primary/30 flex-shrink-0">Applied</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
