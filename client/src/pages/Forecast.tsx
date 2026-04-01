import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PropertySelector } from "@/components/PropertySelector";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { DollarSign, TrendingUp, BarChart3, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Forecast() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: properties = [] } = trpc.property.list.useQuery();

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const { data: forecast, isLoading } = trpc.pricing.getForecast.useQuery(
    { propertyId: selectedPropertyId!, year, month },
    { enabled: !!selectedPropertyId }
  );

  const { data: monthPricing = [] } = trpc.pricing.getMonthPricing.useQuery(
    { propertyId: selectedPropertyId!, year, month },
    { enabled: !!selectedPropertyId }
  );

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Demand distribution for current month
  const demandDist = {
    high: monthPricing.filter(d => d.demandLevel === "high").length,
    medium: monthPricing.filter(d => d.demandLevel === "medium").length,
    low: monthPricing.filter(d => d.demandLevel === "low").length,
  };

  // Price distribution chart data
  const priceByWeek = monthPricing.reduce((acc, day, i) => {
    const week = Math.floor(i / 7) + 1;
    const key = `W${week}`;
    if (!acc[key]) acc[key] = { week: key, avg: 0, count: 0, high: 0, low: Infinity };
    acc[key].avg += day.suggestedPrice;
    acc[key].count += 1;
    acc[key].high = Math.max(acc[key].high, day.suggestedPrice);
    acc[key].low = Math.min(acc[key].low, day.suggestedPrice);
    return acc;
  }, {} as Record<string, any>);

  const weeklyData = Object.values(priceByWeek).map((w: any) => ({
    ...w,
    avg: Math.round(w.avg / w.count),
  }));

  // 6-month forecast chart
  const forecastChartData = forecast?.months.map(m => ({
    month: MONTH_NAMES[(m.month - 1) % 12],
    projected: m.projected,
    optimized: m.optimized,
    occupancy: m.occupancyRate,
  })) || [];

  const totalProjected = forecast?.months.reduce((s, m) => s + m.projected, 0) || 0;
  const totalOptimized = forecast?.months.reduce((s, m) => s + m.optimized, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revenue Forecast</h1>
          <p className="text-muted-foreground text-sm mt-0.5">6-month rolling projection based on demand scoring</p>
        </div>
        <PropertySelector value={selectedPropertyId} onChange={setSelectedPropertyId} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      )}

      {forecast && selectedProperty && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">This Month</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">${forecast.current.projected.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">projected revenue</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Optimized Potential</span>
                  <TrendingUp className="w-4 h-4 text-chart-1" />
                </div>
                <div className="text-2xl font-bold text-primary">${forecast.current.optimized.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">with full optimization</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Avg Occupancy</span>
                  <BarChart3 className="w-4 h-4 text-chart-2" />
                </div>
                <div className="text-2xl font-bold">{forecast.current.occupancyRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">estimated this month</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">6-Month Total</span>
                  <ArrowUpRight className="w-4 h-4 text-chart-3" />
                </div>
                <div className="text-2xl font-bold">${totalProjected.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">projected</div>
              </CardContent>
            </Card>
          </div>

          {/* 6-month forecast chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">6-Month Revenue Projection</CardTitle>
              <CardDescription>
                Projected vs optimized revenue. Optimized assumes full pricing strategy adoption (+12% uplift).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={forecastChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.015 250)" />
                  <XAxis dataKey="month" tick={{ fill: "oklch(0.60 0.01 250)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "oklch(0.60 0.01 250)", fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.15 0.015 250)", border: "1px solid oklch(0.22 0.015 250)", borderRadius: "8px" }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                  />
                  <Legend />
                  <Bar dataKey="projected" name="Projected" fill="oklch(0.65 0.18 200)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="optimized" name="Optimized" fill="oklch(0.72 0.18 170)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Weekly price distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Weekly Price Distribution</CardTitle>
                <CardDescription>Average nightly price by week this month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.015 250)" />
                    <XAxis dataKey="week" tick={{ fill: "oklch(0.60 0.01 250)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "oklch(0.60 0.01 250)", fontSize: 12 }} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: "oklch(0.15 0.015 250)", border: "1px solid oklch(0.22 0.015 250)", borderRadius: "8px" }}
                      formatter={(v: number) => [`$${v}`, "Avg Price"]}
                    />
                    <Bar dataKey="avg" name="Avg Price" fill="oklch(0.72 0.18 170)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Demand distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Demand Distribution</CardTitle>
                <CardDescription>This month's demand breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {[
                  { label: "High Demand", count: demandDist.high, color: "bg-red-500", textColor: "text-red-400", pct: Math.round(demandDist.high / monthPricing.length * 100) },
                  { label: "Medium Demand", count: demandDist.medium, color: "bg-yellow-500", textColor: "text-yellow-400", pct: Math.round(demandDist.medium / monthPricing.length * 100) },
                  { label: "Low Demand", count: demandDist.low, color: "bg-blue-500", textColor: "text-blue-400", pct: Math.round(demandDist.low / monthPricing.length * 100) },
                ].map(d => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm">{d.label}</span>
                      <span className={`text-sm font-medium ${d.textColor}`}>{d.count} days ({d.pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${d.color} rounded-full transition-all`} style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Base price</span>
                    <span className="font-medium">${selectedProperty.basePrice}/night</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Avg suggested</span>
                    <span className="font-medium text-primary">
                      ${monthPricing.length > 0
                        ? Math.round(monthPricing.reduce((s, d) => s + d.suggestedPrice, 0) / monthPricing.length)
                        : "—"}/night
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Revenue uplift</span>
                    <span className="font-medium text-chart-1">
                      +{monthPricing.length > 0 && selectedProperty.basePrice
                        ? Math.round(((monthPricing.reduce((s, d) => s + d.suggestedPrice, 0) / monthPricing.length) / parseFloat(String(selectedProperty.basePrice)) - 1) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly breakdown table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Month</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Projected</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Optimized</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Occupancy</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Uplift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.months.map((m, i) => (
                      <tr key={i} className={`border-b border-border/50 ${i === 0 ? "bg-primary/5" : ""}`}>
                        <td className="py-2.5 px-3 font-medium">
                          {MONTH_NAMES[(m.month - 1) % 12]} {m.year}
                          {i === 0 && <Badge variant="outline" className="ml-2 text-xs">Current</Badge>}
                        </td>
                        <td className="py-2.5 px-3 text-right">${m.projected.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-primary font-medium">${m.optimized.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right">{m.occupancyRate}%</td>
                        <td className="py-2.5 px-3 text-right text-chart-1">
                          +${(m.optimized - m.projected).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-2.5 px-3">6-Month Total</td>
                      <td className="py-2.5 px-3 text-right">${totalProjected.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-primary">${totalOptimized.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right">—</td>
                      <td className="py-2.5 px-3 text-right text-chart-1">+${(totalOptimized - totalProjected).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
