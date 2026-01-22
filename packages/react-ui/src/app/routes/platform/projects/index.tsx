import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { CheckIcon, Package, Pencil, Plus, Trash, ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardPageHeader } from '@/app/components/dashboard-page-header';
import LockedFeatureGuard from '@/app/components/locked-feature-guard';
import { ConfirmationDeleteDialog } from '@/components/delete-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DataTable,
  RowDataWithActions,
  BulkAction,
} from '@/components/ui/data-table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EditProjectDialog } from '@/features/projects/components/edit-project-dialog';
import { platformHooks } from '@/hooks/platform-hooks';
import { projectCollectionUtils } from '@/hooks/project-collection';
import { userHooks } from '@/hooks/user-hooks';
import { formatUtils, validationUtils } from '@/lib/utils';
import {
  ProjectType,
  ProjectWithLimits,
  TeamProjectsLimit,
} from '@activepieces/shared';

import { projectsTableColumns } from './columns';
import { NewProjectDialog } from './new-project-dialog';

export default function ProjectsPage() {
  const { platform } = platformHooks.useCurrentPlatform();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEnabled = platform.plan.teamProjectsLimit !== TeamProjectsLimit.NONE;
  const { project: currentProject } =
    projectCollectionUtils.useCurrentProject();
  const { data: currentUser } = userHooks.useCurrentUser();

  const displayNameFilter = searchParams.get('displayName') || undefined;
  const typeFilter = searchParams.getAll('type');

  const filters = useMemo(
    () => ({
      displayName: displayNameFilter,
      type:
        typeFilter.length > 0
          ? typeFilter.map((t) => t as ProjectType)
          : undefined,
    }),
    [displayNameFilter, typeFilter.join(',')],
  );

  const { data: allProjects } =
    projectCollectionUtils.useAllPlatformProjects(filters);

  // Group projects by organization (from organization table via API)
  const projectGroups = useMemo(() => {
    if (!allProjects) return {};
    
    const groups: Record<string, typeof allProjects> = {};
    
    allProjects.forEach((project) => {
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
      groups[orgName].push(project);
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
  }, [allProjects]);

  // Expand/collapse state for project groups
  const [expandedProjectGroups, setExpandedProjectGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (allProjects) {
      Object.keys(projectGroups).forEach((org) => {
        initial[org] = true; // All expanded by default
      });
    }
    return initial;
  });
  
  const toggleProjectGroup = (orgName: string) => {
    setExpandedProjectGroups((prev) => ({
      ...prev,
      [orgName]: !prev[orgName],
    }));
  };

  const [selectedRows, setSelectedRows] = useState<ProjectWithLimits[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogInitialValues, setEditDialogInitialValues] =
    useState<any>(null);
  const [editDialogProjectId, setEditDialogProjectId] = useState<string>('');

  const columns = useMemo(
    () => projectsTableColumns({ platform, currentUserId: currentUser?.id }),
    [platform, currentUser?.id],
  );

  const columnsWithCheckbox: ColumnDef<
    RowDataWithActions<ProjectWithLimits>
  >[] = [
    {
      id: 'select',
      accessorKey: 'select',
      size: 40,
      minSize: 40,
      maxSize: 40,
      header: ({ table }) => {
        const selectableRows = table
          .getRowModel()
          .rows.filter(
            (row) =>
              row.original.id !== currentProject?.id &&
              row.original.type !== ProjectType.PERSONAL,
          );
        const allSelectableSelected =
          selectableRows.length > 0 &&
          selectableRows.every((row) => row.getIsSelected());
        const someSelectableSelected = selectableRows.some((row) =>
          row.getIsSelected(),
        );

        return (
          <Checkbox
            checked={allSelectableSelected || someSelectableSelected}
            onCheckedChange={(value) => {
              const isChecked = !!value;
              selectableRows.forEach((row) => row.toggleSelected(isChecked));

              if (isChecked) {
                const selectableProjects = selectableRows.map(
                  (row) => row.original,
                );
                const newSelectedRows = [
                  ...selectableProjects,
                  ...selectedRows,
                ];
                const uniqueRows = Array.from(
                  new Map(
                    newSelectedRows.map((item) => [item.id, item]),
                  ).values(),
                );
                setSelectedRows(uniqueRows);
              } else {
                const filteredRows = selectedRows.filter(
                  (row) =>
                    !selectableRows.some((r) => r.original.id === row.id),
                );
                setSelectedRows(filteredRows);
              }
            }}
          />
        );
      },
      cell: ({ row }) => {
        const isCurrentProject = row.original.id === currentProject?.id;
        const isPersonalProject = row.original.type === ProjectType.PERSONAL;
        const isDisabled = isCurrentProject || isPersonalProject;
        const isChecked = selectedRows.some(
          (selectedRow) => selectedRow.id === row.original.id,
        );

        return (
          <Tooltip>
            <TooltipTrigger>
              <div className={isDisabled ? 'cursor-not-allowed' : ''}>
                <Checkbox
                  checked={isChecked}
                  disabled={isDisabled}
                  onCheckedChange={(value) => {
                    if (isDisabled) return;

                    const isChecked = !!value;
                    let newSelectedRows = [...selectedRows];
                    if (isChecked) {
                      const exists = newSelectedRows.some(
                        (selectedRow) => selectedRow.id === row.original.id,
                      );
                      if (!exists) {
                        newSelectedRows.push(row.original);
                      }
                    } else {
                      newSelectedRows = newSelectedRows.filter(
                        (selectedRow) => selectedRow.id !== row.original.id,
                      );
                    }
                    setSelectedRows(newSelectedRows);
                    row.toggleSelected(!!value);
                  }}
                />
              </div>
            </TooltipTrigger>
            {isDisabled && (
              <TooltipContent side="right">
                {isCurrentProject
                  ? t(
                      'Cannot delete active project, switch to another project first',
                    )
                  : t('Personal projects cannot be deleted')}
              </TooltipContent>
            )}
          </Tooltip>
        );
      },
    },
    ...columns,
  ];

  const bulkActions: BulkAction<ProjectWithLimits>[] = useMemo(
    () => [
      {
        render: (_, resetSelection) => {
          const canDeleteAny = selectedRows.some(
            (row) =>
              row.id !== currentProject?.id &&
              row.type !== ProjectType.PERSONAL,
          );
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <ConfirmationDeleteDialog
                title={t('Delete Projects')}
                message={t(
                  'Are you sure you want to delete the selected projects?',
                )}
                entityName={t('Projects')}
                mutationFn={async () => {
                  const deletableProjects = selectedRows.filter(
                    (row) =>
                      row.id !== currentProject?.id &&
                      row.type !== ProjectType.PERSONAL,
                  );
                  projectCollectionUtils.delete(
                    deletableProjects.map((row) => row.id),
                  );
                  resetSelection();
                  setSelectedRows([]);
                }}
                onError={(error) => {
                  toast.error(t('Error'), {
                    description: errorToastMessage(error),
                    duration: 3000,
                  });
                }}
              >
                {selectedRows.length > 0 && (
                  <Button
                    className="w-full mr-2"
                    size="sm"
                    variant="destructive"
                    disabled={!canDeleteAny}
                  >
                    <Trash className="mr-2 w-4" />
                    {`${t('Delete')} (${selectedRows.length})`}
                  </Button>
                )}
              </ConfirmationDeleteDialog>
            </div>
          );
        },
      },
    ],
    [selectedRows, currentProject],
  );

  const errorToastMessage = (error: unknown): string | undefined => {
    if (validationUtils.isValidationError(error)) {
      console.error(t('Validation error'), error);
      switch (error.response?.data?.params?.message) {
        case 'PROJECT_HAS_ENABLED_FLOWS':
          return t('Project has enabled flows. Please disable them first.');
        case 'ACTIVE_PROJECT':
          return t(
            'This project is active. Please switch to another project first.',
          );
      }
      return undefined;
    }
  };

  const actions = [
    (row: ProjectWithLimits) => {
      return (
        <div className="flex items-end justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="size-8 p-0"
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setEditDialogInitialValues({
                    projectName: row.displayName,
                  });
                  setEditDialogProjectId(row.id);
                  setEditDialogOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('Edit project')}</TooltipContent>
          </Tooltip>
        </div>
      );
    },
  ];

  return (
    <LockedFeatureGuard
      featureKey="PROJECTS"
      locked={!isEnabled}
      lockTitle={t('Unlock Projects')}
      lockDescription={t(
        'Orchestrate your automation teams across projects with their own flows, connections and usage quotas',
      )}
      lockVideoUrl="https://cdn.activepieces.com/videos/showcase/projects.mp4"
    >
      <div className="flex flex-col w-full">
        <DashboardPageHeader
          title={t('Projects')}
          description={t('Manage your automation projects')}
        >
          <NewProjectDialog>
            <Button
              size="sm"
              className="flex items-center justify-center gap-2"
            >
              <Plus className="size-4" />
              {t('New Project')}
            </Button>
          </NewProjectDialog>
        </DashboardPageHeader>
        {/* Organization Groups */}
        <div className="space-y-4">
          {Object.keys(projectGroups).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="size-14 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t('No projects found')}</h3>
              <p className="text-sm text-muted-foreground">{t('Start by creating projects to manage your automation teams')}</p>
            </div>
          ) : (
            Object.entries(projectGroups).map(([orgName, orgProjects]) => {
              const isExpanded = expandedProjectGroups[orgName] ?? true;
              
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
                            <span className="font-semibold text-lg">{orgName} Group</span>
                            <span className="text-sm text-muted-foreground">
                              ({orgProjects.length} project{orgProjects.length !== 1 ? 's' : ''})
                            </span>
                    </div>
                  </button>
                  
                  {/* Group Content */}
                  {isExpanded && (
                    <div className="p-4">
                      <DataTable
                        emptyStateTextTitle={t('No projects')}
                        emptyStateTextDescription={''}
                        emptyStateIcon={<Package className="size-14" />}
                        onRowClick={async (project) => {
                          await projectCollectionUtils.setCurrentProject(project.id);
                          navigate('/');
                        }}
                        filters={[
                          {
                            type: 'input',
                            title: t('Name'),
                            accessorKey: 'displayName',
                            icon: CheckIcon,
                          },
                          {
                            type: 'select',
                            title: t('Type'),
                            accessorKey: 'type',
                            options: Object.values(ProjectType).map((type) => {
                              return {
                                label:
                                  formatUtils.convertEnumToHumanReadable(type) + ' Project',
                                value: type,
                              };
                            }),
                            icon: CheckIcon,
                          },
                        ]}
                        columns={columnsWithCheckbox}
                        page={{ data: orgProjects, next: null, previous: null }}
                        isLoading={false}
                        clientPagination={true}
                        bulkActions={bulkActions}
                        actions={actions}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <EditProjectDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
          }}
          initialValues={editDialogInitialValues}
          projectId={editDialogProjectId}
        />
      </div>
    </LockedFeatureGuard>
  );
}
