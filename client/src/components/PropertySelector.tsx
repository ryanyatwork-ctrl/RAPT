import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface PropertySelectorProps {
  value: number | null;
  onChange: (id: number) => void;
  showAddButton?: boolean;
}

export function PropertySelector({ value, onChange, showAddButton = true }: PropertySelectorProps) {
  const { data: properties = [], isLoading } = trpc.property.list.useQuery();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="h-9 w-48 rounded-md bg-muted animate-pulse" />
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">No properties yet</span>
        {showAddButton && (
          <Button size="sm" variant="outline" onClick={() => navigate("/properties")}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Property
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value ? String(value) : ""}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger className="w-52 h-9">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <SelectValue placeholder="Select property..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          {properties.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              <div className="flex flex-col">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.city}, {p.state}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showAddButton && (
        <Button size="sm" variant="ghost" onClick={() => navigate("/properties")} className="h-9 w-9 p-0">
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
