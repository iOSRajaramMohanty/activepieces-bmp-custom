import { PlatformRole } from '@activepieces/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import {
  Users,
  Building2,
  FolderKanban,
  TrendingUp,
  Shield,
  UserCog,
  Mail,
  Calendar,
  Activity,
  Hash,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { DashboardPageHeader } from '@/app/components/dashboard-page-header';
import { DataTable } from '@/components/custom/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
import { TruncatedColumnTextValue } from '@/components/custom/data-table/truncated-column-text-value';
import { FormattedDate } from '@/components/custom/formatted-date';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { superAdminHooks } from '@/hooks/super-admin-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { superAdminApi, AccountSwitchingActivity } from '@/lib/super-admin-api';
import type { SuperAdminPlatform, SuperAdminUser } from '@/lib/super-admin-api';

import { CreateTenantDialog } from './create-tenant-dialog';

// Separate component for platform actions cell to handle hooks properly
function PlatformActionsCell({
  platform,
  currentPlatformId,
  onSwitch,
  onDelete,
  isSwitchPending,
  isDeletePending,
}: {
  platform: SuperAdminPlatform;
  currentPlatformId: string | null;
  onSwitch: (platformId: string) => void;
  onDelete: (platformId: string) => void;
  isSwitchPending: boolean;
  isDeletePending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isOwnPlatform = platform.id === currentPlatformId;

  return (
    <div className="flex justify-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="hover:bg-accent"
        onClick={() => onSwitch(platform.id)}
        disabled={isSwitchPending}
        title={t('Switch to tenant account')}
      >
        <ArrowRight className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={isOwnPlatform}
            title={
              isOwnPlatform
                ? t('Cannot delete your own platform')
                : t('Delete tenant')
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              {t('Delete Tenant')}
            </DialogTitle>
            <DialogDescription>
              <p className="mb-2">
                {t('Are you sure you want to delete tenant "{{name}}"?', {
                  name: platform.name,
                })}
              </p>
              <p className="font-semibold mb-2">
                {t('This will permanently delete:')}
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('The platform/tenant')}</li>
                <li>{`${platform.userCount} ${t('user(s)')}`}</li>
                <li>{`${platform.projectCount} ${t('project(s)')}`}</li>
                <li>{t('All flows and connections')}</li>
                <li>{t('All execution history')}</li>
              </ul>
              <p className="mt-4 font-semibold text-destructive">
                {t('This action cannot be undone!')}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(platform.id);
                setOpen(false);
              }}
              disabled={isDeletePending}
            >
              {isDeletePending ? t('Deleting...') : t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component for user actions cell to handle hooks properly
function UserActionsCell({
  user,
  currentUserId,
  onDelete,
  isDeletePending,
}: {
  user: SuperAdminUser;
  currentUserId: string | undefined;
  onDelete: (userId: string) => void;
  isDeletePending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isSuperAdmin = user.platformRole === PlatformRole.SUPER_ADMIN;
  const isCurrentUser = user.id === currentUserId;
  const canDelete = isSuperAdmin && !isCurrentUser;

  return (
    <div className="flex justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={!canDelete}
            title={
              !canDelete
                ? isCurrentUser
                  ? t('Cannot delete your own account')
                  : t('Only super admins can be deleted')
                : t('Delete user')
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              {t('Delete Super Admin')}
            </DialogTitle>
            <DialogDescription>
              <p className="mb-2">
                {t('Are you sure you want to delete super admin "{{email}}"?', {
                  email: user.email,
                })}
              </p>
              <p className="font-semibold mb-2">
                {t('This will permanently delete:')}
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('The super admin user account')}</li>
                <li>{t('All projects owned by this super admin')}</li>
              </ul>
              <p className="mt-4 font-semibold text-green-600">
                {t(
                  'Note: Owners (tenants) created by this super admin will be preserved.',
                )}
              </p>
              <p className="mt-4 font-semibold text-destructive">
                {t('This action cannot be undone!')}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(user.id);
                setOpen(false);
              }}
              disabled={isDeletePending}
            >
              {isDeletePending ? t('Deleting...') : t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { data: currentUser } = userHooks.useCurrentUser();
  const currentPlatformId = authenticationSession.getPlatformId();
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = superAdminHooks.useSystemStats();
  const {
    data: platforms,
    isLoading: platformsLoading,
    refetch: refetchPlatforms,
  } = superAdminHooks.useAllPlatforms();
  const {
    data: users,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = superAdminHooks.useAllUsers();
  const { data: projects, isLoading: projectsLoading } =
    superAdminHooks.useAllProjects();
  const {
    data: activities,
    isLoading: activitiesLoading,
    refetch: refetchActivities,
  } = useQuery<AccountSwitchingActivity[]>({
    queryKey: ['account-switching-activities'],
    queryFn: () => superAdminApi.getAccountSwitchingActivities(100),
  });

  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(
    null,
  );

  const deleteTenantMutation = useMutation({
    mutationFn: (platformId: string) => superAdminApi.deleteTenant(platformId),
    onSuccess: (data) => {
      toast.success(t('Success'), {
        description: data.message,
        duration: 3000,
      });
      refetchPlatforms();
      refetchStats();
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error(t('Error'), {
        description:
          error?.response?.data?.message || t('Failed to delete tenant'),
        duration: 3000,
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => superAdminApi.deleteUser(userId),
    onSuccess: (data) => {
      toast.success(t('Success'), {
        description: data.message,
        duration: 3000,
      });
      refetchUsers();
      refetchStats();
    },
    onError: (error: any) => {
      toast.error(t('Error'), {
        description:
          error?.response?.data?.message || t('Failed to delete user'),
        duration: 3000,
      });
    },
  });

  // Group users by Platform -> Organization
  const userGroups = useMemo(() => {
    if (!users) return {};

    const platformGroups: Record<string, Record<string, typeof users>> = {};

    users.forEach((user) => {
      const platformName = user.platformName || 'Unknown Platform';
      const orgName = user.organizationName || 'Other';

      if (!platformGroups[platformName]) {
        platformGroups[platformName] = {};
      }

      if (!platformGroups[platformName][orgName]) {
        platformGroups[platformName][orgName] = [];
      }

      platformGroups[platformName][orgName].push(user);
    });

    // Sort users within each org group by environment and role
    Object.keys(platformGroups).forEach((platformName) => {
      Object.keys(platformGroups[platformName]).forEach((orgName) => {
        platformGroups[platformName][orgName].sort((a, b) => {
          // Get environment from API response
          const aEnv = a.environment || '';
          const bEnv = b.environment || '';

          // Define environment order
          const envOrder: Record<string, number> = {
            Dev: 1,
            Staging: 2,
            Production: 3,
            '': 99,
          };

          const aEnvOrder = envOrder[aEnv] || 99;
          const bEnvOrder = envOrder[bEnv] || 99;

          // Define role order
          const roleOrder: Record<string, number> = {
            OWNER: 0,
            ADMIN: 1,
            OPERATOR: 2,
            MEMBER: 3,
          };

          const aRoleOrder = roleOrder[a.platformRole] || 99;
          const bRoleOrder = roleOrder[b.platformRole] || 99;

          // Composite sort key: environment * 10 + role
          const aComposite = aEnvOrder * 10 + aRoleOrder;
          const bComposite = bEnvOrder * 10 + bRoleOrder;

          return aComposite - bComposite;
        });
      });
    });

    return platformGroups;
  }, [users]);

  // Expand/collapse state for platform groups
  const [expandedPlatformGroups, setExpandedPlatformGroups] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(userGroups).forEach((platform) => {
      initial[platform] = true;
    });
    return initial;
  });

  // Expand/collapse state for organization groups within platforms
  const [expandedOrgGroups, setExpandedOrgGroups] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(userGroups).forEach((platform) => {
      Object.keys(userGroups[platform]).forEach((org) => {
        initial[`${platform}-${org}`] = true;
      });
    });
    return initial;
  });

  const togglePlatformGroup = (platformName: string) => {
    setExpandedPlatformGroups((prev) => ({
      ...prev,
      [platformName]: !prev[platformName],
    }));
  };

  const toggleOrgGroup = (platformName: string, orgName: string) => {
    setExpandedOrgGroups((prev) => ({
      ...prev,
      [`${platformName}-${orgName}`]: !prev[`${platformName}-${orgName}`],
    }));
  };

  // Group projects by Platform -> Organization
  const projectGroups = useMemo(() => {
    if (!projects) return {};

    const platformGroups: Record<string, Record<string, typeof projects>> = {};

    projects.forEach((project) => {
      const platformName = project.platformName || 'Unknown Platform';
      const orgName = project.organizationName || 'Other';

      if (!platformGroups[platformName]) {
        platformGroups[platformName] = {};
      }

      if (!platformGroups[platformName][orgName]) {
        platformGroups[platformName][orgName] = [];
      }

      platformGroups[platformName][orgName].push(project);
    });

    // Sort projects within each org group by displayName
    Object.keys(platformGroups).forEach((platformName) => {
      Object.keys(platformGroups[platformName]).forEach((orgName) => {
        platformGroups[platformName][orgName].sort((a, b) => {
          // Extract environment from project displayName
          const aEnvMatch = a.displayName.match(/(Dev|Staging|Production)/i);
          const bEnvMatch = b.displayName.match(/(Dev|Staging|Production)/i);

          const envOrder: Record<string, number> = {
            Dev: 1,
            Staging: 2,
            Production: 3,
          };

          const aEnvOrder = aEnvMatch ? envOrder[aEnvMatch[1]] || 99 : 99;
          const bEnvOrder = bEnvMatch ? envOrder[bEnvMatch[1]] || 99 : 99;

          if (aEnvOrder !== bEnvOrder) {
            return aEnvOrder - bEnvOrder;
          }

          return a.displayName.localeCompare(b.displayName);
        });
      });
    });

    return platformGroups;
  }, [projects]);

  // Expand/collapse state for platform groups in projects tab
  const [expandedProjectPlatformGroups, setExpandedProjectPlatformGroups] =
    useState<Record<string, boolean>>(() => {
      const initial: Record<string, boolean> = {};
      Object.keys(projectGroups).forEach((platform) => {
        initial[platform] = true;
      });
      return initial;
    });

  // Expand/collapse state for organization groups within platforms in projects tab
  const [expandedProjectOrgGroups, setExpandedProjectOrgGroups] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(projectGroups).forEach((platform) => {
      Object.keys(projectGroups[platform]).forEach((org) => {
        initial[`${platform}-${org}`] = true;
      });
    });
    return initial;
  });

  const toggleProjectPlatformGroup = (platformName: string) => {
    setExpandedProjectPlatformGroups((prev) => ({
      ...prev,
      [platformName]: !prev[platformName],
    }));
  };

  const toggleProjectOrgGroup = (platformName: string, orgName: string) => {
    setExpandedProjectOrgGroups((prev) => ({
      ...prev,
      [`${platformName}-${orgName}`]: !prev[`${platformName}-${orgName}`],
    }));
  };

  const switchToTenantMutation = useMutation({
    mutationFn: (platformId: string) =>
      superAdminApi.switchToTenant(platformId),
    onSuccess: (data) => {
      // Push current session to stack before switching
      const currentUserId = authenticationSession.getCurrentUserId();
      const currentPlatformId = authenticationSession.getPlatformId();
      authenticationSession.pushSwitchSession({
        token: authenticationSession.getToken()!,
        projectId: authenticationSession.getProjectId(),
        switchType: 'SUPER_ADMIN_TO_OWNER',
        userId: currentUserId!,
        platformId: currentPlatformId,
      });
      // Save new session
      authenticationSession.saveResponse(data, false);
      toast.success(t('Switched to tenant account'));
      // Redirect to owner dashboard
      window.location.href = '/owner-dashboard';
    },
    onError: (error: any) => {
      toast.error(t('Error'), {
        description:
          error?.response?.data?.message ||
          t('Failed to switch to tenant account'),
        duration: 3000,
      });
    },
  });

  // Check if user is super admin
  if (currentUser?.platformRole !== PlatformRole.SUPER_ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Shield className="size-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t('Access Denied')}</h1>
        <p className="text-muted-foreground">
          {t('You must be a super admin to access this page')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-4">
      <DashboardPageHeader
        title={t('Super Admin Dashboard')}
        description={t(
          'View and manage all platforms, users, and projects across the system',
        )}
      >
        <CreateTenantDialog
          onSuccess={() => {
            // Refresh data after creating tenant
          }}
        >
          <Button size="default">
            <Building2 className="mr-2 h-4 w-4" />
            {t('Create New Tenant')}
          </Button>
        </CreateTenantDialog>
      </DashboardPageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('Total Platforms')}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.totalPlatforms ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('Total Users')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading
                ? '...'
                : (() => {
                    // Calculate total from displayed roles only
                    // Use Number() to ensure numeric addition (API may return strings)
                    const superAdmins = Number(stats?.totalSuperAdmins) || 0;
                    const owners = Number(stats?.totalOwners) || 0;
                    const admins = Number(stats?.totalAdmins) || 0;
                    const operators = Number(stats?.totalOperators) || 0;
                    const members = Number(stats?.totalMembers) || 0;
                    // Sum all role counts
                    const displayedTotal =
                      superAdmins + owners + admins + operators + members;
                    return displayedTotal;
                  })()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const parts: string[] = [];
                // Use Number() to ensure proper comparison (API may return strings)
                const superAdmins = Number(stats?.totalSuperAdmins) || 0;
                const owners = Number(stats?.totalOwners) || 0;
                const admins = Number(stats?.totalAdmins) || 0;
                const operators = Number(stats?.totalOperators) || 0;
                const members = Number(stats?.totalMembers) || 0;

                // Only show roles with count > 0
                if (superAdmins > 0) {
                  parts.push(`${superAdmins} ${t('super admins')}`);
                }
                if (owners > 0) {
                  parts.push(`${owners} ${t('owners')}`);
                }
                if (admins > 0) {
                  parts.push(`${admins} ${t('admins')}`);
                }
                if (operators > 0) {
                  parts.push(`${operators} ${t('operators')}`);
                }
                if (members > 0) {
                  parts.push(`${members} ${t('members')}`);
                }

                return parts.length > 0 ? parts.join(', ') : t('No users');
              })()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('Total Projects')}
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.totalProjects ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('Total Flows')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.totalFlows ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="platforms" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="platforms">
            <Building2 className="mr-2 h-4 w-4" />
            {t('Platforms')}
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            {t('Users')}
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderKanban className="mr-2 h-4 w-4" />
            {t('Projects')}
          </TabsTrigger>
          <TabsTrigger value="activities">
            <Activity className="mr-2 h-4 w-4" />
            {t('Account Switching')}
          </TabsTrigger>
        </TabsList>

        {/* Platforms Tab */}
        <TabsContent value="platforms" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('All Platforms')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                emptyStateTextTitle={t('No platforms found')}
                emptyStateTextDescription={t(
                  'There are no platforms in the system',
                )}
                emptyStateIcon={<Building2 className="size-14" />}
                columns={[
                  {
                    accessorKey: 'name',
                    size: 200,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Platform Name')}
                        icon={Building2}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <TruncatedColumnTextValue value={row.original.name} />
                      );
                    },
                  },
                  {
                    accessorKey: 'owner_email',
                    size: 200,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Owner Email')}
                        icon={Mail}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <TruncatedColumnTextValue
                          value={row.original.owner_email}
                        />
                      );
                    },
                  },
                  {
                    accessorKey: 'userCount',
                    size: 100,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Users')}
                        icon={Users}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <div className="text-center">
                          {row.original.userCount}
                        </div>
                      );
                    },
                  },
                  {
                    accessorKey: 'projectCount',
                    size: 100,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Projects')}
                        icon={FolderKanban}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <div className="text-center">
                          {row.original.projectCount}
                        </div>
                      );
                    },
                  },
                  {
                    accessorKey: 'created',
                    size: 150,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Created')}
                        icon={Calendar}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <div className="text-left">
                          <FormattedDate
                            date={new Date(row.original.created)}
                          />
                        </div>
                      );
                    },
                  },
                  {
                    id: 'actions',
                    size: 100,
                    header: () => (
                      <div className="text-center">{t('Actions')}</div>
                    ),
                    cell: ({ row }) => (
                      <PlatformActionsCell
                        platform={row.original}
                        currentPlatformId={currentPlatformId}
                        onSwitch={(platformId) =>
                          switchToTenantMutation.mutate(platformId)
                        }
                        onDelete={(platformId) =>
                          deleteTenantMutation.mutate(platformId)
                        }
                        isSwitchPending={switchToTenantMutation.isPending}
                        isDeletePending={deleteTenantMutation.isPending}
                      />
                    ),
                  },
                ]}
                page={{
                  data: platforms ?? [],
                  next: null,
                  previous: null,
                }}
                hidePagination={true}
                isLoading={platformsLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          {usersLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  {t('Loading users...')}
                </div>
              </CardContent>
            </Card>
          ) : Object.keys(userGroups).length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <Users className="size-14 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold">{t('No users found')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('There are no users in the system')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(userGroups).map(([platformName, orgGroups]) => {
                const platformUserCount = Object.values(orgGroups).reduce(
                  (sum, users) => sum + users.length,
                  0,
                );
                const isPlatformExpanded = expandedPlatformGroups[platformName];

                return (
                  <Card key={platformName}>
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => togglePlatformGroup(platformName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isPlatformExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                          <Building2 className="size-4" />
                          <CardTitle className="text-lg">
                            {platformName} {t('Platform')}
                          </CardTitle>
                          <span className="text-sm text-muted-foreground">
                            ({platformUserCount} {t('users')})
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    {isPlatformExpanded && (
                      <CardContent className="space-y-6">
                        {Object.entries(orgGroups).map(
                          ([orgName, orgUsers]) => {
                            const isOrgExpanded =
                              expandedOrgGroups[`${platformName}-${orgName}`];
                            const adminCount = orgUsers.filter(
                              (u) => u.platformRole === 'ADMIN',
                            ).length;
                            const operatorCount = orgUsers.filter(
                              (u) => u.platformRole === 'OPERATOR',
                            ).length;
                            const memberCount = orgUsers.filter(
                              (u) => u.platformRole === 'MEMBER',
                            ).length;
                            const ownerCount = orgUsers.filter(
                              (u) => u.platformRole === 'OWNER',
                            ).length;

                            return (
                              <div
                                key={`${platformName}-${orgName}`}
                                className="border rounded-lg"
                              >
                                <div
                                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() =>
                                    toggleOrgGroup(platformName, orgName)
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    {isOrgExpanded ? (
                                      <ChevronDown className="size-4" />
                                    ) : (
                                      <ChevronRight className="size-4" />
                                    )}
                                    <span className="font-semibold">
                                      {orgName} {t('Group')}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      ({orgUsers.length} {t('users')})
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    {ownerCount > 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                        {ownerCount}{' '}
                                        {ownerCount === 1
                                          ? t('Owner')
                                          : t('Owners')}
                                      </span>
                                    )}
                                    {adminCount > 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        {adminCount}{' '}
                                        {adminCount === 1
                                          ? t('Admin')
                                          : t('Admins')}
                                      </span>
                                    )}
                                    {operatorCount > 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        {operatorCount}{' '}
                                        {operatorCount === 1
                                          ? t('Operator')
                                          : t('Operators')}
                                      </span>
                                    )}
                                    {memberCount > 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {memberCount}{' '}
                                        {memberCount === 1
                                          ? t('Member')
                                          : t('Members')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {isOrgExpanded && (
                                  <div className="border-t">
                                    <DataTable
                                      emptyStateTextTitle={t('No users')}
                                      emptyStateTextDescription={t(
                                        'This organization has no users',
                                      )}
                                      emptyStateIcon={
                                        <Users className="size-14" />
                                      }
                                      columns={[
                                        {
                                          accessorKey: 'email',
                                          size: 200,
                                          header: ({ column }) => (
                                            <DataTableColumnHeader
                                              column={column}
                                              title={t('Email')}
                                              icon={Mail}
                                            />
                                          ),
                                          cell: ({ row }) => {
                                            const envName =
                                              row.original.environment || 'N/A';
                                            return (
                                              <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                                  {envName}
                                                </span>
                                                <TruncatedColumnTextValue
                                                  value={row.original.email}
                                                />
                                              </div>
                                            );
                                          },
                                        },
                                        {
                                          accessorKey: 'name',
                                          size: 150,
                                          header: ({ column }) => (
                                            <DataTableColumnHeader
                                              column={column}
                                              title={t('Name')}
                                              icon={UserCog}
                                            />
                                          ),
                                          cell: ({ row }) => {
                                            return (
                                              <TruncatedColumnTextValue
                                                value={`${row.original.firstName} ${row.original.lastName}`}
                                              />
                                            );
                                          },
                                        },
                                        {
                                          accessorKey: 'platformRole',
                                          size: 120,
                                          header: ({ column }) => (
                                            <DataTableColumnHeader
                                              column={column}
                                              title={t('Role')}
                                              icon={Shield}
                                            />
                                          ),
                                          cell: ({ row }) => {
                                            const role =
                                              row.original.platformRole;
                                            return (
                                              <div className="text-left">
                                                <span
                                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    role === 'SUPER_ADMIN'
                                                      ? 'bg-purple-100 text-purple-800'
                                                      : role === 'OWNER'
                                                      ? 'bg-indigo-100 text-indigo-800'
                                                      : role === 'ADMIN'
                                                      ? 'bg-blue-100 text-blue-800'
                                                      : role === 'OPERATOR'
                                                      ? 'bg-green-100 text-green-800'
                                                      : 'bg-gray-100 text-gray-800'
                                                  }`}
                                                >
                                                  {role === 'SUPER_ADMIN'
                                                    ? t('Super Admin')
                                                    : role === 'OWNER'
                                                    ? t('Owner')
                                                    : role === 'ADMIN'
                                                    ? t('Admin')
                                                    : role === 'OPERATOR'
                                                    ? t('Operator')
                                                    : t('Member')}
                                                </span>
                                              </div>
                                            );
                                          },
                                        },
                                        {
                                          accessorKey: 'status',
                                          size: 100,
                                          header: ({ column }) => (
                                            <DataTableColumnHeader
                                              column={column}
                                              title={t('Status')}
                                              icon={Activity}
                                            />
                                          ),
                                          cell: ({ row }) => {
                                            return (
                                              <div className="text-left">
                                                <span
                                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    row.original.status ===
                                                    'ACTIVE'
                                                      ? 'bg-green-100 text-green-800'
                                                      : 'bg-red-100 text-red-800'
                                                  }`}
                                                >
                                                  {row.original.status ===
                                                  'ACTIVE'
                                                    ? t('Active')
                                                    : t('Inactive')}
                                                </span>
                                              </div>
                                            );
                                          },
                                        },
                                        {
                                          accessorKey: 'externalId',
                                          size: 120,
                                          header: ({ column }) => (
                                            <DataTableColumnHeader
                                              column={column}
                                              title={t('External ID')}
                                              icon={Hash}
                                            />
                                          ),
                                          cell: ({ row }) => {
                                            return (
                                              <div className="text-left">
                                                {row.original.externalId || '-'}
                                              </div>
                                            );
                                          },
                                        },
                                        {
                                          accessorKey: 'created',
                                          size: 150,
                                          header: ({ column }) => (
                                            <DataTableColumnHeader
                                              column={column}
                                              title={t('Created')}
                                              icon={Calendar}
                                            />
                                          ),
                                          cell: ({ row }) => {
                                            return (
                                              <div className="text-left">
                                                <FormattedDate
                                                  date={
                                                    new Date(
                                                      row.original.created,
                                                    )
                                                  }
                                                />
                                              </div>
                                            );
                                          },
                                        },
                                        {
                                          id: 'actions',
                                          size: 100,
                                          header: () => (
                                            <div className="text-center">
                                              {t('Actions')}
                                            </div>
                                          ),
                                          cell: ({ row }) => (
                                            <UserActionsCell
                                              user={row.original}
                                              currentUserId={currentUser?.id}
                                              onDelete={(userId) =>
                                                deleteUserMutation.mutate(
                                                  userId,
                                                )
                                              }
                                              isDeletePending={
                                                deleteUserMutation.isPending
                                              }
                                            />
                                          ),
                                        },
                                      ]}
                                      page={{
                                        data: orgUsers,
                                        next: null,
                                        previous: null,
                                      }}
                                      hidePagination={true}
                                      isLoading={false}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-4">
          {projectsLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  {t('Loading projects...')}
                </div>
              </CardContent>
            </Card>
          ) : Object.keys(projectGroups).length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <FolderKanban className="size-14 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold">{t('No projects found')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('There are no projects in the system')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(projectGroups).map(
                ([platformName, orgGroups]) => {
                  const platformProjectCount = Object.values(orgGroups).reduce(
                    (sum, projects) => sum + projects.length,
                    0,
                  );
                  const isPlatformExpanded =
                    expandedProjectPlatformGroups[platformName];

                  return (
                    <Card key={platformName}>
                      <CardHeader
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleProjectPlatformGroup(platformName)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isPlatformExpanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                            <Building2 className="size-4" />
                            <CardTitle className="text-lg">
                              {platformName} {t('Platform')}
                            </CardTitle>
                            <span className="text-sm text-muted-foreground">
                              ({platformProjectCount} {t('projects')})
                            </span>
                          </div>
                        </div>
                      </CardHeader>

                      {isPlatformExpanded && (
                        <CardContent className="space-y-6">
                          {Object.entries(orgGroups).map(
                            ([orgName, orgProjects]) => {
                              const isOrgExpanded =
                                expandedProjectOrgGroups[
                                  `${platformName}-${orgName}`
                                ];

                              return (
                                <div
                                  key={`${platformName}-${orgName}`}
                                  className="border rounded-lg"
                                >
                                  <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() =>
                                      toggleProjectOrgGroup(
                                        platformName,
                                        orgName,
                                      )
                                    }
                                  >
                                    <div className="flex items-center gap-2">
                                      {isOrgExpanded ? (
                                        <ChevronDown className="size-4" />
                                      ) : (
                                        <ChevronRight className="size-4" />
                                      )}
                                      <span className="font-semibold">
                                        {orgName} {t('Group')}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        ({orgProjects.length} {t('projects')})
                                      </span>
                                    </div>
                                  </div>

                                  {isOrgExpanded && (
                                    <div className="border-t">
                                      <DataTable
                                        emptyStateTextTitle={t('No projects')}
                                        emptyStateTextDescription={t(
                                          'This organization has no projects',
                                        )}
                                        emptyStateIcon={
                                          <FolderKanban className="size-14" />
                                        }
                                        columns={[
                                          {
                                            accessorKey: 'displayName',
                                            size: 250,
                                            header: ({ column }) => (
                                              <DataTableColumnHeader
                                                column={column}
                                                title={t('Project Name')}
                                                icon={FolderKanban}
                                              />
                                            ),
                                            cell: ({ row }) => {
                                              // Extract environment from project displayName
                                              const envMatch =
                                                row.original.displayName.match(
                                                  /(Dev|Staging|Production)/i,
                                                );
                                              const envName = envMatch
                                                ? envMatch[1]
                                                : 'N/A';

                                              return (
                                                <div className="flex items-center gap-2">
                                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                                    {envName}
                                                  </span>
                                                  <TruncatedColumnTextValue
                                                    value={
                                                      row.original.displayName
                                                    }
                                                  />
                                                </div>
                                              );
                                            },
                                          },
                                          {
                                            accessorKey: 'ownerEmail',
                                            size: 200,
                                            header: ({ column }) => (
                                              <DataTableColumnHeader
                                                column={column}
                                                title={t('Owner Email')}
                                                icon={Mail}
                                              />
                                            ),
                                            cell: ({ row }) => (
                                              <TruncatedColumnTextValue
                                                value={row.original.ownerEmail}
                                              />
                                            ),
                                          },
                                          {
                                            accessorKey: 'flowCount',
                                            size: 100,
                                            header: ({ column }) => (
                                              <DataTableColumnHeader
                                                column={column}
                                                title={t('Flows')}
                                                icon={TrendingUp}
                                              />
                                            ),
                                            cell: ({ row }) => (
                                              <div className="text-center">
                                                {row.original.flowCount}
                                              </div>
                                            ),
                                          },
                                          {
                                            accessorKey: 'created',
                                            size: 150,
                                            header: ({ column }) => (
                                              <DataTableColumnHeader
                                                column={column}
                                                title={t('Created')}
                                                icon={Calendar}
                                              />
                                            ),
                                            cell: ({ row }) => (
                                              <FormattedDate
                                                date={
                                                  new Date(row.original.created)
                                                }
                                              />
                                            ),
                                          },
                                        ]}
                                        page={{
                                          data: orgProjects,
                                          next: null,
                                          previous: null,
                                        }}
                                        hidePagination={true}
                                        isLoading={false}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                },
              )}
            </div>
          )}
        </TabsContent>

        {/* Account Switching Activities Tab */}
        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('Account Switching Activities')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                emptyStateTextTitle={t('No activities found')}
                emptyStateTextDescription={t(
                  'There are no account switching activities recorded',
                )}
                emptyStateIcon={<Activity className="size-14" />}
                columns={[
                  {
                    accessorKey: 'created',
                    size: 150,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Date & Time')}
                        icon={Calendar}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <div className="text-left">
                          <FormattedDate
                            date={new Date(row.original.created)}
                          />
                        </div>
                      );
                    },
                  },
                  {
                    accessorKey: 'switchType',
                    size: 150,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Switch Type')}
                        icon={Activity}
                      />
                    ),
                    cell: ({ row }) => {
                      const switchType = row.original.switchType;
                      return (
                        <div className="text-left">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              switchType === 'SUPER_ADMIN_TO_OWNER'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {switchType === 'SUPER_ADMIN_TO_OWNER'
                              ? t('Super Admin → Owner')
                              : t('Owner → Admin')}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    accessorKey: 'originalUserEmail',
                    size: 200,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('From User')}
                        icon={UserCog}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <TruncatedColumnTextValue
                          value={row.original.originalUserEmail}
                        />
                      );
                    },
                  },
                  {
                    accessorKey: 'switchedToUserEmail',
                    size: 200,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('To User')}
                        icon={UserCog}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <TruncatedColumnTextValue
                          value={row.original.switchedToUserEmail}
                        />
                      );
                    },
                  },
                ]}
                page={{
                  data: (activities ?? []) as AccountSwitchingActivity[],
                  next: null,
                  previous: null,
                }}
                hidePagination={true}
                isLoading={activitiesLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { SuperAdminDashboard };
