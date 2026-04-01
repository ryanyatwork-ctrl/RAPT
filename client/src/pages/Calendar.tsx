import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PropertySelector } from "@/components/PropertySelector";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Zap, DollarSign, TrendingUp, X } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: properties = [] } = trpc.property.list.useQuery();

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: monthPricing = [], isLoading } = trpc.pricing.getMonthPricing.useQuery(
    { propertyId: selectedPropertyId!, year, month },
    { enabled: !!selectedPropertyId }
  );

  const { data: events = [] } = trpc.events.list.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOffset = getDay(startOfMonth(currentMonth));

  const getPricingForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return monthPricing.find(d => d.date === dateStr);
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(e => {
      const start = format(new Date(e.startDate), "yyyy-MM-dd");
      const end = format(new Date(e.endDate), "yyyy-MM-dd");
      return dateStr >= start && dateStr <= end;
    });
  };

  const selectedDayPricing = selectedDay ? monthPricing.find(d => d.date === selectedDay) : null;
  const selectedDayEvents = selectedDay ? getEventsForDate(new Date(selectedDay + "T12:00:00")) : [];

  const demandStats = {
    high: monthPricing.filter(d => d.demandLevel === "high").length,
    medium: monthPricing.filter(d => d.demandLevel === "medium").length,
    low: monthPricing.filter(d => d.demandLevel === "low").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Demand Calendar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Color-coded pricing and event intelligence</p>
        </div>
        <PropertySelector value={selectedPropertyId} onChange={setSelectedPropertyId} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="text-muted-foreground">High demand ({demandStats.high} days)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="text-muted-foreground">Medium demand ({demandStats.medium} days)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500/70" />
          <span className="text-muted-foreground">Low demand ({demandStats.low} days)</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">Has events</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              {isLoading ? (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for offset */}
                  {Array.from({ length: firstDayOffset }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {daysInMonth.map(date => {
                    const pricing = getPricingForDate(date);
                    const dayEvents = getEventsForDate(date);
                    const dateStr = format(date, "yyyy-MM-dd");
                    const isSelected = selectedDay === dateStr;
                    const today = isToday(date);

                    return (
                      <div
                        key={dateStr}
                        onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                        className={`relative rounded-lg p-1.5 text-center cursor-pointer transition-all hover:scale-105 border ${
                          isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                        } ${
                          pricing?.demandLevel === "high"
                            ? "bg-red-500/15 border-red-500/30 hover:bg-red-500/25"
                            : pricing?.demandLevel === "medium"
                            ? "bg-yellow-500/15 border-yellow-500/30 hover:bg-yellow-500/25"
                            : "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
                        }`}
                      >
                        <div className={`text-xs ${today ? "font-bold text-primary" : "text-muted-foreground"}`}>
                          {format(date, "d")}
                        </div>
                        {pricing && (
                          <div className={`text-xs font-semibold ${
                            pricing.demandLevel === "high" ? "text-red-400" :
                            pricing.demandLevel === "medium" ? "text-yellow-400" : "text-blue-400"
                          }`}>
                            ${pricing.suggestedPrice}
                          </div>
                        )}
                        {dayEvents.length > 0 && (
                          <div className="absolute top-0.5 right-0.5">
                            <Zap className="w-2.5 h-2.5 text-primary" />
                          </div>
                        )}
                        {pricing && (
                          <div className="text-[9px] text-muted-foreground">
                            {pricing.demandScore.toFixed(1)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Day detail panel */}
        <div className="space-y-4">
          {selectedDay && selectedDayPricing ? (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {format(new Date(selectedDay + "T12:00:00"), "EEEE, MMM d")}
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedDay(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Suggested Price</span>
                  </div>
                  <span className="text-xl font-bold text-primary">${selectedDayPricing.suggestedPrice}</span>
                </div>

                {/* Demand score */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-chart-2" />
                    <span className="text-sm font-medium">Demand Score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{selectedDayPricing.demandScore.toFixed(1)}</span>
                    <span className="text-muted-foreground text-sm">/10</span>
                    <Badge variant="outline" className={`text-xs ${
                      selectedDayPricing.demandLevel === "high" ? "border-red-500/30 text-red-400" :
                      selectedDayPricing.demandLevel === "medium" ? "border-yellow-500/30 text-yellow-400" :
                      "border-blue-500/30 text-blue-400"
                    }`}>
                      {selectedDayPricing.demandLevel}
                    </Badge>
                  </div>
                </div>

                {/* Price reasons */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Pricing Factors</div>
                  <div className="space-y-1.5">
                    {selectedDayPricing.reasons.map((reason, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Events on this day */}
                {selectedDayEvents.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Events</div>
                    <div className="space-y-2">
                      {selectedDayEvents.map(event => (
                        <div key={event.id} className="p-2 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3 h-3 text-primary" />
                            <span className="text-sm font-medium">{event.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{event.source.replace("_", " ")}</Badge>
                            <Badge variant="outline" className={`text-xs ${
                              event.demandImpact === "high" ? "border-red-500/30 text-red-400" :
                              event.demandImpact === "medium" ? "border-yellow-500/30 text-yellow-400" :
                              "border-blue-500/30 text-blue-400"
                            }`}>
                              {event.demandImpact} impact
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">Click a day to see pricing details, demand score, and events</p>
              </CardContent>
            </Card>
          )}

          {/* Month summary */}
          {selectedProperty && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Month Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base price</span>
                  <span className="font-medium">${selectedProperty.basePrice}/night</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg suggested</span>
                  <span className="font-medium text-primary">
                    ${monthPricing.length > 0
                      ? Math.round(monthPricing.reduce((s, d) => s + d.suggestedPrice, 0) / monthPricing.length)
                      : "—"}/night
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peak price</span>
                  <span className="font-medium text-red-400">
                    ${monthPricing.length > 0
                      ? Math.max(...monthPricing.map(d => d.suggestedPrice))
                      : "—"}/night
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Events this month</span>
                  <span className="font-medium">{events.length}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
