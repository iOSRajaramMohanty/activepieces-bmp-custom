import { t } from 'i18next';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FlowTrigger } from '@activepieces/shared';

import TestWebhookDialog from '../custom-test-step/test-webhook-dialog';

type ManualWebhookTestButtonProps = {
  isWebhookTestingDialogOpen: boolean;
  setIsWebhookTestingDialogOpen: (open: boolean) => void;
  triggerEnabled?: boolean;
};

export const ManualWebhookTestButton = ({
  isWebhookTestingDialogOpen,
  setIsWebhookTestingDialogOpen,
  triggerEnabled,
}: ManualWebhookTestButtonProps) => {
  const [id, setId] = useState<number>(0);
  const formValues = useFormContext<FlowTrigger>().getValues();

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => {
          setIsWebhookTestingDialogOpen(true);
        }}
      >
        {triggerEnabled !== undefined && (
          <span
            className={`h-2 w-2 rounded-full ${
              triggerEnabled ? 'bg-orange-500' : 'bg-red-500'
            }`}
            title={
              triggerEnabled
                ? 'Trigger enabled - waiting for webhook data'
                : 'Trigger disabled - click Test to enable'
            }
          />
        )}
        {t('Generate Sample Data')}
      </Button>

      <TestWebhookDialog
        key={`test-webhook-dialog-${id}`}
        open={isWebhookTestingDialogOpen}
        onOpenChange={(val) => {
          if (!val) {
            setTimeout(() => {
              setId(id + 1);
            }, 200);
          }
          setIsWebhookTestingDialogOpen(val);
        }}
        testingMode="trigger"
        currentStep={formValues}
      />
    </>
  );
};
