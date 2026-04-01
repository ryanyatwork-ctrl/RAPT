import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PropertySelector } from "@/components/PropertySelector";
import { toast } from "sonner";
import { format } from "date-fns";
import { Zap, Plus, Trash2, Edit, MapPin, Calendar, ExternalLink, Search } from "lucide-react";

const SOURCES = [
  { value: "manual", label: "Manual Entry" },
  { value: "eventbrite", label: "Eventbrite" },
  { value: "facebook", label: "Facebook Events" },
  { value: "city_calendar", label: "City Calendar" },
  { value: "sports", label: "Sports Schedule" },
  { value: "festival", label: "Festival" },
  { value: "conference", label: "Conference" },
  { value: "other", label: "Other" },
];

const CATEGORIES = [
  { value: "sports", label: "Sports" },
  { value: "music", label: "Music" },
  { value: "festival", label: "Festival" },
  { value: "conference", label: "Conference" },
  { value: "holiday", label: "Holiday" },
  { value: "local", label: "Local Event" },
  { value: "other", label: "Other" },
];

const IMPACT_COLORS: Record<string, string> = {
  high: "border-red-500/30 text-red-400 bg-red-500/10",
  medium: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
  low: "border-blue-500/30 text-blue-400 bg-blue-500/10",
};

interface EventFormData {
  title: string;
  description: string;
  source: string;
  category: string;
  startDate: string;
  endDate: string;
  demandImpact: "high" | "medium" | "low";
  demandScore: number;
  expectedAttendance: string;
  venue: string;
  url: string;
}

const defaultForm: EventFormData = {
  title: "",
  description: "",
  source: "manual",
  category: "other",
  startDate: "",
  endDate: "",
  demandImpact: "medium",
  demandScore: 5,
  expectedAttendance: "",
  venue: "",
  url: "",
};

export default function Events() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventFormData>(defaultForm);
  const [search, setSearch] = useState("");

  const { data: properties = [] } = trpc.property.list.useQuery();

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const utils = trpc.useUtils();

  const { data: events = [], isLoading } = trpc.events.list.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );

  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Event added successfully");
      utils.events.list.invalidate();
      setShowDialog(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Event updated");
      utils.events.list.invalidate();
      setShowDialog(false);
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Event deleted");
      utils.events.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!selectedPropertyId || !form.title || !form.startDate || !form.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (editingId) {
      updateEvent.mutate({
        id: editingId,
        title: form.title,
        description: form.description,
        demandImpact: form.demandImpact,
        demandScore: form.demandScore,
        startDate: form.startDate,
        endDate: form.endDate,
      });
    } else {
      createEvent.mutate({
        propertyId: selectedPropertyId,
        title: form.title,
        description: form.description,
        source: form.source as any,
        category: form.category as any,
        startDate: form.startDate,
        endDate: form.endDate,
        demandImpact: form.demandImpact,
        demandScore: form.demandScore,
        expectedAttendance: form.expectedAttendance ? parseInt(form.expectedAttendance) : undefined,
        venue: form.venue,
        url: form.url,
      });
    }
  };

  const handleEdit = (event: typeof events[0]) => {
    setForm({
      title: event.title,
      description: event.description || "",
      source: event.source,
      category: event.category,
      startDate: format(new Date(event.startDate), "yyyy-MM-dd"),
      endDate: format(new Date(event.endDate), "yyyy-MM-dd"),
      demandImpact: event.demandImpact as "high" | "medium" | "low",
      demandScore: parseFloat(String(event.demandScore || "5")),
      expectedAttendance: event.expectedAttendance ? String(event.expectedAttendance) : "",
      venue: event.venue || "",
      url: event.url || "",
    });
    setEditingId(event.id);
    setShowDialog(true);
  };

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    (e.venue && e.venue.toLowerCase().includes(search.toLowerCase()))
  );

  const upcomingEvents = filteredEvents.filter(e => new Date(e.endDate) >= new Date());
  const pastEvents = filteredEvents.filter(e => new Date(e.endDate) < new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Event Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track local events that drive demand</p>
        </div>
        <PropertySelector value={selectedPropertyId} onChange={setSelectedPropertyId} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Events", value: events.length, color: "text-foreground" },
          { label: "High Impact", value: events.filter(e => e.demandImpact === "high").length, color: "text-red-400" },
          { label: "Upcoming", value: upcomingEvents.length, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button onClick={() => { setForm(defaultForm); setEditingId(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Events list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : (
        <>
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Upcoming ({upcomingEvents.length})</h3>
              <div className="space-y-2">
                {upcomingEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => handleEdit(event)}
                    onDelete={() => deleteEvent.mutate({ id: event.id })}
                  />
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Past ({pastEvents.length})</h3>
              <div className="space-y-2 opacity-60">
                {pastEvents.slice(0, 5).map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => handleEdit(event)}
                    onDelete={() => deleteEvent.mutate({ id: event.id })}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredEvents.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Zap className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
                <h3 className="font-semibold mb-2">No events yet</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                  Add local events to improve demand scoring and pricing accuracy. Events from concerts to sports games all affect short-term rental demand.
                </p>
                <Button onClick={() => { setForm(defaultForm); setEditingId(null); setShowDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Event
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Event" : "Add Local Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Event Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Bikes, Blues & BBQ Festival"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(p => ({ ...p, startDate: e.target.value, endDate: p.endDate || e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Demand Impact</Label>
                <Select value={form.demandImpact} onValueChange={v => setForm(p => ({ ...p, demandImpact: v as any }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Impact</SelectItem>
                    <SelectItem value="medium">Medium Impact</SelectItem>
                    <SelectItem value="low">Low Impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Attendance</Label>
                <Input
                  type="number"
                  value={form.expectedAttendance}
                  onChange={e => setForm(p => ({ ...p, expectedAttendance: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Venue / Location</Label>
              <Input
                value={form.venue}
                onChange={e => setForm(p => ({ ...p, venue: e.target.value }))}
                placeholder="e.g. Walmart AMP, Rogers AR"
              />
            </div>

            <div className="space-y-2">
              <Label>Event URL (optional)</Label>
              <Input
                value={form.url}
                onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of the event..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createEvent.isPending || updateEvent.isPending}>
              {editingId ? "Update Event" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({ event, onEdit, onDelete }: {
  event: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const impactClass = IMPACT_COLORS[event.demandImpact] || IMPACT_COLORS.low;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors group">
      <div className={`w-2 h-full min-h-10 rounded-full flex-shrink-0 ${
        event.demandImpact === "high" ? "bg-red-400" :
        event.demandImpact === "medium" ? "bg-yellow-400" : "bg-blue-400"
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{event.title}</span>
          <Badge variant="outline" className={`text-xs ${impactClass}`}>
            {event.demandImpact}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {event.category}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(event.startDate), "MMM d")}
            {event.startDate !== event.endDate && ` – ${format(new Date(event.endDate), "MMM d")}`}
          </span>
          {event.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {event.venue}
            </span>
          )}
          <span className="capitalize">{event.source.replace("_", " ")}</span>
          {event.expectedAttendance && (
            <span>{event.expectedAttendance.toLocaleString()} expected</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {event.url && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
            <a href={event.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
