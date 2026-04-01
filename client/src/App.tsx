import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Pricing from "./pages/Pricing";
import Events from "./pages/Events";
import ListingOptimizer from "./pages/ListingOptimizer";
import Properties from "./pages/Properties";
import Forecast from "./pages/Forecast";
import Subscription from "./pages/Subscription";
import DashboardLayout from "./components/DashboardLayout";

function AppRouter() {
  return (
    <Switch>
      {/* Public landing page */}
      <Route path="/" component={Home} />

      {/* Protected dashboard routes */}
      <Route path="/dashboard">
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/calendar">
        {() => (
          <DashboardLayout>
            <Calendar />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/pricing">
        {() => (
          <DashboardLayout>
            <Pricing />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/events">
        {() => (
          <DashboardLayout>
            <Events />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/listing">
        {() => (
          <DashboardLayout>
            <ListingOptimizer />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/properties">
        {() => (
          <DashboardLayout>
            <Properties />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/forecast">
        {() => (
          <DashboardLayout>
            <Forecast />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/subscription">
        {() => (
          <DashboardLayout>
            <Subscription />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
