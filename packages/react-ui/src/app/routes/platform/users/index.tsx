import { useMutation, useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import {
  CircleMinus,
  Pencil,
  RotateCcw,
  Trash,
  User,
  UserPlus,
  Mail,
  Tag,
  Hash,
  Shield,
  Clock,
  Activity,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { DashboardPageHeader } from '@/app/components/dashboard-page-header';
import LockedFeatureGuard from '@/app/components/locked-feature-guard';
import { ConfirmationDeleteDialog } from '@/components/delete-dialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { TruncatedColumnTextValue } from '@/components/ui/data-table/truncated-column-text-value';
import { FormattedDate } from '@/components/ui/formatted-date';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InviteUserDialog } from '@/features/members/component/invite-user/invite-user-dialog';
import { userInvitationApi } from '@/features/members/lib/user-invitation';
import { platformUserHooks } from '@/hooks/platform-user-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { platformUserApi } from '@/lib/platform-user-api';
import {
  InvitationType,
  PlatformRole,
  UserInvitation,
  UserStatus,
  UserWithMetaInformation,
} from '@activepieces/shared';

import { DeleteUserAction } from './actions/delete-user-action';
import { EditUserAction } from './actions/edit-user-action';
import { ToggleUserStatusAction } from './actions/toggle-user-status-action';
import { UpdateUserDialog } from './actions/update-user-dialog';
import { createUsersTableColumns } from './columns';

export type UserRowData =
  | {
      id: string;
      type: 'user';
      data: UserWithMetaInformation;
    }
  | {
      id: string;
      type: 'invitation';
      data: UserInvitation;
    };

export default function UsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: rawData, isLoading, refetch } = platformUserHooks.useUsers();
  const { data: currentUser } = userHooks.useCurrentUser();
  const currentUserId = authenticationSession.getCurrentUserId();

  // Group users by organization name (from API or extracted from name)
  const userGroups = useMemo(() => {
    if (!rawData?.data) return {};
    
    const groups: Record<string, typeof rawData.data> = {};
    
    rawData.data.forEach((user) => {
      // Use organizationName from API (from organization table)
      // This is the primary source - dynamically fetched from database
      let orgName = user.organizationName;
      
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
  }, [rawData]);

  // Expand/collapse state for each organization group
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (rawData?.data) {
      Object.keys(userGroups).forEach((org) => {
        initial[org] = true; // All expanded by default
      });
    }
    return initial;
  });
  
  const toggleGroup = (orgName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [orgName]: !prev[orgName],
    }));
  };

  const { mutate: deleteUser, isPending: isDeleting } = useMutation({
    mutationKey: ['delete-user'],
    mutationFn: async (userId: string) => {
      await platformUserApi.delete(userId);
    },
    onSuccess: () => {
      refetch();
      toast.success(t('User deleted successfully'), {
        duration: 3000,
      });
    },
  });

  const { mutate: deleteInvitation, isPending: isDeletingInvitation } =
    useMutation({
      mutationKey: ['delete-invitation'],
      mutationFn: async (invitationId: string) => {
        await userInvitationApi.delete(invitationId);
      },
      onSuccess: () => {
        refetch();
        toast.success(t('Invitation deleted successfully'), {
          duration: 3000,
        });
      },
    });

  const { mutate: updateUserStatus, isPending: isUpdatingStatus } = useMutation(
    {
      mutationFn: async (data: { userId: string; status: UserStatus }) => {
        await platformUserApi.update(data.userId, {
          status: data.status,
        });
        return {
          userId: data.userId,
          status: data.status,
        };
      },
      onSuccess: (data) => {
        refetch();
        toast.success(
          data.status === UserStatus.ACTIVE
            ? t('User activated successfully')
            : t('User deactivated successfully'),
          {
            duration: 3000,
          },
        );
      },
    },
  );

  const handleDelete = (id: string, isInvitation: boolean) => {
    if (isInvitation) {
      deleteInvitation(id);
    } else {
      deleteUser(id);
    }
  };

  const handleToggleStatus = (userId: string, currentStatus: UserStatus) => {
    updateUserStatus({
      userId,
      status:
        currentStatus === UserStatus.ACTIVE
          ? UserStatus.INACTIVE
          : UserStatus.ACTIVE,
    });
  };

  const columns = createUsersTableColumns();

  return (
    <LockedFeatureGuard
      featureKey="USERS"
      locked={false}
      lockTitle={t('Unlock Users')}
      lockDescription={t('Manage your users and their access to your projects')}
    >
      <div className="flex flex-col w-full">
        <DashboardPageHeader
          title={t('Users')}
          description={t(
            'Manage, delete, activate and deactivate users on platform',
          )}
        >
          <Button
            className="gap-2"
            size="sm"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            <span className="text-sm font-medium">{t('Invite')}</span>
          </Button>
        </DashboardPageHeader>
        {/* Organization Groups */}
        <div className="space-y-4">
          {Object.keys(userGroups).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <User className="size-14 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t('No users found')}</h3>
              <p className="text-sm text-muted-foreground">{t('Start inviting users to your project')}</p>
            </div>
          ) : (
            Object.entries(userGroups).map(([orgName, orgUsers]) => {
              const isExpanded = expandedGroups[orgName] ?? true;
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
                        emptyStateIcon={<User className="size-14" />}
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
                  icon={Tag}
                />
              ),
              cell: ({ row }) => {
                const fullName = row.original.firstName + ' ' + row.original.lastName;
                const role = row.original.platformRole;
                
                // Extract organization and environment info
                const orgMatch = fullName.match(/^([A-Z]+)\s+(Dev|Staging|Production|Test)\s+(Admin|Operator|Member)/i);
                const isSubMember = role === PlatformRole.OPERATOR || role === PlatformRole.MEMBER;
                const hasGroupPrefix = orgMatch !== null;
                
                // Color coding by environment
                let envColor = '';
                if (hasGroupPrefix) {
                  const env = orgMatch[2].toLowerCase();
                  if (env === 'dev') envColor = 'text-blue-600 dark:text-blue-400';
                  else if (env === 'staging') envColor = 'text-amber-600 dark:text-amber-400';
                  else if (env === 'production') envColor = 'text-green-600 dark:text-green-400';
                }
                
                return (
                  <div className="flex items-center gap-2">
                    {isSubMember && hasGroupPrefix ? (
                      <>
                        <span className="text-muted-foreground text-sm">└─</span>
                        <span className={`font-medium ${envColor}`}>{fullName}</span>
                      </>
                    ) : (
                      <span className={hasGroupPrefix ? `font-semibold ${envColor}` : ''}>
                        {fullName}
                      </span>
                    )}
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
                  title={t('External Id')}
                  icon={Hash}
                />
              ),
              cell: ({ row }) => {
                return (
                  <div className="text-left">{row.original.externalId}</div>
                );
              },
            },
            {
              accessorKey: 'role',
              size: 100,
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
                    {role === PlatformRole.SUPER_ADMIN
                      ? t('Super Admin')
                      : role === PlatformRole.OWNER
                      ? t('Owner')
                      : role === PlatformRole.ADMIN
                      ? t('Admin')
                      : role === PlatformRole.OPERATOR
                      ? t('Operator')
                      : t('Member')}
                  </div>
                );
              },
            },
            {
              accessorKey: 'createdAt',
              size: 150,
              header: ({ column }) => (
                <DataTableColumnHeader
                  column={column}
                  title={t('Created')}
                  icon={Clock}
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
              accessorKey: 'lastActiveDate',
              size: 150,
              header: ({ column }) => (
                <DataTableColumnHeader
                  column={column}
                  title={t('Last Active')}
                  icon={Clock}
                />
              ),
              cell: ({ row }) => {
                return row.original.lastActiveDate ? (
                  <div className="text-left">
                    <FormattedDate
                      date={new Date(row.original.lastActiveDate)}
                    />
                  </div>
                ) : (
                  '-'
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
                    {row.original.status === UserStatus.ACTIVE
                      ? t('Activated')
                      : t('Deactivated')}
                  </div>
                );
              },
            },
          ]}
          page={{ data: orgUsers, next: null, previous: null }}
          hidePagination={true}
          isLoading={isLoading}
          actions={[
            (row) => {
              return (
                <div className="flex items-end justify-end">
                  <Tooltip>
                    <TooltipTrigger>
                      <UpdateUserDialog
                        userId={row.id}
                        role={row.platformRole}
                        externalId={row.externalId ?? undefined}
                        onUpdate={() => refetch()}
                      >
                        <Button variant="ghost" className="size-8 p-0">
                          <Pencil className="size-4" />
                        </Button>
                      </UpdateUserDialog>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {t('Edit user')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            },
            (row) => {
              const isAdmin = row.platformRole === PlatformRole.ADMIN;
              const isActive = row.status === UserStatus.ACTIVE;
              
              return (
                <div className="flex items-end justify-end">
                  <Tooltip>
                    <TooltipTrigger>
                      {!isAdmin ? (
                        <ConfirmationDeleteDialog
                          title={isActive ? t('Deactivate User') : t('Activate User')}
                          message={
                            isActive
                              ? t('Are you sure you want to deactivate this user? They will not be able to log in.')
                              : t('Are you sure you want to activate this user? They will be able to log in.')
                          }
                          entityName={`${t('User')} ${row.email}`}
                          mutationFn={async () => {
                            updateUserStatus({
                              userId: row.id,
                              status: isActive ? UserStatus.INACTIVE : UserStatus.ACTIVE,
                            });
                          }}
                          buttonText={isActive ? t('Deactivate') : t('Activate')}
                        >
                          <Button
                            disabled={isUpdatingStatus}
                            variant="ghost"
                            className="size-8 p-0"
                            loading={isUpdatingStatus}
                          >
                            {isActive ? (
                              <CircleMinus className="size-4" />
                            ) : (
                              <RotateCcw className="size-4" />
                            )}
                          </Button>
                        </ConfirmationDeleteDialog>
                      ) : (
                        <Button
                          disabled={true}
                          variant="ghost"
                          className="size-8 p-0"
                        >
                          {isActive ? (
                            <CircleMinus className="size-4" />
                          ) : (
                            <RotateCcw className="size-4" />
                          )}
                        </Button>
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {isAdmin
                        ? t('Admin cannot be deactivated')
                        : isActive
                        ? t('Deactivate user')
                        : t('Activate user')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            },
            (row) => {
              // Disable delete for OWNER, SUPER_ADMIN, and the currently logged-in user
              const isOwner = row.platformRole === PlatformRole.OWNER;
              const isSuperAdmin = row.platformRole === PlatformRole.SUPER_ADMIN;
              const isCurrentUser = row.id === currentUserId;
              const canDelete = !isOwner && !isSuperAdmin && !isCurrentUser;

              return (
                <div className="flex items-end justify-end">
                  <Tooltip>
                    <TooltipTrigger>
                      {canDelete ? (
                        <ConfirmationDeleteDialog
                          title={t('Delete User')}
                          message={t(
                            'Are you sure you want to delete this user?',
                          )}
                          entityName={`${t('User')} ${row.email}`}
                          mutationFn={async () => {
                            deleteUser(row.id);
                          }}
                        >
                          <Button
                            loading={isDeleting}
                            variant="ghost"
                            className="size-8 p-0"
                          >
                            <Trash className="size-4 text-destructive" />
                          </Button>
                        </ConfirmationDeleteDialog>
                      ) : (
                        <Button
                          disabled={true}
                          variant="ghost"
                          className="size-8 p-0"
                        >
                          <Trash className="size-4 text-muted-foreground" />
                        </Button>
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {isOwner || isSuperAdmin
                        ? t('Cannot delete owner or super admin')
                        : isCurrentUser
                        ? t('Cannot delete your own account')
                        : t('Delete user')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            },
          ]}
        />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <InviteUserDialog
        open={inviteOpen}
        setOpen={setInviteOpen}
        onInviteSuccess={refetch}
      />
    </LockedFeatureGuard>
  );
}
