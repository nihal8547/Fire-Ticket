"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  UserX,
  Shield,
  Users,
  Search,
  Check,
  Lock,
  Sparkles,
  KeyRound,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

// Standard permission definitions grouped by module
const PERMISSION_GROUPS = [
  {
    category: "Tickets",
    permissions: [
      { id: "tickets.view", label: "View Tickets" },
      { id: "tickets.create", label: "Create Tickets" },
      { id: "tickets.edit", label: "Edit & Assign Tickets" },
      { id: "tickets.delete", label: "Delete Tickets" },
    ],
  },
  {
    category: "Inspections",
    permissions: [
      { id: "inspections.view", label: "View Inspections" },
      { id: "inspections.create", label: "Create Inspections" },
      { id: "inspections.edit", label: "Edit & Complete Inspections" },
      { id: "inspections.delete", label: "Delete Inspections" },
    ],
  },
  {
    category: "Customers",
    permissions: [
      { id: "customers.view", label: "View Customers" },
      { id: "customers.manage", label: "Create & Edit Customers" },
      { id: "customers.delete", label: "Delete Customers" },
    ],
  },
  {
    category: "Invoices",
    permissions: [
      { id: "invoices.view", label: "View Invoices" },
      { id: "invoices.manage", label: "Create & Edit Invoices" },
      { id: "invoices.delete", label: "Delete Invoices" },
    ],
  },
  {
    category: "Equipment & Assets",
    permissions: [
      { id: "assets.view", label: "View Assets" },
      { id: "assets.manage", label: "Manage Equipment Assets" },
    ],
  },
  {
    category: "Reports & System",
    permissions: [
      { id: "reports.view", label: "View Analytics & Reports" },
      { id: "settings.manage", label: "Manage Settings & Synology Sync" },
    ],
  },
];

const COLOR_PRESETS = [
  { name: "Red", value: "#dc2626" },
  { name: "Blue", value: "#2563eb" },
  { name: "Emerald", value: "#059669" },
  { name: "Amber", value: "#d97706" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Slate", value: "#475569" },
];

export default function UsersAndRolesPage() {
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState("");
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "TECHNICIAN",
    phone: "",
    isActive: true,
  });

  // Roles State
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleForm, setRoleForm] = useState({
    name: "",
    displayName: "",
    description: "",
    color: "#2563eb",
    permissions: [] as string[],
  });

  // Fetch Users and Roles
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = res.ok ? await res.json().catch(() => []) : [];
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (e) {
      console.error("Failed to fetch users:", e);
      setUsers([]);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch roles:", e);
      setRoles([]);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchRoles()]);
    setLoading(false);
  }, [fetchUsers, fetchRoles]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  // Helpers for Roles lookup
  const getRoleDetails = (roleName: string) => {
    const found = roles.find((r) => r.name === roleName);
    if (found) return found;
    return {
      name: roleName,
      displayName: roleName,
      color: "#6b7280",
      description: "",
    };
  };

  // User Actions
  const openAddUser = () => {
    setEditUser(null);
    setUserForm({
      name: "",
      email: "",
      password: "",
      role: roles[0]?.name || "TECHNICIAN",
      phone: "",
      isActive: true,
    });
    setUserError("");
    setUserDialogOpen(true);
  };

  const openEditUser = (user: any) => {
    setEditUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      phone: user.phone || "",
      isActive: user.isActive,
    });
    setUserError("");
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.email) {
      setUserError("Name and email are required");
      return;
    }
    if (!editUser && !userForm.password) {
      setUserError("Password is required for new users");
      return;
    }
    setUserSaving(true);
    setUserError("");

    const payload: any = { ...userForm };
    if (!payload.password) delete payload.password;

    try {
      const res = editUser
        ? await fetch(`/api/users/${editUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        setUserDialogOpen(false);
        refreshAll();
      } else {
        const d = await res.json().catch(() => ({}));
        setUserError(d.error || "Save user failed");
      }
    } catch (err: any) {
      setUserError(err.message || "Network error");
    } finally {
      setUserSaving(false);
    }
  };

  const toggleUserActive = async (user: any) => {
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, isActive: !user.isActive }),
    });
    refreshAll();
  };

  const deleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to permanently delete user "${user.name}"?`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      refreshAll();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to delete user.");
    }
  };

  // Role Actions
  const openAddRole = () => {
    setEditRole(null);
    setRoleForm({
      name: "",
      displayName: "",
      description: "",
      color: "#2563eb",
      permissions: ["tickets.view", "inspections.view"],
    });
    setRoleError("");
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: any) => {
    setEditRole(role);
    let perms: string[] = [];
    try {
      perms = Array.isArray(role.permissionsList)
        ? role.permissionsList
        : JSON.parse(role.permissions || "[]");
    } catch {
      perms = [];
    }
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      color: role.color || "#2563eb",
      permissions: perms,
    });
    setRoleError("");
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.displayName.trim()) {
      setRoleError("Role display name is required");
      return;
    }
    setRoleSaving(true);
    setRoleError("");

    try {
      const res = editRole
        ? await fetch(`/api/roles/${editRole.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(roleForm),
          })
        : await fetch("/api/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(roleForm),
          });

      if (res.ok) {
        setRoleDialogOpen(false);
        refreshAll();
      } else {
        const d = await res.json().catch(() => ({}));
        setRoleError(d.error || "Save role failed");
      }
    } catch (err: any) {
      setRoleError(err.message || "Network error");
    } finally {
      setRoleSaving(false);
    }
  };

  const deleteRole = async (role: any) => {
    if (role.isSystem) {
      alert("Default system roles cannot be deleted.");
      return;
    }
    if (role.userCount > 0) {
      alert(
        `Cannot delete role "${role.displayName}". There are ${role.userCount} active user(s) assigned to this role.`
      );
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete role "${role.displayName}"?`)) return;

    const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
    if (res.ok) {
      refreshAll();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to delete role.");
    }
  };

  const togglePermission = (permId: string) => {
    setRoleForm((prev) => {
      const exists = prev.permissions.includes(permId);
      const next = exists
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: next };
    });
  };

  const toggleAllCategory = (categoryPerms: { id: string }[]) => {
    const allCategoryIds = categoryPerms.map((p) => p.id);
    const allSelected = allCategoryIds.every((id) => roleForm.permissions.includes(id));
    setRoleForm((prev) => {
      if (allSelected) {
        return {
          ...prev,
          permissions: prev.permissions.filter((id) => !allCategoryIds.includes(id)),
        };
      } else {
        const merged = Array.from(new Set([...prev.permissions, ...allCategoryIds]));
        return { ...prev, permissions: merged };
      }
    });
  };

  return (
    <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-red-600" />
            User & Role Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage staff user accounts, create custom roles, and define module permissions
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "users"
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Users ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "roles"
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Roles & Permissions ({roles.length})
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: USERS TAB                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9 h-9 text-xs bg-white"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36 h-9 text-xs bg-white">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={openAddUser} size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-xs text-gray-600">
                  <th className="text-left px-5 py-3 font-semibold">User</th>
                  <th className="text-left px-5 py-3 font-semibold">Role</th>
                  <th className="text-left px-5 py-3 font-semibold">Phone</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 font-semibold">Created</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500 text-xs">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-xs">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleInfo = getRoleDetails(u.role);
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                              style={{ backgroundColor: roleInfo.color || "#dc2626" }}
                            >
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-gray-900 text-sm truncate">{u.name}</p>
                              <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                            style={{
                              backgroundColor: `${roleInfo.color}15`,
                              borderColor: `${roleInfo.color}35`,
                              color: roleInfo.color,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: roleInfo.color }}
                            />
                            {roleInfo.displayName}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 text-xs font-mono">{u.phone || "—"}</td>
                        <td className="px-5 py-3.5">
                          <Badge
                            className={`text-[10px] font-medium ${
                              u.isActive
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditUser(u)}
                              className="h-8 px-2 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Edit user"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserActive(u)}
                              className={`h-8 px-2 gap-1 text-xs ${
                                u.isActive
                                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  : "text-green-600 hover:text-green-700 hover:bg-green-50"
                              }`}
                              title={u.isActive ? "Deactivate user" : "Activate user"}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              {u.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUser(u)}
                              className="h-8 px-2 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: ROLES & PERMISSIONS TAB                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Configured System Roles</h2>
              <p className="text-xs text-gray-500">
                Create custom roles with tailored module permissions or adjust existing roles
              </p>
            </div>
            <Button
              onClick={openAddRole}
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" /> Create Custom Role
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r) => {
              let perms: string[] = [];
              try {
                perms = Array.isArray(r.permissionsList)
                  ? r.permissionsList
                  : JSON.parse(r.permissions || "[]");
              } catch {
                perms = [];
              }

              const isAll = perms.includes("all");

              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: r.color }}
                        />
                        <h3 className="font-bold text-gray-900 text-sm">{r.displayName}</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {r.isSystem ? (
                          <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500">
                            <Lock className="h-2.5 w-2.5 mr-1" /> Built-in
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            <Sparkles className="h-2.5 w-2.5 mr-1" /> Custom
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-gray-700">
                        {r.name}
                      </code>
                      <span>•</span>
                      <span className="font-medium text-gray-700">
                        {r.userCount} {r.userCount === 1 ? "user" : "users"} assigned
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 min-h-[32px]">
                      {r.description || "No description provided for this role."}
                    </p>

                    {/* Permissions summary */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                          Permissions
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {isAll ? "Full Access" : `${perms.length} granted`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {isAll ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-medium">
                            Full Administrator Access
                          </span>
                        ) : perms.length === 0 ? (
                          <span className="text-[10px] text-gray-400 italic">No permissions set</span>
                        ) : (
                          perms.slice(0, 6).map((p) => (
                            <span
                              key={p}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 truncate max-w-[150px]"
                            >
                              {p}
                            </span>
                          ))
                        )}
                        {!isAll && perms.length > 6 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">
                            +{perms.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditRole(r)}
                      className="h-8 px-2.5 text-xs gap-1"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit Role
                    </Button>
                    {!r.isSystem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRole(r)}
                        className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        title={
                          r.userCount > 0
                            ? `Cannot delete: ${r.userCount} users currently assigned`
                            : "Delete role"
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG 1: ADD / EDIT USER                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User Account" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {editUser
                ? "Update user profile details and role assignment"
                : "Create a new user with email and system access role"}
            </DialogDescription>
          </DialogHeader>

          {userError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              {userError}
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Rashid Khan"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="rashid@company.com"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{editUser ? "New Password" : "Password *"}</Label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editUser ? "Leave blank to keep" : "••••••••"}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="+971 50 123 4567"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Assigned Role *</Label>
              <Select
                value={userForm.role}
                onValueChange={(val) => setUserForm({ ...userForm, role: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: r.color }}
                        />
                        <span>{r.displayName}</span>
                        <span className="text-gray-400 text-xs">({r.name})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editUser && (
              <div>
                <Label>Account Status</Label>
                <Select
                  value={userForm.isActive ? "true" : "false"}
                  onValueChange={(val) => setUserForm({ ...userForm, isActive: val === "true" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active Account</SelectItem>
                    <SelectItem value="false">Inactive / Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={userSaving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {userSaving ? "Saving..." : editUser ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG 2: CREATE / EDIT ROLE                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              {editRole ? `Edit Role: ${editRole.displayName}` : "Create Custom Role"}
            </DialogTitle>
            <DialogDescription>
              Define the role identity, badge color, and module-specific permissions
            </DialogDescription>
          </DialogHeader>

          {roleError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              {roleError}
            </div>
          )}

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Role Display Name *</Label>
                <Input
                  value={roleForm.displayName}
                  onChange={(e) => {
                    const disp = e.target.value;
                    setRoleForm((prev) => ({
                      ...prev,
                      displayName: disp,
                      // auto-generate code if creating new role
                      name: editRole
                        ? prev.name
                        : disp.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
                    }));
                  }}
                  placeholder="e.g. Safety Inspector"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Role Code / Identifier *</Label>
                <Input
                  value={roleForm.name}
                  disabled={Boolean(editRole)}
                  onChange={(e) =>
                    setRoleForm({
                      ...roleForm,
                      name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                    })
                  }
                  placeholder="SAFETY_INSPECTOR"
                  className="mt-1 font-mono text-xs uppercase"
                />
                {editRole && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Role identifier code cannot be changed once created
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="What responsibilities and access level does this role have?"
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Color Presets */}
            <div>
              <Label>Badge Color</Label>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setRoleForm({ ...roleForm, color: c.value })}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform ${
                      roleForm.color === c.value
                        ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {roleForm.color === c.value && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-2">
                  <Input
                    type="color"
                    value={roleForm.color}
                    onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                    className="h-7 w-9 p-0.5 cursor-pointer bg-white"
                  />
                  <span className="text-xs font-mono text-gray-500 uppercase">{roleForm.color}</span>
                </div>
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                    Module Permissions Matrix
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Select permissions to grant to users holding this role
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allIds = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.id));
                      setRoleForm({ ...roleForm, permissions: allIds });
                    }}
                    className="h-6 text-[11px] px-2 text-blue-600 hover:text-blue-700"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRoleForm({ ...roleForm, permissions: [] })}
                    className="h-6 text-[11px] px-2 text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {PERMISSION_GROUPS.map((group) => {
                  const allSelected = group.permissions.every((p) =>
                    roleForm.permissions.includes(p.id)
                  );
                  return (
                    <div
                      key={group.category}
                      className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                        <span className="text-xs font-bold text-gray-800">{group.category}</span>
                        <button
                          type="button"
                          onClick={() => toggleAllCategory(group.permissions)}
                          className="text-[10px] font-medium text-blue-600 hover:underline"
                        >
                          {allSelected ? "Deselect group" : "Select group"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((perm) => {
                          const checked = roleForm.permissions.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors ${
                                checked ? "bg-blue-50 text-blue-900 font-medium" : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(perm.id)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{perm.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={roleSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {roleSaving ? "Saving..." : editRole ? "Save Role Changes" : "Create Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
