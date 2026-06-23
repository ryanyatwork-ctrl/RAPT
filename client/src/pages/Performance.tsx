import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PropertySelector } from "@/components/PropertySelector";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from "recharts";
import { Percent, DollarSign, BarChart3, Wallet, Info } from "lucide-react";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(key: string): string {
  // key is "YYYY-MM"
  const [, m] = key.split("-");
  return MONTH_NAMES[(Number(m) - 1) % 12] ?? key;
}

export default function Performance() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const { data: properties = [] } = trpc.property.list.useQuery();

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const { data, isLoading } = trpc.pricing.getPerformance.useQuery(
    { propertyId: selectedPropertyId!, months: 6 },
    { enabled: !!selectedPropertyId }
  );

  const overall = data?.overall;
  const monthly = data?.monthly ?? [];
  const hasBookings = (overall?.bookedNights ?? 0) > 0;

  const chartData = monthly.map(m => ({
    month: monthLabel(m.month),
    revenue: m.revenue,
    occupancy: m.occupancyRate,
    adr: m.adr,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Performance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Historical revenue performance over the last 6 months
          </p>
        </div>
        <PropertySelector value={selectedPropertyId} onChange={setSelectedPropertyId} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      )}

      {overall && (
        <>
          {/* Summary KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Occupancy</span>
                  <Percent className="w-4 h-4 text-chart-2" />
                </div>
                <div className="text-2xl font-bold">{overall.occupancyRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">{overall.bookedNights} of {overall.nights} nights</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">ADR</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">${overall.adr.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">avg daily rate</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">RevPAR</span>
                  <BarChart3 className="w-4 h-4 text-chart-1" />
                </div>
                <div className="text-2xl font-bold">${overall.revpar.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">revenue per avail. night</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Revenue</span>
                  <Wallet className="w-4 h-4 text-chart-3" />
                </div>
                <div className="text-2xl font-bold">${overall.revenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">last 6 months</div>
              </CardContent>
            </Card>
          </div>

          {!hasBookings && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-start gap-3 p-4 text-sm">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">No booked nights recorded yet</div>
                  <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                    Performance KPIs populate as nights are marked booked on the calendar (with their actual nightly
                    rate). Once your bookings sync, Occupancy, ADR, RevPAR, and Revenue will reflect real results here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenue + occupancy chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Revenue & Occupancy Trend</CardTitle>
              <CardDescription>Monthly booked revenue with occupancy overlay</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.015 250)" />
                  <XAxis dataKey="month" tick={{ fill: "oklch(0.60 0.01 250)", fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: "oklch(0.60 0.01 250)", fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "oklch(0.60 0.01 250)", fontSize: 12 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.15 0.015 250)", border: "1px solid oklch(0.22 0.015 250)", borderRadius: "8px" }}
                    formatter={(v: number, name: string) => name === "Occupancy" ? [`${v}%`, name] : [`$${v.toLocaleString()}`, name]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="oklch(0.65 0.18 200)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="occupancy" name="Occupancy" stroke="oklch(0.72 0.18 170)" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Occupancy</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">ADR</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">RevPAR</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.month} className="border-b border-border/50">
                        <td className="py-2.5 px-3 font-medium">{monthLabel(m.month)} {m.month.slice(0, 4)}</td>
                        <td className="py-2.5 px-3 text-right">{m.occupancyRate}%</td>
                        <td className="py-2.5 px-3 text-right">${m.adr.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right">${m.revpar.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-primary font-medium">${m.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-2.5 px-3">Overall</td>
                      <td className="py-2.5 px-3 text-right">{overall.occupancyRate}%</td>
                      <td className="py-2.5 px-3 text-right">${overall.adr.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right">${overall.revpar.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-primary">${overall.revenue.toLocaleString()}</td>
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
