import React, { useMemo, useState } from 'react'
import { t } from 'i18next'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Key } from 'lucide-react'

import { DashboardPageHeader } from '@/app/components/dashboard-page-header'
import { DataTable, RowDataWithActions } from '@/components/custom/data-table'
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header'
import { ConfirmationDeleteDialog } from '@/components/custom/delete-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FormattedDate } from '@/components/custom/formatted-date'

import { cloudOAuthHooks } from '@/features/platform-admin/api/cloud-oauth-hooks'
import type { CloudOAuthApp } from '@/features/platform-admin/api/cloud-oauth-api'

import {
  AddEditCloudOAuthAppDialog,
  CLOUD_OAUTH2_ELIGIBLE_PIECES,
} from '../add-edit-cloud-oauth-app-dialog'

const getPieceDisplayName = (pieceName: string): string => {
  const piece = CLOUD_OAUTH2_ELIGIBLE_PIECES.find((p) => p.name === pieceName)
  return (
    piece?.displayName ?? pieceName.replace('@activepieces/piece-', '')
  )
}

export default function CloudOAuthAppsPage() {
  const { data: apps, isLoading, refetch } = cloudOAuthHooks.useCloudOAuthApps()
  const deleteMutation = cloudOAuthHooks.useDeleteCloudOAuthApp()
  const [editApp, setEditApp] = useState<CloudOAuthApp | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const configuredPieceNames = useMemo(
    () => apps?.map((app) => app.pieceName) ?? [],
    [apps],
  )

  const columns: ColumnDef<RowDataWithActions<CloudOAuthApp>, unknown>[] = [
    {
      accessorKey: 'pieceName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Piece')} />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col min-w-[120px] max-w-[200px]">
          <span className="font-medium">
            {getPieceDisplayName(row.original.pieceName)}
          </span>
          <code className="text-xs text-muted-foreground truncate">
            {row.original.pieceName}
          </code>
        </div>
      ),
    },
    {
      accessorKey: 'clientId',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Client ID')} />
      ),
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <code className="text-sm bg-muted px-2 py-1 rounded block max-w-[280px] truncate cursor-default">
              {row.original.clientId}
            </code>
          </TooltipTrigger>
          <TooltipContent className="max-w-[400px] break-all">
            <code className="text-xs">{row.original.clientId}</code>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      accessorKey: 'created',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Created')} />
      ),
      cell: ({ row }) => (
        <div className="text-left whitespace-nowrap">
          <FormattedDate date={new Date(row.original.created)} />
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const app = row.original
        return (
          <div className="flex items-center gap-1 justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditApp(app)
                    setEditDialogOpen(true)
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('Edit')}</TooltipContent>
            </Tooltip>

            <ConfirmationDeleteDialog
              title={t('Delete OAuth App')}
              message={t(
                'Are you sure you want to delete this OAuth app? Existing connections using this app will stop working.',
              )}
              entityName={getPieceDisplayName(app.pieceName)}
              mutationFn={async () => {
                await deleteMutation.mutateAsync(app.id)
              }}
            >
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('Delete')}</TooltipContent>
                </Tooltip>
              </div>
            </ConfirmationDeleteDialog>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <DashboardPageHeader
        title={t('Cloud OAuth Apps')}
        description={t(
          'Manage OAuth credentials for pieces to enable simplified "Connect" button flow.',
        )}
      >
        <AddEditCloudOAuthAppDialog
          configuredPieceNames={configuredPieceNames}
          onSuccess={refetch}
        >
          <Button>
            <Plus className="size-4 mr-2" />
            {t('Add OAuth App')}
          </Button>
        </AddEditCloudOAuthAppDialog>
      </DashboardPageHeader>

      <DataTable
        columns={columns}
        page={{ data: apps ?? [], next: null, previous: null }}
        isLoading={isLoading}
        hidePagination
        emptyStateIcon={<Key className="size-14" />}
        emptyStateTextTitle={t('No OAuth Apps')}
        emptyStateTextDescription={t(
          'Add OAuth credentials for pieces like Slack, HubSpot, etc. to enable the simplified connection flow.',
        )}
      />

      {editApp && (
        <AddEditCloudOAuthAppDialog
          app={editApp}
          onSuccess={() => {
            refetch()
            setEditDialogOpen(false)
            setEditApp(null)
          }}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) setEditApp(null)
          }}
        />
      )}
    </div>
  )
}
