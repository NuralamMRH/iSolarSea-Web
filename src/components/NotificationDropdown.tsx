import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Fish,
  Ship,
  ShoppingCart,
  Users,
  DollarSign,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface NotificationItem {
  id: string;
  type:
    | "catch_record"
    | "fishing_trip"
    | "fishing_haul"
    | "product_order"
    | "vessel_invitation"
    | "vessel_transaction";
  title: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  priority: "low" | "medium" | "high";
  vessel_id?: string;
  related_data?: Record<string, unknown>;
}

interface VesselTransaction {
  id: string;
  seller_vessel_id: string;
  buyer_vessel_id: string;
  catch_record_id: string | null;
  quantity: number;
  unit: string;
  price: number | null;
  currency: string;
  status: string;
  qr_code: string;
  transaction_date: string;
  created_at: string;
  trip_id: string | null;
  type: string | null;
  items?: Record<string, unknown>[] | null;
  seller_vessel?: {
    id: string;
    name: string;
    registration_number: string;
    user_id: string;
    current_zone?: string;
    latitude?: number;
    longitude?: number;
  };
  buyer_vessel?: {
    id: string;
    name: string;
    registration_number: string;
    user_id: string;
    current_zone?: string;
    latitude?: number;
    longitude?: number;
  };
  trip?: {
    id: string;
    trip_code: string;
    to_region: string;
    vessel_id: string;
  };
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<VesselTransaction | null>(null);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const { user } = useAuthStore();
  const subscriptionRef = useRef<any>(null);
  const [pushNotificationPermission, setPushNotificationPermission] = useState<NotificationPermission>('default');

  // Request push notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      setPushNotificationPermission(permission);
      return permission;
    }
    console.log('Notifications not supported in this browser');
    return 'denied';
  };

  // Show browser push notification
  const showPushNotification = (title: string, message: string, data?: any) => {
    if (pushNotificationPermission === 'granted' && 'Notification' in window) {
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'itrucksea-notification',
        data: data,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        // Handle notification click if needed
        if (data?.type === 'vessel_transaction') {
          // Auto-open transaction dialog or navigate to relevant page
        }
      };
    }
  };

  // Setup realtime subscription for notifications
  const setupRealtimeSubscription = () => {
    if (!user?.auth_id || subscriptionRef.current) return;

    console.log('Setting up realtime subscription for user:', user.auth_id);

    subscriptionRef.current = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.auth_id}`,
        },
        (payload: any) => {
          console.log('New notification received:', payload);
          
          const newNotification: NotificationItem = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            timestamp: payload.new.created_at,
            is_read: payload.new.is_read,
            priority: "medium",
            vessel_id: payload.new.related_id,
            related_data: payload.new.related_data || {},
          };

          // Add to notifications state
          setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);

          // Show push notification
          showPushNotification(
            newNotification.title,
            newNotification.message,
            {
              type: newNotification.type,
              id: newNotification.id,
              related_data: newNotification.related_data,
            }
          );

          // Auto-show transaction dialog for new vessel transactions
          if (
            newNotification.type === 'vessel_transaction' &&
            !newNotification.is_read &&
            isNotificationNew(newNotification.timestamp)
          ) {
            handleNotificationClick(newNotification, true);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });
  };

  // Cleanup subscription
  const cleanupSubscription = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  };

  // Check if notification is new (created within 5 minutes)
  const isNotificationNew = (timestamp: string): boolean => {
    const notificationTime = new Date(timestamp);
    const now = new Date();
    const diffInMinutes =
      (now.getTime() - notificationTime.getTime()) / (1000 * 60);
    return diffInMinutes <= 5;
  };

  // Fetch notifications from Supabase
  const fetchNotifications = async () => {
    if (!user?.auth_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.auth_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      const formattedNotifications: NotificationItem[] = data.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        timestamp: item.created_at,
        is_read: item.is_read,
        priority: "medium", // Default priority
        vessel_id: item.related_id,
        related_data: item.related_data || {},
      }));

      setNotifications(formattedNotifications);

      // Check for new vessel_transaction notifications and auto-show dialog
      const newVesselTransactionNotifications = formattedNotifications.filter(
        (notification) =>
          notification.type === "vessel_transaction" &&
          !notification.is_read &&
          isNotificationNew(notification.timestamp)
      );

      if (newVesselTransactionNotifications.length > 0) {
        const notification = newVesselTransactionNotifications[0];
        // Only auto-show if notification is not read
        if (!notification.is_read) {
          await handleNotificationClick(notification, true); // Auto-show
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Handle notification click - fetch transaction details and show dialog
  const handleNotificationClick = async (
    notification: NotificationItem,
    autoShow = false
  ) => {
    // Always mark as read when clicking on notification (unless it's already read and auto-showing)
    if (!autoShow || !notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.type === "vessel_transaction") {
      // For vessel transactions, fetch details and show dialog only if not already read or if auto-showing
      if (!notification.is_read || autoShow) {
        // Fetch vessel transaction details
        if (notification.related_data?.transaction_id) {
          await fetchTransactionDetails(
            notification.related_data.transaction_id as string
          );
        }
      }
    }
  };

  // Fetch vessel transaction details
  const fetchTransactionDetails = async (transactionId: string) => {
    setTransactionLoading(true);
    try {
      const { data, error } = await supabase
        .from("vessel_transactions")
        .select(
          `
          *,
          seller_vessel:vessels!seller_vessel_id(id, name, registration_number, user_id, current_zone, latitude, longitude),
          buyer_vessel:vessels!buyer_vessel_id(id, name, registration_number, user_id, current_zone, latitude, longitude),
          trip:fishing_trips(id, trip_code, to_region, vessel_id)
        `
        )
        .eq("id", transactionId)
        .single();

      if (error) {
        console.error("Error fetching transaction details:", error);
        return;
      }

      setSelectedTransaction(data);
      setShowTransactionDialog(true);
    } catch (error) {
      console.error("Error fetching transaction details:", error);
    } finally {
      setTransactionLoading(false);
    }
  };

  // Function to calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  };

  // Handle accept transaction
  const handleAcceptTransaction = async () => {
    if (!selectedTransaction) return;

    setTransactionLoading(true);
    try {
      // Update transaction status to 4ShareLoading
      const { error: updateError } = await supabase
        .from("vessel_transactions")
        .update({
          status: "4ShareLoading",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", selectedTransaction.id);

      if (updateError) {
        console.error("Error accepting transaction:", updateError);
        return;
      }

      // Mark the related notification as read
      const relatedNotification = notifications.find(
        (n) => n.related_data?.transaction_id === selectedTransaction.id
      );
      if (relatedNotification && !relatedNotification.is_read) {
        await markAsRead(relatedNotification.id);
      }

      // Send notification to seller
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: selectedTransaction.seller_vessel?.user_id || "",
          title: "4ShareLoading Accepted",
          message: `Your 4ShareLoading transaction for ${selectedTransaction.quantity}${selectedTransaction.unit} has been accepted.`,
          type: "transaction_accepted",
          related_id: selectedTransaction.id,
          related_data: { transaction_id: selectedTransaction.id },
        });

      if (notificationError) {
        console.error("Error sending notification:", notificationError);
      }

      // Close dialog and refresh notifications
      setShowTransactionDialog(false);
      setSelectedTransaction(null);
      fetchNotifications();

      // Redirect logic based on current URL path
      const currentPath = window.location.pathname;
      if (currentPath !== '/transportation/4share-loading') {
        // Redirect to 4share-loading page if not already there
        window.location.href = '/transportation/4share-loading';
      }
      // If already on 4share-loading page, stay there (no redirect needed)

    } catch (error) {
      console.error("Error accepting transaction:", error);
    } finally {
      setTransactionLoading(false);
    }
  };

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, user?.auth_id]);

  // Auto-fetch notifications on component mount and setup realtime
  useEffect(() => {
    if (user?.auth_id) {
      fetchNotifications();
      setupRealtimeSubscription();
      
      // Request notification permission on first load
      if (pushNotificationPermission === 'default') {
        requestNotificationPermission();
      }
    }

    // Cleanup subscription on unmount
    return () => {
      cleanupSubscription();
    };
  }, [user?.auth_id]);

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "catch_record":
        return <Fish className="h-4 w-4 text-blue-600" />;
      case "fishing_trip":
        return <Ship className="h-4 w-4 text-green-600" />;
      case "fishing_haul":
        return <Fish className="h-4 w-4 text-purple-600" />;
      case "product_order":
        return <ShoppingCart className="h-4 w-4 text-orange-600" />;
      case "vessel_invitation":
        return <Users className="h-4 w-4 text-indigo-600" />;
      case "vessel_transaction":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-80 max-h-96 overflow-y-auto"
        >
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-3">Notifications</h3>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                      !notification.is_read
                        ? "bg-blue-50 border-blue-200"
                        : "bg-background"
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-sm">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimestamp(notification.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Transaction Details Dialog */}
      <Dialog
        open={showTransactionDialog}
        onOpenChange={setShowTransactionDialog}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Transaction Details
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTransactionDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Review the transaction details and accept if you agree to the
              terms.
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Vessel Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                      SELLER VESSEL
                    </h3>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {selectedTransaction.seller_vessel?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTransaction.seller_vessel?.registration_number}
                      </p>
                      {selectedTransaction.seller_vessel?.current_zone && (
                        <p className="text-xs text-blue-600 font-medium">
                          Zone: {selectedTransaction.seller_vessel.current_zone}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                      BUYER VESSEL
                    </h3>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {selectedTransaction.buyer_vessel?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTransaction.buyer_vessel?.registration_number}
                      </p>
                      {selectedTransaction.buyer_vessel?.current_zone && (
                        <p className="text-xs text-blue-600 font-medium">
                          Zone: {selectedTransaction.buyer_vessel.current_zone}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Details */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                    TRANSACTION SUMMARY
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Transaction Type:</span>
                      <span className="font-medium">
                        {selectedTransaction.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Quantity:</span>
                      <span className="font-medium">
                        {selectedTransaction.quantity}{" "}
                        {selectedTransaction.unit}
                      </span>
                    </div>
                    {selectedTransaction.price && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Price:</span>
                        <span className="font-medium">
                          {selectedTransaction.currency}{" "}
                          {selectedTransaction.price}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Status:</span>
                      <Badge variant="outline">
                        {selectedTransaction.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Transaction Date:</span>
                      <span className="font-medium">
                        {new Date(
                          selectedTransaction.transaction_date
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedTransaction.seller_vessel?.latitude && 
                     selectedTransaction.seller_vessel?.longitude && 
                     selectedTransaction.buyer_vessel?.latitude && 
                     selectedTransaction.buyer_vessel?.longitude && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Distance Between Vessels:</span>
                        <span className="font-medium text-blue-600">
                          {calculateDistance(
                            selectedTransaction.seller_vessel.latitude,
                            selectedTransaction.seller_vessel.longitude,
                            selectedTransaction.buyer_vessel.latitude,
                            selectedTransaction.buyer_vessel.longitude
                          )} km
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Trip Information */}
              {selectedTransaction.trip && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                      TRIP INFORMATION
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Trip Code:</span>
                        <span className="font-medium">
                          {selectedTransaction.trip.trip_code}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Destination:</span>
                        <span className="font-medium">
                          {selectedTransaction.trip.to_region}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTransactionDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAcceptTransaction}
                  disabled={transactionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {transactionLoading ? "Processing..." : "Accept Transaction"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
