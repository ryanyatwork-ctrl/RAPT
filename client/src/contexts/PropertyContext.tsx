import { createContext, useContext, useState, ReactNode } from "react";

interface PropertyContextType {
  selectedPropertyId: number | null;
  setSelectedPropertyId: (id: number | null) => void;
}

const PropertyContext = createContext<PropertyContextType>({
  selectedPropertyId: null,
  setSelectedPropertyId: () => {},
});

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  return (
    <PropertyContext.Provider value={{ selectedPropertyId, setSelectedPropertyId }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  return useContext(PropertyContext);
}
