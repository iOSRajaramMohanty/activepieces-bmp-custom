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
  ArrowRight,
} from 'lucide-react';
import React, { useMemo } from 'react';

import { DashboardPageHeader } from '@/app/components/dashboard-page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { TruncatedColumnTextValue } from '@/components/ui/data-table/truncated-column-text-value';
import { FormattedDate } from '@/components/ui/formatted-date';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { platformUserHooks } from '@/hooks/platform-user-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { api } from '@/lib/api';
import { platformApi } from '@/lib/platforms-api';
import { PlatformRole, ProjectType, ProjectWithLimits, SeekPage } from '@activepieces/shared';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function OwnerDashboard() {
  const { data: currentUser } = userHooks.useCurrentUser();
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: usersData, isLoading: usersLoading } = platformUserHooks.useUsers();
  // Use non-EE endpoint /v1/projects instead of /v1/users/projects/platforms
  const { data: projectsResponse, isLoading: projectsLoading } = useQuery<SeekPage<ProjectWithLimits>, Error>({
    queryKey: ['projects', platform?.id],
    queryFn: async () => {
      return api.get<SeekPage<ProjectWithLimits>>('/v1/projects', {
        limit: 10000,
      });
    },
    enabled: !!platform?.id,
  });
  const projectsData = projectsResponse?.data || [];

  // Check if user is owner
  if (currentUser?.platformRole !== PlatformRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Shield className="size-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          {t('Access Denied')}
        </h1>
        <p className="text-muted-foreground">
          {t('You must be an owner to access this page')}
        </p>
      </div>
    );
  }

  // Filter users and projects for current platform
  // Exclude the logged-in owner from the users list
  const platformUsers = useMemo(() => {
    if (!usersData?.data) return [];
    return usersData.data.filter(
      (user) => user.platformId === platform?.id && user.id !== currentUser?.id
    );
  }, [usersData, platform, currentUser]);

  const platformProjects = useMemo(() => {
    if (!projectsData) return [];
    // projectsData is an array of ProjectWithLimits from /v1/projects endpoint
    // Filter by current platform - owners are privileged so they see all projects in their platform
    const filteredProjects = projectsData.filter((project) => project.platformId === platform?.id);
    
    // Calculate user count for each project
    // For PERSONAL projects owned by admins: count = 1 (admin owner) + all platform members (operators, members)
    return filteredProjects.map((project) => {
      let userCount = project.analytics?.totalUsers || 0;
      
      // For PERSONAL projects, calculate users who have access
      if (project.type === ProjectType.PERSONAL && project.ownerId) {
        // Find the owner
        const owner = platformUsers.find((u) => u.id === project.ownerId);
        if (owner) {
          // Count = 1 (owner) + all operators and members in the platform
          const operatorsAndMembers = platformUsers.filter(
            (u) => u.platformRole === PlatformRole.OPERATOR || u.platformRole === PlatformRole.MEMBER
          ).length;
          userCount = 1 + operatorsAndMembers;
        }
      }
      
      return {
        ...project,
        analytics: {
          ...project.analytics,
          totalUsers: userCount,
        },
      };
    });
  }, [projectsData, platform, platformUsers]);

  const switchToAdminMutation = useMutation({
    mutationFn: (adminId: string) => platformApi.switchToAdmin(adminId),
    onSuccess: (data) => {
      // Push current session to stack before switching
      const currentUserId = authenticationSession.getCurrentUserId();
      const currentPlatformId = authenticationSession.getPlatformId();
      authenticationSession.pushSwitchSession({
        token: authenticationSession.getToken()!,
        projectId: authenticationSession.getProjectId(),
        switchType: 'OWNER_TO_ADMIN',
        userId: currentUserId!,
        platformId: currentPlatformId,
      });
      // Save new session
      authenticationSession.saveResponse(data, false);
      toast.success(t('Switched to admin account'));
      // Redirect to flows page
      window.location.href = '/';
    },
    onError: (error: any) => {
      toast.error(t('Error'), {
        description: error?.response?.data?.message || t('Failed to switch to admin account'),
        duration: 3000,
      });
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    const totalUsers = platformUsers.length;
    const totalAdmins = platformUsers.filter((u) => u.platformRole === PlatformRole.ADMIN).length;
    const totalOperators = platformUsers.filter((u) => u.platformRole === PlatformRole.OPERATOR).length;
    const totalMembers = platformUsers.filter((u) => u.platformRole === PlatformRole.MEMBER).length;
    const totalProjects = platformProjects.length;
    
    // Note: Flow count is not directly available in ProjectWithLimits
    // We'll show 0 for now, or can be enhanced later with a separate API call
    const totalFlows = 0;

    return {
      totalUsers,
      totalAdmins,
      totalOperators,
      totalMembers,
      totalProjects,
      totalFlows,
    };
  }, [platformUsers, platformProjects]);

  return (
    <div className="flex flex-col w-full gap-4">
      <DashboardPageHeader
        title={t('Owner Dashboard')}
        description={t(
          'View and manage your platform users, projects, and flows',
        )}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('Platform Name')}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {platform?.name || '...'}
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
              {usersLoading ? '...' : stats.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAdmins} {t('admins')},{' '}
              {stats.totalOperators} {t('operators')},{' '}
              {stats.totalMembers} {t('members')}
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
              {projectsLoading ? '...' : stats.totalProjects}
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
              {projectsLoading ? '...' : stats.totalFlows}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            {t('Users')}
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderKanban className="mr-2 h-4 w-4" />
            {t('Projects')}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('Platform Users')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                emptyStateTextTitle={t('No users found')}
                emptyStateTextDescription={t(
                  'There are no users in your platform',
                )}
                emptyStateIcon={<Users className="size-14" />}
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
                      return (
                        <TruncatedColumnTextValue value={row.original.email} />
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
                      const role = row.original.platformRole;
                      return (
                        <div className="text-left">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              role === 'OWNER'
                                ? 'bg-indigo-100 text-indigo-800'
                                : role === 'ADMIN'
                                ? 'bg-blue-100 text-blue-800'
                                : role === 'OPERATOR'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {role === 'OWNER'
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
                              row.original.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {row.original.status === 'ACTIVE'
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
                        title={t('# External ID')}
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
                          <FormattedDate date={new Date(row.original.created)} />
                        </div>
                      );
                    },
                  },
                  {
                    id: 'actions',
                    size: 100,
                    header: () => <div className="text-center">{t('Actions')}</div>,
                    cell: ({ row }) => {
                      // Only show switch button for ADMIN users
                      if (row.original.platformRole !== PlatformRole.ADMIN) {
                        return null;
                      }
                      return (
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-accent"
                            onClick={() => switchToAdminMutation.mutate(row.original.id)}
                            disabled={switchToAdminMutation.isPending}
                            title={t('Switch to admin account')}
                          >
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      );
                    },
                  },
                ]}
                page={{
                  data: platformUsers,
                  next: null,
                  previous: null,
                }}
                hidePagination={true}
                isLoading={usersLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('Platform Projects')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                emptyStateTextTitle={t('No projects found')}
                emptyStateTextDescription={t(
                  'There are no projects in your platform',
                )}
                emptyStateIcon={<FolderKanban className="size-14" />}
                columns={[
                  {
                    accessorKey: 'displayName',
                    size: 200,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Project Name')}
                        icon={FolderKanban}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <TruncatedColumnTextValue
                          value={row.original.displayName}
                        />
                      );
                    },
                  },
                  {
                    accessorKey: 'analytics',
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
                          {row.original.analytics?.totalUsers || 0}
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
                          <FormattedDate date={new Date(row.original.created)} />
                        </div>
                      );
                    },
                  },
                ]}
                page={{
                  data: platformProjects,
                  next: null,
                  previous: null,
                }}
                hidePagination={true}
                isLoading={projectsLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
