import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/auth-store";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Bell,
  Fish,
  Ship,
  ShoppingCart,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Search,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

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
  isRead: boolean;
  priority: "low" | "medium" | "high";
  vesselId?: string;
  vesselName?: string;
  relatedData?: Record<string, unknown>;
}

interface NotificationSettings {
  email_notifications_enabled: boolean;
  email_fishing_logs: boolean;
  email_vessel_updates: boolean;
  email_system_alerts: boolean;
  email_market_updates: boolean;
  email_security_alerts: boolean;
  email_approval_requests: boolean;
  email_daily_reports: boolean;
  email_weekly_reports: boolean;
  sms_notifications_enabled: boolean;
  sms_fishing_logs: boolean;
  sms_vessel_updates: boolean;
  sms_system_alerts: boolean;
  sms_security_alerts: boolean;
  push_notifications_enabled: boolean;
  push_fishing_logs: boolean;
  push_vessel_updates: boolean;
  push_system_alerts: boolean;
  push_security_alerts: boolean;
  can_receive_admin_notifications: boolean;
  can_receive_captain_notifications: boolean;
  can_receive_owner_notifications: boolean;
  can_receive_fleet_notifications: boolean;
  can_receive_processing_notifications: boolean;
}

const NotificationList: React.FC = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<
    NotificationItem[]
  >([]);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch notification settings
  const fetchNotificationSettings = async () => {
    if (!user?.auth_id) return;

    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("auth_id", user.auth_id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching notification settings:", error);
      } else if (data) {
        setNotificationSettings(data);
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  };

  // Fetch notifications from the notifications table
  const fetchNotifications = async () => {
    if (!user?.auth_id) return;

    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.auth_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        toast({
          title: "Error",
          description: "Failed to fetch notifications",
          variant: "destructive",
        });
      } else {
        const notificationItems: NotificationItem[] = (data || []).map(
          (notification) => ({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            timestamp: notification.created_at,
            isRead: notification.is_read,
            priority: notification.priority,
            vesselId: notification.vessel_id,
            relatedData: notification.related_data,
          })
        );

        setNotifications(notificationItems);
        setFilteredNotifications(notificationItems);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Filter notifications
  useEffect(() => {
    let filtered = notifications;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((n) => n.type === filterType);
    }

    // Filter by priority
    if (filterPriority !== "all") {
      filtered = filtered.filter((n) => n.priority === filterPriority);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filterType, filterPriority, searchTerm]);

  // Load notifications on mount
  useEffect(() => {
    fetchNotificationSettings();
    fetchNotifications();
  }, [user?.auth_id]);

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "catch_record":
        return <Fish className="h-5 w-5 text-blue-600" />;
      case "fishing_trip":
        return <Ship className="h-5 w-5 text-green-600" />;
      case "fishing_haul":
        return <Fish className="h-5 w-5 text-purple-600" />;
      case "product_order":
        return <ShoppingCart className="h-5 w-5 text-orange-600" />;
      case "vessel_invitation":
        return <Users className="h-5 w-5 text-indigo-600" />;
      case "vessel_transaction":
        return <DollarSign className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
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
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc("mark_notification_read", {
        notification_id: notificationId,
      });

      if (error) {
        console.error("Error marking notification as read:", error);
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your vessel activities and system alerts
          </p>
        </div>
        <Button
          onClick={fetchNotifications}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="catch_record">Catch Records</SelectItem>
                  <SelectItem value="fishing_trip">Fishing Trips</SelectItem>
                  <SelectItem value="fishing_haul">Fishing Hauls</SelectItem>
                  <SelectItem value="product_order">Product Orders</SelectItem>
                  <SelectItem value="vessel_invitation">
                    Vessel Invitations
                  </SelectItem>
                  <SelectItem value="vessel_transaction">
                    Vessel Transactions
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setFilterType("all");
                  setFilterPriority("all");
                  setSearchTerm("");
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({filteredNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({filteredNotifications.filter((n) => !n.isRead).length})
          </TabsTrigger>
          <TabsTrigger value="high">
            High Priority (
            {filteredNotifications.filter((n) => n.priority === "high").length})
          </TabsTrigger>
          <TabsTrigger value="today">
            Today (
            {
              filteredNotifications.filter((n) => {
                const today = new Date();
                const notificationDate = new Date(n.timestamp);
                return today.toDateString() === notificationDate.toDateString();
              }).length
            }
            )
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground text-center">
                  You're all caught up! No new notifications at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`${
                  !notification.isRead ? "border-blue-200 bg-blue-50" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">
                            {notification.title}
                          </h3>
                          {getPriorityBadge(notification.priority)}
                          {!notification.isRead && (
                            <Badge variant="default" className="bg-blue-600">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {notification.message}
                        </p>
                        {notification.vesselName && (
                          <p className="text-sm text-blue-600">
                            Vessel: {notification.vesselName}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {filteredNotifications.filter((n) => !n.isRead).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground text-center">
                  You have no unread notifications.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications
              .filter((n) => !n.isRead)
              .map((notification) => (
                <Card
                  key={notification.id}
                  className="border-blue-200 bg-blue-50"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">
                              {notification.title}
                            </h3>
                            {getPriorityBadge(notification.priority)}
                            <Badge variant="default" className="bg-blue-600">
                              New
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {notification.message}
                          </p>
                          {notification.vesselName && (
                            <p className="text-sm text-blue-600">
                              Vessel: {notification.vesselName}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="high" className="space-y-4">
          {filteredNotifications.filter((n) => n.priority === "high").length ===
          0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No high priority notifications
                </h3>
                <p className="text-muted-foreground text-center">
                  All your notifications are of normal priority.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications
              .filter((n) => n.priority === "high")
              .map((notification) => (
                <Card
                  key={notification.id}
                  className="border-red-200 bg-red-50"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">
                              {notification.title}
                            </h3>
                            <Badge variant="destructive">High Priority</Badge>
                            {!notification.isRead && (
                              <Badge variant="default" className="bg-blue-600">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">
                            {notification.message}
                          </p>
                          {notification.vesselName && (
                            <p className="text-sm text-blue-600">
                              Vessel: {notification.vesselName}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!notification.isRead && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="today" className="space-y-4">
          {filteredNotifications.filter((n) => {
            const today = new Date();
            const notificationDate = new Date(n.timestamp);
            return today.toDateString() === notificationDate.toDateString();
          }).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No notifications today
                </h3>
                <p className="text-muted-foreground text-center">
                  You have no notifications from today.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications
              .filter((n) => {
                const today = new Date();
                const notificationDate = new Date(n.timestamp);
                return today.toDateString() === notificationDate.toDateString();
              })
              .map((notification) => (
                <Card
                  key={notification.id}
                  className={`${
                    !notification.isRead ? "border-blue-200 bg-blue-50" : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">
                              {notification.title}
                            </h3>
                            {getPriorityBadge(notification.priority)}
                            {!notification.isRead && (
                              <Badge variant="default" className="bg-blue-600">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">
                            {notification.message}
                          </p>
                          {notification.vesselName && (
                            <p className="text-sm text-blue-600">
                              Vessel: {notification.vesselName}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!notification.isRead && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationList;
