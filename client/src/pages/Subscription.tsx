import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, CreditCard, Zap, Brain, Building2, BarChart3, Shield, ArrowRight } from "lucide-react";

const TIERS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Get started with one property",
    color: "border-border",
    badgeColor: "bg-muted text-muted-foreground",
    features: [
      { text: "1 property", available: true },
      { text: "Basic calendar view", available: true },
      { text: "Manual event entry", available: true },
      { text: "Simple pricing suggestions", available: true },
      { text: "AI listing optimizer", available: false },
      { text: "Multi-property support", available: false },
      { text: "Revenue forecasting", available: false },
      { text: "Automation features", available: false },
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$14",
    period: "per month",
    desc: "For serious hosts with multiple listings",
    color: "border-primary",
    badgeColor: "bg-primary/20 text-primary border-primary/30",
    features: [
      { text: "Up to 10 properties", available: true },
      { text: "Full calendar view", available: true },
      { text: "Event intelligence engine", available: true },
      { text: "Advanced pricing rules", available: true },
      { text: "AI listing optimizer", available: true },
      { text: "Revenue forecasting", available: true },
      { text: "Priority support", available: true },
      { text: "Automation features", available: false },
    ],
  },
  {
    id: "advanced" as const,
    name: "Advanced",
    price: "$29",
    period: "per month",
    desc: "Full automation for power users",
    color: "border-chart-2",
    badgeColor: "bg-chart-2/20 text-chart-2 border-chart-2/30",
    features: [
      { text: "Unlimited properties", available: true },
      { text: "Everything in Pro", available: true },
      { text: "Automation features", available: true },
      { text: "API access (coming soon)", available: true },
      { text: "Airbnb sync (coming soon)", available: true },
      { text: "Dedicated support", available: true },
      { text: "Custom pricing rules", available: true },
      { text: "White-glove onboarding", available: true },
    ],
  },
];

const FEATURE_HIGHLIGHTS = [
  { icon: <Building2 className="w-5 h-5" />, title: "Multi-Property Management", tiers: ["pro", "advanced"] },
  { icon: <Zap className="w-5 h-5" />, title: "Event Intelligence Engine", tiers: ["pro", "advanced"] },
  { icon: <Brain className="w-5 h-5" />, title: "AI Listing Optimizer", tiers: ["pro", "advanced"] },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Revenue Forecasting", tiers: ["pro", "advanced"] },
  { icon: <Shield className="w-5 h-5" />, title: "Automation Features", tiers: ["advanced"] },
];

export default function Subscription() {
  const { data: subData, isLoading } = trpc.subscription.get.useQuery();
  const utils = trpc.useUtils();

  const upgrade = trpc.subscription.upgrade.useMutation({
    onSuccess: (data) => {
      toast.success(`Upgraded to ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}! Enjoy your new features.`);
      utils.subscription.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancel = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled. You've been moved to the Free plan.");
      utils.subscription.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const currentTier = subData?.tier || "free";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-96 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your plan and unlock more features</p>
      </div>

      {/* Current plan banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium">
                Current Plan: <span className="text-primary capitalize">{currentTier}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {currentTier === "free" && "Upgrade to unlock AI features and multi-property support"}
                {currentTier === "pro" && "You have access to AI listing optimizer and up to 10 properties"}
                {currentTier === "advanced" && "You have full access to all RAPT features"}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`capitalize ${TIERS.find(t => t.id === currentTier)?.badgeColor}`}>
            {currentTier}
          </Badge>
        </CardContent>
      </Card>

      {/* Tier cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map(tier => {
          const isCurrent = currentTier === tier.id;
          const isDowngrade = (
            (currentTier === "advanced" && tier.id !== "advanced") ||
            (currentTier === "pro" && tier.id === "free")
          );
          const isUpgrade = !isCurrent && !isDowngrade;

          return (
            <Card key={tier.id} className={`border-2 ${tier.color} relative flex flex-col ${isCurrent ? "ring-2 ring-primary/30" : ""}`}>
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground border-0 text-xs">Current Plan</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <Badge variant="outline" className={`text-xs ${tier.badgeColor}`}>{tier.name}</Badge>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">/{tier.period}</span>
                </div>
                <CardDescription>{tier.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2.5 flex-1 mb-6">
                  {tier.features.map((f, i) => (
                    <li key={i} className={`flex items-center gap-2 text-sm ${!f.available ? "opacity-40" : ""}`}>
                      <Check className={`w-4 h-4 flex-shrink-0 ${f.available ? "text-primary" : "text-muted-foreground"}`} />
                      {f.text}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    Current Plan
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    className="w-full"
                    onClick={() => upgrade.mutate({ tier: tier.id as "pro" | "advanced" })}
                    disabled={upgrade.isPending}
                  >
                    {upgrade.isPending ? "Upgrading..." : `Upgrade to ${tier.name}`}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full text-muted-foreground"
                    onClick={() => {
                      if (confirm("Are you sure you want to downgrade? You'll lose access to premium features.")) {
                        if (tier.id === "free") {
                          cancel.mutate();
                        } else {
                          upgrade.mutate({ tier: tier.id as "pro" | "advanced" });
                        }
                      }
                    }}
                    disabled={cancel.isPending || upgrade.isPending}
                  >
                    Downgrade to {tier.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature comparison */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Feature Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {FEATURE_HIGHLIGHTS.map(f => (
              <div key={f.title} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="text-primary">{f.icon}</div>
                  <span className="text-sm font-medium">{f.title}</span>
                </div>
                <div className="flex gap-2">
                  {(["free", "pro", "advanced"] as const).map(t => (
                    <Badge
                      key={t}
                      variant="outline"
                      className={`text-xs capitalize ${
                        f.tiers.includes(t)
                          ? t === "advanced" ? "border-chart-2/30 text-chart-2 bg-chart-2/10" :
                            "border-primary/30 text-primary bg-primary/10"
                          : "opacity-30"
                      }`}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Note about billing */}
      <p className="text-xs text-muted-foreground text-center">
        This is a demo subscription system. In production, payments would be processed securely via Stripe.
        Upgrades take effect immediately for demonstration purposes.
      </p>
    </div>
  );
}
