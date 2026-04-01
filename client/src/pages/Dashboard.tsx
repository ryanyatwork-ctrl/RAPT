import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PropertySelector } from "@/components/PropertySelector";
import { useLocation } from "wouter";
import {
  TrendingUp, Calendar, Zap, DollarSign, BarChart3,
  ArrowUpRight, MapPin, Star, AlertCircle, ChevronRight, Building2
} from "lucide-react";
import { format, addDays } from "date-fns";

export default function Dashboard() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const { data: properties = [] } = trpc.property.list.useQuery();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const { data: monthPricing = [] } = trpc.pricing.getMonthPricing.useQuery(
    { propertyId: selectedPropertyId!, year, month },
    { enabled: !!selectedPropertyId }
  );

  const { data: events = [] } = trpc.events.list.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );

  const { data: forecast } = trpc.pricing.getForecast.useQuery(
    { propertyId: selectedPropertyId!, year, month },
    { enabled: !!selectedPropertyId }
  );

  const { data: subData } = trpc.subscription.get.useQuery();

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Compute stats
  const highDemandDays = monthPricing.filter(d => d.demandLevel === "high").length;
  const avgPrice = monthPricing.length > 0
    ? Math.round(monthPricing.reduce((s, d) => s + d.suggestedPrice, 0) / monthPricing.length)
    : 0;
  const upcomingEvents = events.filter(e => new Date(e.startDate) >= now).slice(0, 5);
  const maxDemandDay = monthPricing.reduce((max, d) => d.demandScore > (max?.demandScore || 0) ? d : max, monthPricing[0]);

  // Next 7 days preview
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(now, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayPricing = monthPricing.find(d => d.date === dateStr);
    return { date, dateStr, pricing: dayPricing };
  });

  const tier = subData?.tier || "free";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(now, "MMMM yyyy")} overview
          </p>
        </div>
        <PropertySelector value={selectedPropertyId} onChange={setSelectedPropertyId} />
      </div>

      {/* No properties state */}
      {properties.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Add your first property</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Get started by adding a property to see pricing suggestions, event intelligence, and revenue forecasts.
            </p>
            <Button onClick={() => navigate("/properties")}>
              Add Property
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedProperty && (
        <>
          {/* Property info bar */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">{selectedProperty.name}</span>
              <span className="text-muted-foreground text-sm ml-2">{selectedProperty.city}, {selectedProperty.state}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedProperty.propertyType}
            </Badge>
            <span className="text-sm font-semibold text-primary">${selectedProperty.basePrice}/night base</span>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Projected Revenue</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">${forecast?.current.projected.toLocaleString() || "—"}</div>
                <div className="text-xs text-muted-foreground mt-1">this month</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Avg Suggested Price</span>
                  <TrendingUp className="w-4 h-4 text-chart-2" />
                </div>
                <div className="text-2xl font-bold">${avgPrice}</div>
                <div className="text-xs text-muted-foreground mt-1">per night</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">High Demand Days</span>
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold">{highDemandDays}</div>
                <div className="text-xs text-muted-foreground mt-1">this month</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Upcoming Events</span>
                  <Zap className="w-4 h-4 text-chart-1" />
                </div>
                <div className="text-2xl font-bold">{upcomingEvents.length}</div>
                <div className="text-xs text-muted-foreground mt-1">next 30 days</div>
              </CardContent>
            </Card>
          </div>

          {/* Next 7 days */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Next 7 Days</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/calendar")} className="text-xs h-7">
                  Full Calendar <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {next7Days.map(({ date, pricing }) => (
                  <div
                    key={format(date, "yyyy-MM-dd")}
                    className={`rounded-lg p-2 text-center border cursor-pointer hover:scale-105 transition-transform ${
                      pricing?.demandLevel === "high"
                        ? "bg-red-500/10 border-red-500/30"
                        : pricing?.demandLevel === "medium"
                        ? "bg-yellow-500/10 border-yellow-500/30"
                        : "bg-blue-500/10 border-blue-500/30"
                    }`}
                    onClick={() => navigate("/calendar")}
                  >
                    <div className="text-xs text-muted-foreground">{format(date, "EEE")}</div>
                    <div className="text-sm font-semibold mt-0.5">{format(date, "d")}</div>
                    {pricing && (
                      <div className={`text-xs font-bold mt-0.5 ${
                        pricing.demandLevel === "high" ? "text-red-400" :
                        pricing.demandLevel === "medium" ? "text-yellow-400" : "text-blue-400"
                      }`}>
                        ${pricing.suggestedPrice}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Upcoming events */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Upcoming Events</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/events")} className="text-xs h-7">
                    All Events <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No upcoming events. Add events to improve pricing accuracy.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map(event => (
                      <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          event.demandImpact === "high" ? "bg-red-400" :
                          event.demandImpact === "medium" ? "bg-yellow-400" : "bg-blue-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{event.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(event.startDate), "MMM d")}
                            {event.startDate !== event.endDate && ` – ${format(new Date(event.endDate), "MMM d")}`}
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs ${
                          event.demandImpact === "high" ? "border-red-500/30 text-red-400" :
                          event.demandImpact === "medium" ? "border-yellow-500/30 text-yellow-400" :
                          "border-blue-500/30 text-blue-400"
                        }`}>
                          {event.demandImpact}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start h-10" onClick={() => navigate("/pricing")}>
                  <TrendingUp className="w-4 h-4 mr-3 text-primary" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Update Pricing Rules</div>
                    <div className="text-xs text-muted-foreground">Adjust multipliers</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </Button>
                <Button variant="outline" className="w-full justify-start h-10" onClick={() => navigate("/events")}>
                  <Zap className="w-4 h-4 mr-3 text-chart-1" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Add Local Event</div>
                    <div className="text-xs text-muted-foreground">Improve demand scoring</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-10"
                  onClick={() => navigate("/listing")}
                  disabled={tier === "free"}
                >
                  <BarChart3 className="w-4 h-4 mr-3 text-chart-2" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Generate AI Listing</div>
                    <div className="text-xs text-muted-foreground">
                      {tier === "free" ? "Pro feature" : "Optimize your listing"}
                    </div>
                  </div>
                  {tier === "free" ? (
                    <Badge variant="outline" className="ml-auto text-xs">Pro</Badge>
                  ) : (
                    <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  )}
                </Button>
                <Button variant="outline" className="w-full justify-start h-10" onClick={() => navigate("/forecast")}>
                  <DollarSign className="w-4 h-4 mr-3 text-chart-3" />
                  <div className="text-left">
                    <div className="text-sm font-medium">View Revenue Forecast</div>
                    <div className="text-xs text-muted-foreground">6-month projection</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Upgrade banner for free tier */}
          {tier === "free" && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm">Unlock AI Listing Optimizer & Multi-Property Support</div>
                    <div className="text-xs text-muted-foreground">Upgrade to Pro for $14/mo</div>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate("/subscription")}>
                  Upgrade
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
