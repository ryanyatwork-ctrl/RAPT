import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: users = [], isLoading, refetch } = trpc.admin.listUsers.useQuery();
  const cancelMutation = trpc.admin.cancelUserSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled");
      setShowCancelDialog(false);
      setSelectedUserId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700";
      case "trial":
        return "bg-blue-500/20 text-blue-700";
      case "past_due":
        return "bg-yellow-500/20 text-yellow-700";
      case "cancelled":
      case "unpaid":
        return "bg-red-500/20 text-red-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-gray-500/20 text-gray-700";
      case "pro":
        return "bg-purple-500/20 text-purple-700";
      case "advanced":
        return "bg-amber-500/20 text-amber-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const handleCancelSubscription = () => {
    if (selectedUserId) {
      cancelMutation.mutate({ userId: selectedUserId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Admin Portal</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Accounts & Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Stripe ID</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>
                      <Badge className={getTierColor(user.subscriptionTier)}>
                        {user.subscriptionTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.stripePaymentStatus || "trial")}>
                        {user.stripePaymentStatus || "trial"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {user.stripeCustomerId ? user.stripeCustomerId.substring(0, 12) + "..." : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(user.lastSignedIn), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {user.stripeSubscriptionId && user.stripePaymentStatus !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setShowCancelDialog(true);
                          }}
                          disabled={cancelMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately cancel the user's subscription and downgrade them to the Free tier. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
