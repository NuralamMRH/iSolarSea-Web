import React, { useEffect, useState } from "react";
import { User, UserRole, hasPermission } from "../../types/user";
import {
  getAllUsers,
  updateUserProfile,
  updateUserRole,
  approveUser,
} from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { Navigate } from "react-router-dom";

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser, isAuthenticated } = useAuthStore();

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("isAuthenticated:", isAuthenticated);
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    fetchUsers();
  }, []);

  const handleApproveUser = async (userId: string) => {
    try {
      await approveUser(userId);
      toast.success("User approved successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve user");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success("User role updated successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    }
  };

  const handleToggleVerification = async (
    userId: string,
    field: "is_email_verified" | "is_phone_verified"
  ) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      await updateUserProfile(userId, { [field]: !user[field] });
      toast.success("Verification status updated successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error updating verification status:", error);
      toast.error("Failed to update verification status");
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!currentUser || !hasPermission(currentUser, "can_manage_users")) {
    return <div className="p-4">Access denied</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Role</th>
              <th className="px-4 py-2 border">Status</th>
              <th className="px-4 py-2 border">Verifications</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{user.name}</td>
                <td className="px-4 py-2 border">{user.email}</td>
                <td className="px-4 py-2 border">
                  {hasPermission(currentUser, "can_manage_roles") ? (
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleUpdateRole(user.id, e.target.value as UserRole)
                      }
                      className="border rounded p-1"
                    >
                      <option value="VP">VP</option>
                      <option value="VIP">VIP</option>
                      <option value="VVIP">VVIP</option>
                      <option value="manager">Manager</option>
                      {currentUser.role === "super_admin" && (
                        <>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </>
                      )}
                    </select>
                  ) : (
                    user.role
                  )}
                </td>
                <td className="px-4 py-2 border">
                  {user.is_approved ? (
                    <span className="text-green-600">Approved</span>
                  ) : (
                    <button
                      onClick={() => handleApproveUser(user.id)}
                      className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      Approve
                    </button>
                  )}
                </td>
                <td className="px-4 py-2 border">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() =>
                        handleToggleVerification(user.id, "is_email_verified")
                      }
                      className={`px-2 py-1 rounded ${
                        user.is_email_verified ? "bg-green-500" : "bg-gray-300"
                      } text-white`}
                    >
                      Email {user.is_email_verified ? "✓" : "✗"}
                    </button>
                    <button
                      onClick={() =>
                        handleToggleVerification(user.id, "is_phone_verified")
                      }
                      className={`px-2 py-1 rounded ${
                        user.is_phone_verified ? "bg-green-500" : "bg-gray-300"
                      } text-white`}
                    >
                      Phone {user.is_phone_verified ? "✓" : "✗"}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2 border">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        toast({
                          title: "Coming Soon",
                          description: "This feature will be available soon!",
                        })
                      }
                      className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    {hasPermission(currentUser, "can_delete_data") && (
                      <button
                        onClick={() =>
                          toast({
                            title: "Coming Soon",
                            description: "This feature will be available soon!",
                          })
                        }
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
