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
} from 'lucide-react';
import React, { useState } from 'react';

import { DashboardPageHeader } from '@/app/components/dashboard-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { TruncatedColumnTextValue } from '@/components/ui/data-table/truncated-column-text-value';
import { FormattedDate } from '@/components/ui/formatted-date';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { superAdminHooks } from '@/hooks/super-admin-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { PlatformRole } from '@activepieces/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { superAdminApi } from '@/lib/super-admin-api';

import { CreateTenantDialog } from './create-tenant-dialog';

export default function SuperAdminDashboard() {
  const { data: currentUser } = userHooks.useCurrentUser();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    superAdminHooks.useSystemStats();
  const { data: platforms, isLoading: platformsLoading, refetch: refetchPlatforms } =
    superAdminHooks.useAllPlatforms();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } =
    superAdminHooks.useAllUsers();
  const { data: projects, isLoading: projectsLoading } =
    superAdminHooks.useAllProjects();

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
        description: error?.response?.data?.message || t('Failed to delete tenant'),
        duration: 3000,
      });
    },
  });

  // Check if user is super admin
  if (currentUser?.platformRole !== PlatformRole.SUPER_ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Shield className="size-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          {t('Access Denied')}
        </h1>
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
              {statsLoading ? '...' : stats?.totalUsers ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalSuperAdmins ?? 0} {t('super admins')},{' '}
              {stats?.totalAdmins ?? 0} {t('admins')}
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
        <TabsList className="grid w-full grid-cols-3">
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
                      const [open, setOpen] = useState(false);
                      return (
                        <div className="flex justify-center">
                          <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                                    {t(
                                      'Are you sure you want to delete tenant "{{name}}"?',
                                      { name: row.original.name },
                                    )}
                                  </p>
                                  <p className="font-semibold mb-2">{t('This will permanently delete:')}</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    <li>{t('The platform/tenant')}</li>
                                    <li>{`${row.original.userCount} ${t('user(s)')}`}</li>
                                    <li>{`${row.original.projectCount} ${t('project(s)')}`}</li>
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
                                    deleteTenantMutation.mutate(row.original.id);
                                    setOpen(false);
                                  }}
                                  disabled={deleteTenantMutation.isPending}
                                >
                                  {deleteTenantMutation.isPending ? t('Deleting...') : t('Delete')}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      );
                    },
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
          <Card>
            <CardHeader>
              <CardTitle>{t('All Users')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                emptyStateTextTitle={t('No users found')}
                emptyStateTextDescription={t(
                  'There are no users in the system',
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
                    accessorKey: 'platformName',
                    size: 180,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Platform')}
                        icon={Building2}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <TruncatedColumnTextValue
                          value={row.original.platformName}
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
                              role === 'SUPER_ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : role === 'ADMIN'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {role === 'SUPER_ADMIN'
                              ? t('Super Admin')
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
                                : 'bg-red-100 text-red-800'
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
                          <FormattedDate date={new Date(row.original.created)} />
                        </div>
                      );
                    },
                  },
                ]}
                page={{
                  data: users ?? [],
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
              <CardTitle>{t('All Projects')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                emptyStateTextTitle={t('No projects found')}
                emptyStateTextDescription={t(
                  'There are no projects in the system',
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
                    accessorKey: 'platformName',
                    size: 180,
                    header: ({ column }) => (
                      <DataTableColumnHeader
                        column={column}
                        title={t('Platform')}
                        icon={Building2}
                      />
                    ),
                    cell: ({ row }) => {
                      return (
                        <TruncatedColumnTextValue
                          value={row.original.platformName}
                        />
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
                    cell: ({ row }) => {
                      return (
                        <TruncatedColumnTextValue
                          value={row.original.ownerEmail}
                        />
                      );
                    },
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
                    cell: ({ row }) => {
                      return (
                        <div className="text-center">
                          {row.original.flowCount}
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
                  data: projects ?? [],
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
