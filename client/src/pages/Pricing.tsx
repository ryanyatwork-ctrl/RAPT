import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PropertySelector } from "@/components/PropertySelector";
import { toast } from "sonner";
import { TrendingUp, Save, RotateCcw, Info, DollarSign, Gauge, Clock, CalendarRange } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

const MONTHS = [
  { num: 1, name: "Jan" }, { num: 2, name: "Feb" }, { num: 3, name: "Mar" },
  { num: 4, name: "Apr" }, { num: 5, name: "May" }, { num: 6, name: "Jun" },
  { num: 7, name: "Jul" }, { num: 8, name: "Aug" }, { num: 9, name: "Sep" },
  { num: 10, name: "Oct" }, { num: 11, name: "Nov" }, { num: 12, name: "Dec" },
];

interface MultiplierRowProps {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  color?: string;
}

function MultiplierRow({ label, description, value, onChange, min = 0.5, max = 2.5, step = 0.05, color = "text-primary" }: MultiplierRowProps) {
  const pct = Math.round((value - 1) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{description}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${color}`}>
            {pct >= 0 ? "+" : ""}{pct}%
          </span>
          <Badge variant="outline" className="text-xs font-mono w-14 justify-center">
            ×{value.toFixed(2)}
          </Badge>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

interface PercentRowProps {
  label: string;
  description: string;
  value: number; // fraction 0-1
  onChange: (v: number) => void;
  max?: number; // fraction
  color?: string;
}

function PercentRow({ label, description, value, onChange, max = 0.5, color = "text-blue-400" }: PercentRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{description}</TooltipContent>
          </Tooltip>
        </div>
        <span className={`text-sm font-bold ${color}`}>{Math.round(value * 100)}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={max}
        step={0.01}
        className="w-full"
      />
    </div>
  );
}

export default function Pricing() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const { data: properties = [] } = trpc.property.list.useQuery();

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const { data: rules, isLoading } = trpc.pricing.getRules.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const DEFAULTS = {
    weekendMultiplier: 1.30,
    holidayMultiplier: 1.45,
    highEventMultiplier: 1.35,
    mediumEventMultiplier: 1.15,
    lowDemandMultiplier: 0.90,
    peakSeasonMultiplier: 1.25,
    offSeasonMultiplier: 0.85,
    minPrice: 0,
    maxPrice: 0,
    peakMonths: [6, 7, 8] as number[],
    strategy: "recommended" as "conservative" | "recommended" | "aggressive",
    nearTermDiscount: 0, // fraction 0-0.9
    nearTermDays: 7,
    farOutPremium: 0,
    farOutDays: 90,
    weeklyDiscount: 0,
    monthlyDiscount: 0,
    minStay: 1,
    orphanGapDiscount: 0,
  };

  const [multipliers, setMultipliers] = useState(DEFAULTS);

  useEffect(() => {
    if (rules) {
      setMultipliers({
        weekendMultiplier: parseFloat(String(rules.weekendMultiplier || "1.30")),
        holidayMultiplier: parseFloat(String(rules.holidayMultiplier || "1.45")),
        highEventMultiplier: parseFloat(String(rules.highEventMultiplier || "1.35")),
        mediumEventMultiplier: parseFloat(String(rules.mediumEventMultiplier || "1.15")),
        lowDemandMultiplier: parseFloat(String(rules.lowDemandMultiplier || "0.90")),
        peakSeasonMultiplier: parseFloat(String(rules.peakSeasonMultiplier || "1.25")),
        offSeasonMultiplier: parseFloat(String(rules.offSeasonMultiplier || "0.85")),
        minPrice: rules.minPrice ? parseFloat(String(rules.minPrice)) : 0,
        maxPrice: rules.maxPrice ? parseFloat(String(rules.maxPrice)) : 0,
        peakMonths: rules.peakMonthsJson ? JSON.parse(rules.peakMonthsJson) : [6, 7, 8],
        strategy: (rules.strategy as typeof DEFAULTS.strategy) || "recommended",
        nearTermDiscount: rules.nearTermDiscount ? parseFloat(String(rules.nearTermDiscount)) : 0,
        nearTermDays: rules.nearTermDays ?? 7,
        farOutPremium: rules.farOutPremium ? parseFloat(String(rules.farOutPremium)) : 0,
        farOutDays: rules.farOutDays ?? 90,
        weeklyDiscount: rules.weeklyDiscount ? parseFloat(String(rules.weeklyDiscount)) : 0,
        monthlyDiscount: rules.monthlyDiscount ? parseFloat(String(rules.monthlyDiscount)) : 0,
        minStay: rules.minStay ?? 1,
        orphanGapDiscount: rules.orphanGapDiscount ? parseFloat(String(rules.orphanGapDiscount)) : 0,
      });
    }
  }, [rules]);

  const updateRules = trpc.pricing.updateRules.useMutation({
    onSuccess: () => toast.success("Pricing rules saved successfully"),
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!selectedPropertyId) return;
    updateRules.mutate({
      propertyId: selectedPropertyId,
      weekendMultiplier: multipliers.weekendMultiplier,
      holidayMultiplier: multipliers.holidayMultiplier,
      highEventMultiplier: multipliers.highEventMultiplier,
      mediumEventMultiplier: multipliers.mediumEventMultiplier,
      lowDemandMultiplier: multipliers.lowDemandMultiplier,
      peakSeasonMultiplier: multipliers.peakSeasonMultiplier,
      offSeasonMultiplier: multipliers.offSeasonMultiplier,
      minPrice: multipliers.minPrice || undefined,
      maxPrice: multipliers.maxPrice || undefined,
      peakMonths: multipliers.peakMonths,
      strategy: multipliers.strategy,
      nearTermDiscount: multipliers.nearTermDiscount,
      nearTermDays: multipliers.nearTermDays,
      farOutPremium: multipliers.farOutPremium,
      farOutDays: multipliers.farOutDays,
      weeklyDiscount: multipliers.weeklyDiscount,
      monthlyDiscount: multipliers.monthlyDiscount,
      minStay: multipliers.minStay,
      orphanGapDiscount: multipliers.orphanGapDiscount,
    });
  };

  const handleReset = () => {
    setMultipliers(DEFAULTS);
  };

  const togglePeakMonth = (num: number) => {
    setMultipliers(prev => ({
      ...prev,
      peakMonths: prev.peakMonths.includes(num)
        ? prev.peakMonths.filter(m => m !== num)
        : [...prev.peakMonths, num],
    }));
  };

  // Preview calculation (strategy dial scales the whole recommendation)
  const STRATEGY_FACTOR = { conservative: 0.92, recommended: 1.0, aggressive: 1.08 } as const;
  const sf = STRATEGY_FACTOR[multipliers.strategy];
  const basePrice = selectedProperty ? parseFloat(String(selectedProperty.basePrice)) : 150;
  const previewScenarios = [
    { label: "Regular weekday", multiplier: multipliers.lowDemandMultiplier },
    { label: "Weekend", multiplier: multipliers.weekendMultiplier },
    { label: "Peak season weekend", multiplier: multipliers.weekendMultiplier * multipliers.peakSeasonMultiplier },
    { label: "High-demand event", multiplier: multipliers.highEventMultiplier },
    { label: "Holiday", multiplier: multipliers.holidayMultiplier },
    { label: "Holiday + event", multiplier: multipliers.holidayMultiplier * multipliers.highEventMultiplier },
  ].map(s => ({ ...s, price: Math.round(basePrice * s.multiplier * sf) }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pricing Engine</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Configure dynamic pricing multipliers</p>
        </div>
        <PropertySelector value={selectedPropertyId} onChange={setSelectedPropertyId} />
      </div>

      {selectedPropertyId && !isLoading && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Multiplier controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Strategy dial */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-primary" />
                  Pricing Strategy
                </CardTitle>
                <CardDescription>
                  Set your overall posture. This scales every suggested price up or down before caps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "conservative", label: "Conservative", sub: "−8%", desc: "Prioritize occupancy" },
                    { key: "recommended", label: "Recommended", sub: "Balanced", desc: "Data-driven default" },
                    { key: "aggressive", label: "Aggressive", sub: "+8%", desc: "Maximize rate" },
                  ] as const).map(opt => {
                    const active = multipliers.strategy === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setMultipliers(p => ({ ...p, strategy: opt.key }))}
                        className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-3 text-center transition-colors ${
                          active
                            ? "bg-primary/15 border-primary text-primary"
                            : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-xs font-mono">{opt.sub}</span>
                        <span className="text-[10px] leading-tight">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Demand-based multipliers */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Demand Multipliers
                </CardTitle>
                <CardDescription>Adjust how much prices increase based on demand signals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MultiplierRow
                  label="Weekend Premium"
                  description="Applied on Friday, Saturday, and Sunday nights"
                  value={multipliers.weekendMultiplier}
                  onChange={v => setMultipliers(p => ({ ...p, weekendMultiplier: v }))}
                  color="text-yellow-400"
                />
                <MultiplierRow
                  label="Holiday Premium"
                  description="Applied on US federal holidays and major holiday weekends"
                  value={multipliers.holidayMultiplier}
                  onChange={v => setMultipliers(p => ({ ...p, holidayMultiplier: v }))}
                  color="text-red-400"
                />
                <MultiplierRow
                  label="High-Impact Event"
                  description="Applied when a high-demand local event falls on this date (concerts, major sports, festivals)"
                  value={multipliers.highEventMultiplier}
                  onChange={v => setMultipliers(p => ({ ...p, highEventMultiplier: v }))}
                  color="text-red-400"
                />
                <MultiplierRow
                  label="Medium-Impact Event"
                  description="Applied when a medium-demand local event falls on this date"
                  value={multipliers.mediumEventMultiplier}
                  onChange={v => setMultipliers(p => ({ ...p, mediumEventMultiplier: v }))}
                  color="text-yellow-400"
                />
                <MultiplierRow
                  label="Low Demand Discount"
                  description="Applied on standard weekdays with no events or seasonal boosts"
                  value={multipliers.lowDemandMultiplier}
                  onChange={v => setMultipliers(p => ({ ...p, lowDemandMultiplier: v }))}
                  min={0.5}
                  max={1.0}
                  color="text-blue-400"
                />
              </CardContent>
            </Card>

            {/* Seasonal multipliers */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Seasonal Pricing</CardTitle>
                <CardDescription>Set peak and off-season adjustments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MultiplierRow
                  label="Peak Season Premium"
                  description="Applied during your designated peak months"
                  value={multipliers.peakSeasonMultiplier}
                  onChange={v => setMultipliers(p => ({ ...p, peakSeasonMultiplier: v }))}
                  color="text-primary"
                />
                <MultiplierRow
                  label="Off-Season Discount"
                  description="Applied during slow months (Jan, Feb, Nov unless in peak)"
                  value={multipliers.offSeasonMultiplier}
                  onChange={v => setMultipliers(p => ({ ...p, offSeasonMultiplier: v }))}
                  min={0.5}
                  max={1.0}
                  color="text-blue-400"
                />

                {/* Peak month selector */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Peak Months</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {MONTHS.map(m => (
                      <button
                        key={m.num}
                        onClick={() => togglePeakMonth(m.num)}
                        className={`py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          multipliers.peakMonths.includes(m.num)
                            ? "bg-primary/20 border-primary/50 text-primary"
                            : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price caps */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Price Floors & Ceilings
                </CardTitle>
                <CardDescription>Set absolute min/max prices regardless of multipliers (0 = no limit)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Minimum Price ($/night)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={multipliers.minPrice || ""}
                      onChange={e => setMultipliers(p => ({ ...p, minPrice: Number(e.target.value) }))}
                      placeholder="No minimum"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Maximum Price ($/night)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={multipliers.maxPrice || ""}
                      onChange={e => setMultipliers(p => ({ ...p, maxPrice: Number(e.target.value) }))}
                      placeholder="No maximum"
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced: time-based pricing */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Time-Based Pricing
                </CardTitle>
                <CardDescription>Fill soon-vacant dates and premium-price far-out demand</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <PercentRow
                    label="Near-Term Fill Discount"
                    description="Discount dates that are still vacant within the lead-time window below, to encourage last-minute bookings."
                    value={multipliers.nearTermDiscount}
                    onChange={v => setMultipliers(p => ({ ...p, nearTermDiscount: v }))}
                    max={0.4}
                    color="text-blue-400"
                  />
                  <div className="flex items-center gap-2 pl-1">
                    <Label className="text-xs text-muted-foreground">Applies to dates within</Label>
                    <Input
                      type="number" min={0} max={60}
                      value={multipliers.nearTermDays}
                      onChange={e => setMultipliers(p => ({ ...p, nearTermDays: Number(e.target.value) }))}
                      className="h-7 w-16 text-xs"
                    />
                    <Label className="text-xs text-muted-foreground">days</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <PercentRow
                    label="Far-Out Demand Premium"
                    description="Premium for prime dates far in the future, where demand is inelastic and early bookers will pay more."
                    value={multipliers.farOutPremium}
                    onChange={v => setMultipliers(p => ({ ...p, farOutPremium: v }))}
                    max={0.5}
                    color="text-green-400"
                  />
                  <div className="flex items-center gap-2 pl-1">
                    <Label className="text-xs text-muted-foreground">Applies to dates beyond</Label>
                    <Input
                      type="number" min={0} max={365}
                      value={multipliers.farOutDays}
                      onChange={e => setMultipliers(p => ({ ...p, farOutDays: Number(e.target.value) }))}
                      className="h-7 w-16 text-xs"
                    />
                    <Label className="text-xs text-muted-foreground">days out</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced: length-of-stay & gaps */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-primary" />
                  Length-of-Stay & Gap Nights
                </CardTitle>
                <CardDescription>Reward longer bookings and fill awkward gaps between stays</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <PercentRow
                  label="Weekly Discount (7+ nights)"
                  description="Discount applied to stays of 7 nights or more. Set this here instead of in Airbnb to avoid double-discounting."
                  value={multipliers.weeklyDiscount}
                  onChange={v => setMultipliers(p => ({ ...p, weeklyDiscount: v }))}
                  max={0.4}
                />
                <PercentRow
                  label="Monthly Discount (28+ nights)"
                  description="Discount applied to stays of 28 nights or more for mid-term guests."
                  value={multipliers.monthlyDiscount}
                  onChange={v => setMultipliers(p => ({ ...p, monthlyDiscount: v }))}
                  max={0.5}
                />
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Minimum Stay (nights)</Label>
                      <Tooltip>
                        <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs">Vacant runs shorter than this, wedged between bookings, are flagged as gap nights.</TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number" min={1} max={30}
                      value={multipliers.minStay}
                      onChange={e => setMultipliers(p => ({ ...p, minStay: Number(e.target.value) }))}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <PercentRow
                      label="Gap-Night Discount"
                      description="Discount automatically suggested for orphan/gap nights too short to meet the minimum stay."
                      value={multipliers.orphanGapDiscount}
                      onChange={v => setMultipliers(p => ({ ...p, orphanGapDiscount: v }))}
                      max={0.4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={updateRules.isPending} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {updateRules.isPending ? "Saving..." : "Save Pricing Rules"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Defaults
              </Button>
            </div>
          </div>

          {/* Preview panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Price Preview</CardTitle>
                <CardDescription>
                  Based on ${basePrice}/night base price
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {previewScenarios.map(s => (
                  <div key={s.label} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">×{s.multiplier.toFixed(2)}</div>
                    </div>
                    <div className="text-lg font-bold text-primary">${s.price}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-sm">
                <div className="font-medium mb-2 text-primary">How multipliers stack</div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Multipliers are applied sequentially. A holiday weekend during peak season would apply:
                  holiday × weekend × peak season. Price caps are enforced last.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />)}
          </div>
          <div className="h-64 rounded-xl bg-muted/30 animate-pulse" />
        </div>
      )}
    </div>
  );
}
