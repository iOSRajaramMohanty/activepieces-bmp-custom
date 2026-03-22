import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { t } from 'i18next'
import type { ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { cloudOAuthHooks } from '@/features/platform-admin/api/cloud-oauth-hooks'
import type { CloudOAuthApp } from '@/features/platform-admin/api/cloud-oauth-api'
import { PieceIconWithPieceName } from '@/features/pieces'

export type CloudOAuthEligiblePiece = {
  name: string
  displayName: string
}

// Pieces that support CLOUD_OAUTH2 (these were derived from the existing cloud OAuth list)
export const CLOUD_OAUTH2_ELIGIBLE_PIECES: CloudOAuthEligiblePiece[] = [
  { name: '@activepieces/piece-slack', displayName: 'Slack' },
  { name: '@activepieces/piece-hubspot', displayName: 'HubSpot' },
  { name: '@activepieces/piece-google-sheets', displayName: 'Google Sheets' },
  { name: '@activepieces/piece-gmail', displayName: 'Gmail' },
  { name: '@activepieces/piece-google-drive', displayName: 'Google Drive' },
  { name: '@activepieces/piece-google-calendar', displayName: 'Google Calendar' },
  { name: '@activepieces/piece-notion', displayName: 'Notion' },
  { name: '@activepieces/piece-github', displayName: 'GitHub' },
  { name: '@activepieces/piece-gitlab', displayName: 'GitLab' },
  { name: '@activepieces/piece-dropbox', displayName: 'Dropbox' },
  { name: '@activepieces/piece-salesforce', displayName: 'Salesforce' },
  { name: '@activepieces/piece-typeform', displayName: 'Typeform' },
  { name: '@activepieces/piece-asana', displayName: 'Asana' },
  { name: '@activepieces/piece-monday', displayName: 'Monday.com' },
  { name: '@activepieces/piece-clickup', displayName: 'ClickUp' },
  { name: '@activepieces/piece-todoist', displayName: 'Todoist' },
  { name: '@activepieces/piece-figma', displayName: 'Figma' },
  { name: '@activepieces/piece-quickbooks', displayName: 'QuickBooks' },
  { name: '@activepieces/piece-zoom', displayName: 'Zoom' },
  { name: '@activepieces/piece-microsoft-outlook', displayName: 'Microsoft Outlook' },
  { name: '@activepieces/piece-microsoft-teams', displayName: 'Microsoft Teams' },
  { name: '@activepieces/piece-microsoft-onedrive', displayName: 'Microsoft OneDrive' },
  { name: '@activepieces/piece-trello', displayName: 'Trello' },
  { name: '@activepieces/piece-jira', displayName: 'Jira' },
  { name: '@activepieces/piece-linear', displayName: 'Linear' },
  { name: '@activepieces/piece-intercom', displayName: 'Intercom' },
  { name: '@activepieces/piece-zendesk', displayName: 'Zendesk' },
  { name: '@activepieces/piece-mailchimp', displayName: 'Mailchimp' },
  { name: '@activepieces/piece-shopify', displayName: 'Shopify' },
  { name: '@activepieces/piece-stripe', displayName: 'Stripe' },
].sort((a, b) => a.displayName.localeCompare(b.displayName))

const createFormSchema = z.object({
  pieceName: z.string().min(1, 'Please select a piece'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
})

const editFormSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().optional(),
})

type CreateFormValues = z.infer<typeof createFormSchema>
type EditFormValues = z.infer<typeof editFormSchema>

type Props = {
  app?: CloudOAuthApp
  configuredPieceNames?: string[]
  children?: ReactNode
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddEditCloudOAuthAppDialog({
  app,
  configuredPieceNames = [],
  children,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const isEditMode = !!app

  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled ? controlledOnOpenChange : setUncontrolledOpen

  const configuredSet = useMemo(
    () => new Set(configuredPieceNames),
    [configuredPieceNames],
  )

  const availablePieces = useMemo(() => {
    if (isEditMode) {
      return []
    }
    return CLOUD_OAUTH2_ELIGIBLE_PIECES.filter((piece) => !configuredSet.has(piece.name))
  }, [configuredSet, isEditMode])

  const createMutation = cloudOAuthHooks.useCreateCloudOAuthApp()
  const updateMutation = cloudOAuthHooks.useUpdateCloudOAuthApp()

  const form = useForm<CreateFormValues | EditFormValues>({
    resolver: zodResolver(isEditMode ? editFormSchema : createFormSchema),
    defaultValues: isEditMode
      ? ({ clientId: app?.clientId ?? '', clientSecret: '' } as EditFormValues)
      : ({ pieceName: '', clientId: '', clientSecret: '' } as CreateFormValues),
  })

  useEffect(() => {
    if (open && isEditMode && app) {
      form.reset({
        clientId: app.clientId,
        clientSecret: '',
      })
    }
  }, [open, isEditMode, app])

  const onSubmit = async (values: CreateFormValues | EditFormValues) => {
    try {
      if (isEditMode) {
        const editValues = values as EditFormValues
        await updateMutation.mutateAsync({
          id: app!.id,
          request: {
            clientId: editValues.clientId,
            ...(editValues.clientSecret ? { clientSecret: editValues.clientSecret } : {}),
          },
        })
      } else {
        const createValues = values as CreateFormValues
        await createMutation.mutateAsync({
          pieceName: createValues.pieceName,
          clientId: createValues.clientId,
          clientSecret: createValues.clientSecret,
        })
      }

      setOpen(false)
      form.reset()
      onSuccess?.()
    } catch (error: any) {
      toast.error(t('Error'), {
        description: error?.response?.data?.message || error?.message,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const selectedPieceName = form.watch('pieceName' as any) as string | undefined
  const selectedPiece = CLOUD_OAUTH2_ELIGIBLE_PIECES.find(
    (p) => p.name === (isEditMode ? app?.pieceName : selectedPieceName),
  )

  const dialogContent = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? t('Edit Cloud OAuth App') : t('Add Cloud OAuth App')}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? t('Update the OAuth credentials for this piece.')
            : t(
              'Select a piece and add OAuth credentials to enable the simplified "Connect" button flow.',
            )}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {isEditMode ? (
            <FormItem>
              <FormLabel>{t('Piece')}</FormLabel>
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <PieceIconWithPieceName
                  pieceName={app?.pieceName ?? ''}
                  size="sm"
                  border={false}
                  showTooltip={false}
                />
                <span className="font-medium">
                  {selectedPiece?.displayName ?? app?.pieceName}
                </span>
              </div>
            </FormItem>
          ) : (
            <FormField
              control={form.control}
              name="pieceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Piece')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={availablePieces.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        {field.value ? (
                          <div className="flex items-center gap-2">
                            <PieceIconWithPieceName
                              pieceName={field.value}
                              size="sm"
                              border={false}
                              showTooltip={false}
                            />
                            <span>
                              {CLOUD_OAUTH2_ELIGIBLE_PIECES.find(p => p.name === field.value)?.displayName}
                            </span>
                          </div>
                        ) : (
                          <SelectValue placeholder={t('Select a piece...')} />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePieces.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          {t('All eligible pieces are already configured')}
                        </SelectItem>
                      ) : (
                        availablePieces.map((piece) => (
                          <SelectItem key={piece.name} value={piece.name}>
                            <div className="flex items-center gap-2">
                              <PieceIconWithPieceName
                                pieceName={piece.name}
                                size="sm"
                                border={false}
                                showTooltip={false}
                              />
                              <span>{piece.displayName}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Client ID')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('Client ID')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('Client Secret')}
                  {isEditMode ? (
                    <span className="text-muted-foreground text-xs ml-2">
                      ({t('leave empty to keep existing')})
                    </span>
                  ) : null}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      placeholder={t('Client Secret')}
                      className="pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? t('Saving...')
                : isEditMode
                  ? t('Update')
                  : t('Add')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )

  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {dialogContent}
    </Dialog>
  )
}
