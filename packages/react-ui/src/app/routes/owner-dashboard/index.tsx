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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

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
    
    // Backend analytics.totalUsers counts project_member entries (doesn't include owner)
    // Add 1 for the project owner to get accurate total
    return filteredProjects.map((project) => {
      const memberCount = project.analytics?.totalUsers || 0;
      return {
        ...project,
        analytics: {
          ...project.analytics,
          totalUsers: memberCount + 1, // Add 1 for owner
          activeUsers: project.analytics?.activeUsers || 0,
          totalFlows: project.analytics?.totalFlows || 0,
          activeFlows: project.analytics?.activeFlows || 0,
        },
      };
    });
  }, [projectsData, platform]);

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

  // Group users by organization (from organization table via API)
  const userGroups = useMemo(() => {
    const groups: Record<string, typeof platformUsers> = {};
    
    platformUsers.forEach((user) => {
      // Use organizationName from API (from organization table)
      // This is the primary source - dynamically fetched from database
      let orgName = (user as any).organizationName;
      
      // Only fallback to extraction if organizationName is not available
      if (!orgName) {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        const orgMatch = fullName.match(/^([A-Z]+)\s/);
        orgName = orgMatch ? orgMatch[1] : 'Other';
      }
      
      // Final fallback to "Other" if still no organization
      if (!orgName) {
        orgName = 'Other';
      }
      
      if (!groups[orgName]) {
        groups[orgName] = [];
      }
      groups[orgName].push(user);
    });
    
    // Sort users within each group: Dev admin -> Dev operators -> Staging admin -> Staging operators -> Production admin -> Production operators
    Object.keys(groups).forEach((orgName) => {
      groups[orgName].sort((a, b) => {
        // Get environment from API response (from organization_environment table)
        const aEnv = (a as any).environment || '';
        const bEnv = (b as any).environment || '';
        
        // Define environment order (Dev, Staging, Production)
        const envOrder: Record<string, number> = { 
          'Dev': 1, 
          'Staging': 2, 
          'Production': 3,
          '': 99  // Users without environment go last
        };
        
        const aEnvOrder = envOrder[aEnv] || 99;
        const bEnvOrder = envOrder[bEnv] || 99;
        
        // Define role order within each environment
        const roleOrder: Record<string, number> = {
          [PlatformRole.OWNER]: 0,
          [PlatformRole.ADMIN]: 1,
          [PlatformRole.OPERATOR]: 2,
          [PlatformRole.MEMBER]: 3,
        };
        
        const aRoleOrder = roleOrder[a.platformRole] || 99;
        const bRoleOrder = roleOrder[b.platformRole] || 99;
        
        // Create a composite sort key: environment * 10 + role
        // This ensures: Dev Admin (11), Dev Operator (12), Staging Admin (21), Staging Operator (22), etc.
        const aComposite = aEnvOrder * 10 + aRoleOrder;
        const bComposite = bEnvOrder * 10 + bRoleOrder;
        
        return aComposite - bComposite;
      });
    });
    
    return groups;
  }, [platformUsers]);
  
  // Expand/collapse state for each organization group
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(userGroups).forEach((org) => {
      initial[org] = true; // All expanded by default
    });
    return initial;
  });
  
  const toggleGroup = (orgName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [orgName]: !prev[orgName],
    }));
  };

  // Group projects by organization (from organization table via API)
  const projectGroups = useMemo(() => {
    const groups: Record<string, (typeof platformProjects[0] & { flowCount?: number })[]> = {};
    
    platformProjects.forEach((project) => {
      // Use organizationName from API (from organization table)
      // This is the primary source - dynamically fetched from database
      let orgName = (project as any).organizationName;
      
      // Only fallback to extraction if organizationName is not available
      if (!orgName) {
        const displayName = project.displayName;
        const orgMatch = displayName.match(/^([A-Z]+)\s/);
        orgName = orgMatch ? orgMatch[1] : 'Other';
      }
      
      // Final fallback to "Other" if still no organization
      if (!orgName) {
        orgName = 'Other';
      }
      
      if (!groups[orgName]) {
        groups[orgName] = [];
      }
      
      // Calculate flow count for this project
      const projectFlowCount = allFlows.filter(flow => flow.projectId === project.id).length;
      
      groups[orgName].push({
        ...project,
        flowCount: projectFlowCount,
      });
    });
    
    // Sort projects within each group by environment
    Object.keys(groups).forEach((orgName) => {
      groups[orgName].sort((a, b) => {
        const envOrder: Record<string, number> = { 'Dev': 1, 'Staging': 2, 'Production': 3 };
        const aEnv = a.displayName.match(/\s(Dev|Staging|Production)/i)?.[1];
        const bEnv = b.displayName.match(/\s(Dev|Staging|Production)/i)?.[1];
        
        if (aEnv && bEnv) {
          const aOrder = envOrder[aEnv] || 99;
          const bOrder = envOrder[bEnv] || 99;
          return aOrder - bOrder;
        }
        return a.displayName.localeCompare(b.displayName);
      });
    });
    
    return groups;
  }, [platformProjects, allFlows]);

  // Expand/collapse state for project groups
  const [expandedProjectGroups, setExpandedProjectGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(projectGroups).forEach((org) => {
      initial[org] = true;
    });
    return initial;
  });
  
  const toggleProjectGroup = (orgName: string) => {
    setExpandedProjectGroups((prev) => ({
      ...prev,
      [orgName]: !prev[orgName],
    }));
  };

  // Group flows by project organization (from organization table via API)
  const flowGroups = useMemo(() => {
    const groups: Record<string, typeof allFlows> = {};
    
    allFlows.forEach((flow) => {
      // Get organization from the project's organizationName
      // First try to find the project and get its organizationName
      const project = platformProjects.find(p => p.id === flow.projectId);
      let orgName = project ? (project as any).organizationName : null;
      
      // Only fallback to extraction if organizationName is not available
      if (!orgName) {
        const projectName = (flow as any).projectDisplayName || '';
        const orgMatch = projectName.match(/^([A-Z]+)\s/);
        orgName = orgMatch ? orgMatch[1] : 'Other';
      }
      
      // Final fallback to "Other" if still no organization
      if (!orgName) {
        orgName = 'Other';
      }
      
      if (!groups[orgName]) {
        groups[orgName] = [];
      }
      groups[orgName].push(flow);
    });
    
    // Sort flows within each group by project environment, then by name
    Object.keys(groups).forEach((orgName) => {
      groups[orgName].sort((a, b) => {
        const aProject = (a as any).projectDisplayName || '';
        const bProject = (b as any).projectDisplayName || '';
        
        const envOrder: Record<string, number> = { 'Dev': 1, 'Staging': 2, 'Production': 3 };
        const aEnv = aProject.match(/\s(Dev|Staging|Production)/i)?.[1];
        const bEnv = bProject.match(/\s(Dev|Staging|Production)/i)?.[1];
        
        if (aEnv && bEnv) {
          const aOrder = envOrder[aEnv] || 99;
          const bOrder = envOrder[bEnv] || 99;
          if (aOrder !== bOrder) return aOrder - bOrder;
        }
        
        const aName = a.version?.displayName || '';
        const bName = b.version?.displayName || '';
        return aName.localeCompare(bName);
      });
    });
    
    return groups;
  }, [allFlows]);

  // Expand/collapse state for flow groups
  const [expandedFlowGroups, setExpandedFlowGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(flowGroups).forEach((org) => {
      initial[org] = true;
    });
    return initial;
  });
  
  const toggleFlowGroup = (orgName: string) => {
    setExpandedFlowGroups((prev) => ({
      ...prev,
      [orgName]: !prev[orgName],
    }));
  };

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
              {/* Organization Groups */}
              <div className="space-y-4">
                {Object.keys(userGroups).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="size-14 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">{t('No users found')}</h3>
                    <p className="text-sm text-muted-foreground">{t('There are no users in your platform')}</p>
                  </div>
                ) : (
                  Object.entries(userGroups).map(([orgName, orgUsers]) => {
                    const isExpanded = expandedGroups[orgName];
                    const admins = orgUsers.filter(u => u.platformRole === PlatformRole.ADMIN);
                    const nonAdmins = orgUsers.filter(u => u.platformRole !== PlatformRole.ADMIN);
                    
                    return (
                      <div key={orgName} className="border rounded-lg overflow-hidden">
                        {/* Group Header */}
                        <button
                          onClick={() => toggleGroup(orgName)}
                          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="size-5" />
                            ) : (
                              <ChevronRight className="size-5" />
                            )}
                            <span className="font-semibold text-lg">{orgName} Group</span>
                            <span className="text-sm text-muted-foreground">
                              ({orgUsers.length} user{orgUsers.length !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {admins.length > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {admins.length} Admin{admins.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {nonAdmins.length > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {nonAdmins.length} Member{nonAdmins.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </button>
                        
                        {/* Group Content */}
                        {isExpanded && (
                          <div className="p-4">
                            <DataTable
                              emptyStateTextTitle={t('No users')}
                              emptyStateTextDescription={''}
                              emptyStateIcon={<Users className="size-14" />}
                              columns={[
                  {
                    accessorKey: 'email',
                    size: 220,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Email')}
                        icon={Mail}
                      />
                    ),
                    cell: ({ row }) => {
                      // Get environment from API (from organization_environment table)
                      const envName = (row.original as any).environment || 'N/A';
                      
                      return (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            {envName}
                          </span>
                          <TruncatedColumnTextValue value={row.original.email} />
                        </div>
                      );
                    },
                  },
                  {
                    accessorKey: 'name',
                    size: 200,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Name')}
                        icon={UserCog}
                      />
                    ),
                    cell: ({ row }) => {
                      const fullName = `${row.original.firstName} ${row.original.lastName}`;
                      const role = row.original.platformRole;
                      const isSubMember = role === PlatformRole.OPERATOR || role === PlatformRole.MEMBER;
                      
                      // Extract environment for color coding
                      const orgMatch = fullName.match(/^([A-Z]+)\s+(Dev|Staging|Production)\s+(Admin|Operator|Member)/i);
                      let envColor = '';
                      if (orgMatch) {
                        const env = orgMatch[2].toLowerCase();
                        if (env === 'dev') envColor = 'text-blue-600 dark:text-blue-400';
                        else if (env === 'staging') envColor = 'text-amber-600 dark:text-amber-400';
                        else if (env === 'production') envColor = 'text-green-600 dark:text-green-400';
                      }
                      
                      return (
                        <div className="flex items-center gap-2">
                          {isSubMember && (
                            <span className="text-muted-foreground text-sm">└─</span>
                          )}
                          <span className={`${orgMatch ? (isSubMember ? `font-medium ${envColor}` : `font-semibold ${envColor}`) : ''}`}>
                            {fullName}
                          </span>
                        </div>
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
                            <Tooltip>
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
                                <TooltipTrigger asChild>
                                  <Button
                                    loading={deleteUserMutation.isPending}
                                    variant="ghost"
                                    className="size-8 p-0"
                                  >
                                    <Trash className="size-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                              </ConfirmationDeleteDialog>
                              <TooltipContent side="bottom">
                                {t('Delete admin account')}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
                              page={{
                                data: orgUsers,
                                next: null,
                                previous: null,
                              }}
                              hidePagination={true}
                              isLoading={usersLoading}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
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
              {/* Organization Groups */}
              <div className="space-y-4">
                {Object.keys(projectGroups).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FolderKanban className="size-14 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">{t('No projects found')}</h3>
                    <p className="text-sm text-muted-foreground">{t('There are no projects in your platform')}</p>
                  </div>
                ) : (
                  Object.entries(projectGroups).map(([orgName, orgProjects]) => {
                    const isExpanded = expandedProjectGroups[orgName];
                    const totalFlows = orgProjects.reduce((sum, p) => sum + (p.flowCount || 0), 0);
                    const totalUsers = orgProjects.reduce((sum, p) => sum + (p.analytics?.totalUsers || 0), 0);
                    
                    return (
                      <div key={orgName} className="border rounded-lg overflow-hidden">
                        {/* Group Header */}
                        <button
                          onClick={() => toggleProjectGroup(orgName)}
                          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="size-5" />
                            ) : (
                              <ChevronRight className="size-5" />
                            )}
                            <span className="font-semibold text-lg">{orgName} Projects</span>
                            <span className="text-sm text-muted-foreground">
                              ({orgProjects.length} project{orgProjects.length !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {totalUsers} User{totalUsers !== 1 ? 's' : ''}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              {totalFlows} Flow{totalFlows !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </button>
                        
                        {/* Group Content */}
                        {isExpanded && (
                          <div className="p-4">
                            <DataTable
                              emptyStateTextTitle={t('No projects')}
                              emptyStateTextDescription={''}
                              emptyStateIcon={<FolderKanban className="size-14" />}
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
                                    const displayName = row.original.displayName;
                                    // Extract environment from project displayName
                                    const envMatch = displayName.match(/(Dev|Staging|Production)/i);
                                    const envName = envMatch ? envMatch[1] : 'N/A';
                                    
                                    let envColor = '';
                                    if (envMatch) {
                                      const env = envMatch[1].toLowerCase();
                                      if (env === 'dev') envColor = 'text-blue-600 dark:text-blue-400';
                                      else if (env === 'staging') envColor = 'text-amber-600 dark:text-amber-400';
                                      else if (env === 'production') envColor = 'text-green-600 dark:text-green-400';
                                    }
                                    return (
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                          {envName}
                                        </span>
                                        <span className={`font-semibold ${envColor}`}>
                                          {displayName}
                                        </span>
                                      </div>
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
                                  accessorKey: 'flows',
                                  size: 100,
                                  header: ({ column }) => (
                                    <DataTableColumnHeader
                                      column={column}
                                      title={t('Flows')}
                                      icon={Workflow}
                                    />
                                  ),
                                  cell: ({ row }) => {
                                    return (
                                      <div className="text-center">
                                        {(row.original as any).flowCount || 0}
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
                                data: orgProjects,
                                next: null,
                                previous: null,
                              }}
                              hidePagination={true}
                              isLoading={projectsLoading}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
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
              {/* Organization Groups */}
              <div className="space-y-4">
                {Object.keys(flowGroups).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Workflow className="size-14 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">{t('No flows found')}</h3>
                    <p className="text-sm text-muted-foreground">{t('There are no flows in your platform')}</p>
                  </div>
                ) : (
                  Object.entries(flowGroups).map(([orgName, orgFlows]) => {
                    const isExpanded = expandedFlowGroups[orgName];
                    const activeFlows = orgFlows.filter(f => f.status === 'ENABLED').length;
                    const draftFlows = orgFlows.filter(f => f.status === 'DISABLED').length;
                    
                    return (
                      <div key={orgName} className="border rounded-lg overflow-hidden">
                        {/* Group Header */}
                        <button
                          onClick={() => toggleFlowGroup(orgName)}
                          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="size-5" />
                            ) : (
                              <ChevronRight className="size-5" />
                            )}
                            <span className="font-semibold text-lg">{orgName} Flows</span>
                            <span className="text-sm text-muted-foreground">
                              ({orgFlows.length} flow{orgFlows.length !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {activeFlows > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {activeFlows} Active
                              </span>
                            )}
                            {draftFlows > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                {draftFlows} Draft
                              </span>
                            )}
                          </div>
                        </button>
                        
                        {/* Group Content */}
                        {isExpanded && (
                          <div className="p-4">
                            <DataTable
                              emptyStateTextTitle={t('No flows')}
                              emptyStateTextDescription={''}
                              emptyStateIcon={<Workflow className="size-14" />}
                              columns={[
                                {
                                  accessorKey: 'name',
                                  size: 220,
                                  header: ({ column }) => (
                                    <DataTableColumnHeader
                                      column={column}
                                      title={t('Name')}
                                      icon={Tag}
                                    />
                                  ),
                                  cell: ({ row }) => {
                                    const displayName = row.original.version?.displayName || t('Untitled');
                                    // Find the project to get environment from its name
                                    const project = platformProjects.find(p => p.id === row.original.projectId);
                                    const projectName = project?.displayName || '';
                                    const envMatch = projectName.match(/(Dev|Staging|Production)/i);
                                    const envName = envMatch ? envMatch[1] : 'N/A';
                                    
                                    return (
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                          {envName}
                                        </span>
                                        <TruncatedColumnTextValue value={displayName} />
                                      </div>
                                    );
                                  },
                                },
                                {
                                  accessorKey: 'project',
                                  size: 180,
                                  header: ({ column }) => (
                                    <DataTableColumnHeader
                                      column={column}
                                      title={t('Project')}
                                      icon={FolderKanban}
                                    />
                                  ),
                                  cell: ({ row }) => {
                                    const projectName = (row.original as any).projectDisplayName || '-';
                                    const orgMatch = projectName.match(/^([A-Z]+)\s+(Dev|Staging|Production)/i);
                                    let envColor = '';
                                    if (orgMatch) {
                                      const env = orgMatch[2].toLowerCase();
                                      if (env === 'dev') envColor = 'text-blue-600 dark:text-blue-400';
                                      else if (env === 'staging') envColor = 'text-amber-600 dark:text-amber-400';
                                      else if (env === 'production') envColor = 'text-green-600 dark:text-green-400';
                                    }
                                    return (
                                      <span className={`font-medium ${envColor}`}>
                                        {projectName}
                                      </span>
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
                                data: orgFlows,
                                next: null,
                                previous: null,
                              }}
                              hidePagination={true}
                              isLoading={flowsLoading}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
