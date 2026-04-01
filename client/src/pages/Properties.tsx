import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, Edit, Trash2, MapPin, Bed, Bath, Users, DollarSign, Lock } from "lucide-react";
import { useLocation } from "wouter";

const PROPERTY_TYPES = [
  { value: "cabin", label: "Cabin" },
  { value: "house", label: "House" },
  { value: "condo", label: "Condo" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "cottage", label: "Cottage" },
  { value: "other", label: "Other" },
];

interface PropertyForm {
  name: string;
  location: string;
  city: string;
  state: string;
  country: string;
  propertyType: string;
  basePrice: string;
  bedrooms: string;
  bathrooms: string;
  maxGuests: string;
  description: string;
  amenities: string;
}

const defaultForm: PropertyForm = {
  name: "",
  location: "",
  city: "",
  state: "",
  country: "US",
  propertyType: "house",
  basePrice: "",
  bedrooms: "2",
  bathrooms: "1",
  maxGuests: "4",
  description: "",
  amenities: "",
};

export default function Properties() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PropertyForm>(defaultForm);
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();
  const { data: properties = [], isLoading } = trpc.property.list.useQuery();
  const { data: subData } = trpc.subscription.get.useQuery();

  const createProperty = trpc.property.create.useMutation({
    onSuccess: () => {
      toast.success("Property added!");
      utils.property.list.invalidate();
      setShowDialog(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateProperty = trpc.property.update.useMutation({
    onSuccess: () => {
      toast.success("Property updated");
      utils.property.list.invalidate();
      setShowDialog(false);
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteProperty = trpc.property.delete.useMutation({
    onSuccess: () => {
      toast.success("Property deleted");
      utils.property.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.name || !form.basePrice || !form.location) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (editingId) {
      updateProperty.mutate({
        id: editingId,
        name: form.name,
        location: form.location,
        city: form.city,
        state: form.state,
        propertyType: form.propertyType as any,
        basePrice: parseFloat(form.basePrice),
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseInt(form.bathrooms),
        maxGuests: parseInt(form.maxGuests),
        description: form.description,
        amenities: form.amenities.split(",").map(a => a.trim()).filter(Boolean),
      });
    } else {
      createProperty.mutate({
        name: form.name,
        location: form.location,
        city: form.city,
        state: form.state,
        country: form.country,
        propertyType: form.propertyType as any,
        basePrice: parseFloat(form.basePrice),
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseInt(form.bathrooms),
        maxGuests: parseInt(form.maxGuests),
        description: form.description,
        amenities: form.amenities.split(",").map(a => a.trim()).filter(Boolean),
      });
    }
  };

  const handleEdit = (p: typeof properties[0]) => {
    setForm({
      name: p.name,
      location: p.location || "",
      city: p.city || "",
      state: p.state || "",
      country: p.country || "US",
      propertyType: p.propertyType || "house",
      basePrice: String(p.basePrice),
      bedrooms: String(p.bedrooms || 2),
      bathrooms: String(p.bathrooms || 1),
      maxGuests: String(p.maxGuests || 4),
      description: p.description || "",
      amenities: p.amenitiesJson ? JSON.parse(p.amenitiesJson).join(", ") : "",
    });
    setEditingId(p.id);
    setShowDialog(true);
  };

  const tier = subData?.tier || "free";
  const limits = subData?.limits || { maxProperties: 1 };
  const canAddMore = properties.length < limits.maxProperties;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {properties.length} / {limits.maxProperties === 999 ? "∞" : limits.maxProperties} properties
          </p>
        </div>
        <Button
          onClick={() => {
            if (!canAddMore) {
              toast.error(`Your ${tier} plan allows up to ${limits.maxProperties} propert${limits.maxProperties === 1 ? "y" : "ies"}. Upgrade to add more.`);
              navigate("/subscription");
              return;
            }
            setForm(defaultForm);
            setEditingId(null);
            setShowDialog(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Tier limit banner */}
      {!canAddMore && tier !== "advanced" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium text-sm">Property limit reached</div>
                <div className="text-xs text-muted-foreground">
                  {tier === "free" ? "Upgrade to Pro to manage up to 10 properties" : "Upgrade to Advanced for unlimited properties"}
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate("/subscription")}>Upgrade</Button>
          </CardContent>
        </Card>
      )}

      {/* Properties grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : properties.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
            <h3 className="font-semibold text-lg mb-2">No properties yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Add your first property to start getting pricing suggestions and event intelligence.
            </p>
            <Button onClick={() => { setForm(defaultForm); setEditingId(null); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map(p => (
            <Card key={p.id} className="hover:border-primary/40 transition-colors group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{p.name}</CardTitle>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{p.city}, {p.state}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">{p.propertyType}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Bed className="w-3 h-3" />
                    <span>{p.bedrooms} bed</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Bath className="w-3 h-3" />
                    <span>{p.bathrooms} bath</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{p.maxGuests} guests</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Base price</span>
                  <span className="font-bold text-primary flex items-center gap-0.5">
                    <DollarSign className="w-3.5 h-3.5" />{p.basePrice}/night
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                )}

                <div className="flex gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handleEdit(p)}>
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                        deleteProperty.mutate({ id: p.id });
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Property" : "Add Property"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Property Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Pea Ridge Mountain Cabin"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Pea Ridge"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={form.state}
                  onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                  placeholder="e.g. AR"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Full Address / Location *</Label>
              <Input
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="e.g. 123 Mountain View Rd, Pea Ridge, AR"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={form.propertyType} onValueChange={v => setForm(p => ({ ...p, propertyType: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Base Price ($/night) *</Label>
                <Input
                  type="number"
                  value={form.basePrice}
                  onChange={e => setForm(p => ({ ...p, basePrice: e.target.value }))}
                  placeholder="150"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Input type="number" min={1} value={form.bedrooms} onChange={e => setForm(p => ({ ...p, bedrooms: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Input type="number" min={1} value={form.bathrooms} onChange={e => setForm(p => ({ ...p, bathrooms: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Max Guests</Label>
                <Input type="number" min={1} value={form.maxGuests} onChange={e => setForm(p => ({ ...p, maxGuests: e.target.value }))} className="h-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amenities</Label>
              <Input
                value={form.amenities}
                onChange={e => setForm(p => ({ ...p, amenities: e.target.value }))}
                placeholder="hot tub, fire pit, mountain views, pet-friendly..."
              />
              <p className="text-xs text-muted-foreground">Comma-separated list</p>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of your property..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createProperty.isPending || updateProperty.isPending}>
              {editingId ? "Update Property" : "Add Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
