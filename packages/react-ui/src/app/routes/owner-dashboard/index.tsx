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
  Trash,
  Workflow,
  Tag,
  Blocks,
  ToggleLeft,
  Clock,
} from 'lucide-react';
import React, { useMemo } from 'react';

import { DashboardPageHeader } from '@/app/components/dashboard-page-header';
import { ConfirmationDeleteDialog } from '@/components/delete-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { TruncatedColumnTextValue } from '@/components/ui/data-table/truncated-column-text-value';
import { FormattedDate } from '@/components/ui/formatted-date';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { platformUserHooks } from '@/hooks/platform-user-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { api } from '@/lib/api';
import { platformApi } from '@/lib/platforms-api';
import { platformUserApi } from '@/lib/platform-user-api';
import { flowsApi } from '@/features/flows/lib/flows-api';
import { ApAvatar } from '@/components/custom/ap-avatar';
import { FlowStatusToggle } from '@/features/flows/components/flow-status-toggle';
import { PieceIconList } from '@/features/pieces/components/piece-icon-list';
import { PlatformRole, ProjectType, ProjectWithLimits, SeekPage, PopulatedFlow, isNil } from '@activepieces/shared';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function OwnerDashboard() {
  const { data: currentUser } = userHooks.useCurrentUser();
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = platformUserHooks.useUsers();
  const currentUserId = authenticationSession.getCurrentUserId();
  // Use /v1/projects endpoint - OWNER users will see all projects due to filtering logic
  // Note: This endpoint is provided by platformProjectController in ENTERPRISE edition
  const { data: projectsResponse, isLoading: projectsLoading, error: projectsError } = useQuery<SeekPage<ProjectWithLimits>, Error>({
    queryKey: ['projects', platform?.id, currentUser?.id],
    queryFn: async () => {
      try {
        const response = await api.get<SeekPage<ProjectWithLimits>>('/v1/projects', {
          limit: 10000,
        });
        return response;
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
    },
    enabled: !!platform?.id && !!currentUser?.id,
    retry: 2,
  });
  
  // Log error for debugging
  if (projectsError) {
    console.error('Projects query error:', projectsError);
  }
  
  const projectsData = projectsResponse?.data || [];

  // Check if user is owner (early return)
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

  // Fetch flows for all projects in the platform
  const { data: flowsData, isLoading: flowsLoading } = useQuery<PopulatedFlow[], Error>({
    queryKey: ['platform-flows', platform?.id, platformProjects.map(p => p.id).join(',')],
    queryFn: async () => {
      if (!platformProjects.length) return [];
      
      // Fetch flows for each project and aggregate them
      const flowsPromises = platformProjects.map(async (project) => {
        try {
          const response = await flowsApi.list({
            projectId: project.id,
            limit: 10000, // Get all flows for each project
            cursor: undefined,
          });
          return response.data || [];
        } catch (error) {
          console.error(`Error fetching flows for project ${project.id}:`, error);
          return [];
        }
      });
      
      const flowsArrays = await Promise.all(flowsPromises);
      // Flatten and add project info to each flow
      return flowsArrays.flat().map(flow => ({
        ...flow,
        projectDisplayName: platformProjects.find(p => p.id === flow.projectId)?.displayName || '',
      }));
    },
    enabled: !!platform?.id && platformProjects.length > 0,
  });

  const allFlows = flowsData || [];

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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await platformUserApi.delete(userId);
    },
    onSuccess: () => {
      refetchUsers();
      toast.success(t('User deleted successfully'), {
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast.error(t('Error'), {
        description: error?.response?.data?.message || t('Failed to delete user'),
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
    const totalFlows = allFlows.length;

    return {
      totalUsers,
      totalAdmins,
      totalOperators,
      totalMembers,
      totalProjects,
      totalFlows,
    };
  }, [platformUsers, platformProjects, allFlows]);

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
              {flowsLoading ? '...' : stats.totalFlows}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            {t('Users')}
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderKanban className="mr-2 h-4 w-4" />
            {t('Projects')}
          </TabsTrigger>
          <TabsTrigger value="flows">
            <Workflow className="mr-2 h-4 w-4" />
            {t('Flows')}
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
                    size: 150,
                    header: () => <div className="text-center">{t('Actions')}</div>,
                    cell: ({ row }) => {
                      const isAdmin = row.original.platformRole === PlatformRole.ADMIN;
                      const isCurrentUser = row.original.id === currentUserId;
                      const canDelete = isAdmin && !isCurrentUser;

                      // Count operators and members for this admin's platform
                      const adminOperators = platformUsers.filter(
                        (u) => u.platformRole === PlatformRole.OPERATOR
                      ).length;
                      const adminMembers = platformUsers.filter(
                        (u) => u.platformRole === PlatformRole.MEMBER
                      ).length;
                      const totalChildUsers = adminOperators + adminMembers;

                      return (
                        <div className="flex justify-center gap-2">
                          {/* Switch button for ADMIN users */}
                          {isAdmin && (
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
                          )}
                          {/* Delete button for ADMIN users only */}
                          {canDelete && (
                            <ConfirmationDeleteDialog
                              title={t('Delete Admin Account')}
                              message={
                                totalChildUsers > 0
                                  ? t(
                                      'Are you sure you want to delete admin "{{email}}"? This will also permanently delete all {{count}} operator(s) and member(s) associated with this admin account.',
                                      {
                                        email: row.original.email,
                                        count: totalChildUsers,
                                      },
                                    )
                                  : t(
                                      'Are you sure you want to delete admin "{{email}}"?',
                                      { email: row.original.email },
                                    )
                              }
                              entityName={`${t('Admin')} ${row.original.email}`}
                              mutationFn={async () => {
                                deleteUserMutation.mutate(row.original.id);
                              }}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    loading={deleteUserMutation.isPending}
                                    variant="ghost"
                                    className="size-8 p-0"
                                  >
                                    <Trash className="size-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  {t('Delete admin account')}
                                </TooltipContent>
                              </Tooltip>
                            </ConfirmationDeleteDialog>
                          )}
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

        {/* Flows Tab */}
        <TabsContent value="flows" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('Platform Flows')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                emptyStateTextTitle={t('No flows found')}
                emptyStateTextDescription={t(
                  'There are no flows in your platform',
                )}
                emptyStateIcon={<Workflow className="size-14" />}
                columns={[
                  {
                    accessorKey: 'name',
                    size: 200,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Name')}
                        icon={Tag}
                      />
                    ),
                    cell: ({ row }) => {
                      const displayName = row.original.version?.displayName || t('Untitled');
                      return (
                        <TruncatedColumnTextValue value={displayName} />
                      );
                    },
                  },
                  {
                    accessorKey: 'project',
                    size: 150,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Project')}
                        icon={FolderKanban}
                      />
                    ),
                    cell: ({ row }) => {
                      const projectName = (row.original as any).projectDisplayName || '-';
                      return (
                        <TruncatedColumnTextValue value={projectName} />
                      );
                    },
                  },
                  {
                    accessorKey: 'steps',
                    size: 150,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Steps')}
                        icon={Blocks}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <PieceIconList
                          trigger={row.original.version?.trigger}
                          maxNumberOfIconsToShow={2}
                        />
                      );
                    },
                  },
                  {
                    accessorKey: 'owner',
                    size: 150,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Created by')}
                        icon={UserCog}
                      />
                    ),
                    cell: ({ row }) => {
                      const ownerId = row.original.ownerId;
                      return isNil(ownerId) ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ApAvatar
                          id={ownerId}
                          size="small"
                          includeAvatar={true}
                          includeName={true}
                        />
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
                        icon={ToggleLeft}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <div
                          className="flex items-center space-x-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FlowStatusToggle flow={row.original} />
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
                            className="text-left font-medium"
                            includeTime={false}
                          />
                        </div>
                      );
                    },
                  },
                  {
                    accessorKey: 'updated',
                    size: 150,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Last modified')}
                        icon={Clock}
                      />
                    ),
                    cell: ({ row }) => {
                      const updated = row.original.version?.updated || row.original.updated;
                      return (
                        <div className="text-left">
                          <FormattedDate
                            date={new Date(updated)}
                            className="text-left font-medium"
                          />
                        </div>
                      );
                    },
                  },
                ]}
                page={{
                  data: allFlows,
                  next: null,
                  previous: null,
                }}
                hidePagination={true}
                isLoading={flowsLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
