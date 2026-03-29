import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { Building2, Mail, User, Lock, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { superAdminApi, CreateTenantRequest } from '@/lib/super-admin-api';

interface CreateTenantDialogProps {
  children?: React.ReactNode;
  onSuccess?: () => void;
}

export function CreateTenantDialog({
  children,
  onSuccess,
}: CreateTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTenantRequest>();

  const { mutate: createTenant, isPending } = useMutation({
    mutationFn: (data: CreateTenantRequest) => superAdminApi.createTenant(data),
    onSuccess: (response) => {
      toast.success(t('Tenant created successfully!'), {
        description: `Platform "${response.name}" has been created with admin user ${response.ownerEmail}`,
        duration: 5000,
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['super-admin-platforms'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });

      setOpen(false);
      reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.params?.message ||
        error?.message ||
        'Failed to create tenant';
      toast.error(t('Failed to create tenant'), {
        description: message,
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: CreateTenantRequest) => {
    createTenant(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Building2 className="mr-2 h-4 w-4" />
            {t('Create New Tenant')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('Create New Tenant')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Create a new platform/tenant with an admin user. The admin will be able to manage their platform.',
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Platform Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('Platform Name')}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Acme Corporation"
              {...register('name', {
                required: t('Platform name is required'),
                minLength: {
                  value: 1,
                  message: t('Platform name must be at least 1 character'),
                },
                maxLength: {
                  value: 100,
                  message: t('Platform name must be less than 100 characters'),
                },
              })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Owner Email */}
          <div className="space-y-2">
            <Label htmlFor="ownerEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('Admin Email')}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ownerEmail"
              type="email"
              placeholder="admin@example.com"
              {...register('ownerEmail', {
                required: t('Email is required'),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('Invalid email address'),
                },
              })}
            />
            {errors.ownerEmail && (
              <p className="text-sm text-destructive">
                {errors.ownerEmail.message}
              </p>
            )}
          </div>

          {/* Owner First Name */}
          <div className="space-y-2">
            <Label htmlFor="ownerFirstName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('First Name')}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ownerFirstName"
              placeholder="John"
              {...register('ownerFirstName', {
                required: t('First name is required'),
                minLength: {
                  value: 1,
                  message: t('First name must be at least 1 character'),
                },
              })}
            />
            {errors.ownerFirstName && (
              <p className="text-sm text-destructive">
                {errors.ownerFirstName.message}
              </p>
            )}
          </div>

          {/* Owner Last Name */}
          <div className="space-y-2">
            <Label htmlFor="ownerLastName" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {t('Last Name')}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ownerLastName"
              placeholder="Doe"
              {...register('ownerLastName', {
                required: t('Last name is required'),
                minLength: {
                  value: 1,
                  message: t('Last name must be at least 1 character'),
                },
              })}
            />
            {errors.ownerLastName && (
              <p className="text-sm text-destructive">
                {errors.ownerLastName.message}
              </p>
            )}
          </div>

          {/* Owner Password */}
          <div className="space-y-2">
            <Label htmlFor="ownerPassword" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('Admin Password')}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ownerPassword"
              type="password"
              placeholder="••••••••"
              {...register('ownerPassword', {
                required: t('Password is required'),
                minLength: {
                  value: 8,
                  message: t('Password must be at least 8 characters'),
                },
              })}
            />
            {errors.ownerPassword && (
              <p className="text-sm text-destructive">
                {errors.ownerPassword.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('Minimum 8 characters required')}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={isPending}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" loading={isPending}>
              <Building2 className="mr-2 h-4 w-4" />
              {t('Create Tenant')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
