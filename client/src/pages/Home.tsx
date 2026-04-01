import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  TrendingUp, Calendar, Zap, MapPin, Star, ChevronRight, Check,
  BarChart3, Brain, Building2, Globe, Shield, Sparkles
} from "lucide-react";

const features = [
  {
    icon: <Calendar className="w-6 h-6" />,
    title: "Smart Calendar",
    desc: "Color-coded demand visualization with event overlays. See high, medium, and low demand at a glance.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Event Intelligence",
    desc: "Aggregates local events from Eventbrite, city calendars, sports schedules, and festivals to score demand.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Dynamic Pricing Engine",
    desc: "Configurable multipliers for weekends, holidays, events, and seasonality. Know exactly why each price was set.",
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: "AI Listing Optimizer",
    desc: "Generate compelling titles and descriptions tailored to upcoming events and your target guest type.",
  },
  {
    icon: <Building2 className="w-6 h-6" />,
    title: "Multi-Property Support",
    desc: "Manage Pea Ridge, Springdale, CDA, or any number of properties from one unified dashboard.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Revenue Forecasting",
    desc: "6-month rolling revenue projections based on demand scoring and your pricing strategy.",
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Get started with one property",
    color: "border-border",
    badge: null,
    features: [
      "1 property",
      "Basic calendar view",
      "Manual event entry",
      "Simple pricing suggestions",
      "Community support",
    ],
    cta: "Get Started Free",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "$14",
    period: "per month",
    desc: "For serious hosts with multiple listings",
    color: "border-primary",
    badge: "Most Popular",
    features: [
      "Up to 10 properties",
      "Full event intelligence",
      "AI listing optimizer",
      "Advanced pricing rules",
      "Revenue forecasting",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    variant: "default" as const,
  },
  {
    name: "Advanced",
    price: "$29",
    period: "per month",
    desc: "Full automation for power users",
    color: "border-chart-2",
    badge: "Best Value",
    features: [
      "Unlimited properties",
      "Everything in Pro",
      "Automation features",
      "API access (coming soon)",
      "Airbnb sync (coming soon)",
      "Dedicated support",
    ],
    cta: "Go Advanced",
    variant: "outline" as const,
  },
];

const competitors = [
  { feature: "Event-aware pricing", rapt: true, airDNA: false, priceLabs: false },
  { feature: "AI listing optimization", rapt: true, airDNA: false, priceLabs: false },
  { feature: "Local demand intelligence", rapt: true, airDNA: false, priceLabs: false },
  { feature: "Multi-property dashboard", rapt: true, airDNA: true, priceLabs: true },
  { feature: "Revenue forecasting", rapt: true, airDNA: true, priceLabs: true },
  { feature: "PWA (mobile + desktop)", rapt: true, airDNA: false, priceLabs: false },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              RAPT
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#compare" className="hover:text-foreground transition-colors">Compare</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} size="sm">
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = getLoginUrl()}>
                  Sign In
                </Button>
                <Button size="sm" onClick={handleCTA}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, oklch(0.72 0.18 170), transparent 70%)' }} />
        </div>

        <div className="container relative text-center max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-6 border-primary/40 text-primary bg-primary/10 px-4 py-1.5">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            The pricing tool AirDNA wishes it was
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            Set the{" "}
            <span style={{
              background: 'linear-gradient(135deg, oklch(0.72 0.18 170), oklch(0.65 0.18 200))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              right price
            </span>
            <br />
            for the right guest
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            RAPT is the only pricing tool that combines <strong className="text-foreground">local event intelligence</strong>,
            dynamic demand scoring, and <strong className="text-foreground">AI-powered listing optimization</strong> —
            so you capture revenue others leave on the table.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleCTA} className="text-base px-8 h-12">
              Start Free Today
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")} className="text-base px-8 h-12">
              View Demo Dashboard
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Works globally</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Install as PWA</span>
          </div>
        </div>

        {/* Hero visual - demand calendar preview */}
        <div className="container mt-16 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Pea Ridge, AR</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">High</span>
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Medium</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Low</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
              ))}
              {[
                { day: 1, level: "low", price: 95 }, { day: 2, level: "low", price: 95 },
                { day: 3, level: "medium", price: 125 }, { day: 4, level: "medium", price: 130 },
                { day: 5, level: "medium", price: 135 }, { day: 6, level: "high", price: 185 },
                { day: 7, level: "high", price: 195 }, { day: 8, level: "high", price: 190 },
                { day: 9, level: "medium", price: 120 }, { day: 10, level: "low", price: 90 },
                { day: 11, level: "low", price: 85 }, { day: 12, level: "medium", price: 115 },
                { day: 13, level: "high", price: 175 }, { day: 14, level: "high", price: 180 },
                { day: 15, level: "high", price: 185 }, { day: 16, level: "medium", price: 140 },
                { day: 17, level: "medium", price: 135 }, { day: 18, level: "low", price: 95 },
                { day: 19, level: "low", price: 90 }, { day: 20, level: "medium", price: 120 },
                { day: 21, level: "high", price: 220 },
              ].map(({ day, level, price }) => (
                <div key={day} className={`rounded-lg p-1.5 text-center cursor-pointer transition-transform hover:scale-105 border ${
                  level === "high" ? "bg-red-500/15 border-red-500/30" :
                  level === "medium" ? "bg-yellow-500/15 border-yellow-500/30" :
                  "bg-blue-500/15 border-blue-500/30"
                }`}>
                  <div className="text-xs text-muted-foreground">{day}</div>
                  <div className={`text-xs font-semibold ${
                    level === "high" ? "text-red-400" :
                    level === "medium" ? "text-yellow-400" : "text-blue-400"
                  }`}>${price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to maximize revenue</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              RAPT combines event intelligence, smart pricing, and AI optimization into one powerful platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="py-24 px-4 bg-card/30">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why RAPT beats the competition</h2>
            <p className="text-lg text-muted-foreground">Most tools react to past data. RAPT predicts demand from real-world events.</p>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Feature</th>
                  <th className="text-center p-4 text-sm font-semibold text-primary">RAPT</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">AirDNA</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">PriceLabs</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="p-4 text-sm">{row.feature}</td>
                    <td className="p-4 text-center">
                      {row.rapt ? <Check className="w-5 h-5 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {row.airDNA ? <Check className="w-5 h-5 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {row.priceLabs ? <Check className="w-5 h-5 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground">Start free. Upgrade when you're ready to scale.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {tiers.map((tier) => (
              <div key={tier.name} className={`rounded-xl border-2 ${tier.color} bg-card p-8 relative flex flex-col`}>
                {tier.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0">
                    {tier.badge}
                  </Badge>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground text-sm">/{tier.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.desc}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={tier.variant} className="w-full" onClick={handleCTA}>
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="container max-w-2xl mx-auto text-center">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-12">
            <Globe className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-4">Ready to optimize your pricing?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join hosts who are already using RAPT to capture more revenue from local events and demand signals.
            </p>
            <Button size="lg" onClick={handleCTA} className="px-10 h-12 text-base">
              Get Started for Free
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">RAPT</span>
            <span>— Really Awesome Pricing Tool</span>
          </div>
          <div className="flex items-center gap-4">
            <Shield className="w-4 h-4" />
            <span>Secure · Global · PWA-ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
