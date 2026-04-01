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
import { TrendingUp, Save, RotateCcw, Info, DollarSign } from "lucide-react";
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

  const [multipliers, setMultipliers] = useState({
    weekendMultiplier: 1.30,
    holidayMultiplier: 1.45,
    highEventMultiplier: 1.35,
    mediumEventMultiplier: 1.15,
    lowDemandMultiplier: 0.90,
    peakSeasonMultiplier: 1.25,
    offSeasonMultiplier: 0.85,
    minPrice: 0,
    maxPrice: 0,
    peakMonths: [6, 7, 8],
  });

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
    });
  };

  const handleReset = () => {
    setMultipliers({
      weekendMultiplier: 1.30,
      holidayMultiplier: 1.45,
      highEventMultiplier: 1.35,
      mediumEventMultiplier: 1.15,
      lowDemandMultiplier: 0.90,
      peakSeasonMultiplier: 1.25,
      offSeasonMultiplier: 0.85,
      minPrice: 0,
      maxPrice: 0,
      peakMonths: [6, 7, 8],
    });
  };

  const togglePeakMonth = (num: number) => {
    setMultipliers(prev => ({
      ...prev,
      peakMonths: prev.peakMonths.includes(num)
        ? prev.peakMonths.filter(m => m !== num)
        : [...prev.peakMonths, num],
    }));
  };

  // Preview calculation
  const basePrice = selectedProperty ? parseFloat(String(selectedProperty.basePrice)) : 150;
  const previewScenarios = [
    {
      label: "Regular weekday",
      multiplier: multipliers.lowDemandMultiplier,
      price: Math.round(basePrice * multipliers.lowDemandMultiplier),
    },
    {
      label: "Weekend",
      multiplier: multipliers.weekendMultiplier,
      price: Math.round(basePrice * multipliers.weekendMultiplier),
    },
    {
      label: "Peak season weekend",
      multiplier: multipliers.weekendMultiplier * multipliers.peakSeasonMultiplier,
      price: Math.round(basePrice * multipliers.weekendMultiplier * multipliers.peakSeasonMultiplier),
    },
    {
      label: "High-demand event",
      multiplier: multipliers.highEventMultiplier,
      price: Math.round(basePrice * multipliers.highEventMultiplier),
    },
    {
      label: "Holiday",
      multiplier: multipliers.holidayMultiplier,
      price: Math.round(basePrice * multipliers.holidayMultiplier),
    },
    {
      label: "Holiday + event",
      multiplier: multipliers.holidayMultiplier * multipliers.highEventMultiplier,
      price: Math.round(basePrice * multipliers.holidayMultiplier * multipliers.highEventMultiplier),
    },
  ];

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
