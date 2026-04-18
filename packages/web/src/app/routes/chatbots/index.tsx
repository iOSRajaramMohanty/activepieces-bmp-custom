import { Permission } from '@activepieces/shared';
import { t } from 'i18next';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/custom/field';
import { LoadingSpinner } from '@/components/custom/spinner';
import { BotIcon } from '@/components/icons/bot';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { internalErrorToast } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { chatbotEmbedHooks } from '@/features/chatbots/hooks/chatbot-embed-hooks';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { API_URL } from '@/lib/api';
import { authenticationSession } from '@/lib/authentication-session';

export function ChatbotsPage() {
  const { projectId: projectIdFromUrl } = useParams<{ projectId: string }>();
  const projectId =
    projectIdFromUrl ?? authenticationSession.getProjectId() ?? '';
  const { checkAccess } = useAuthorization();
  const canWrite = checkAccess(Permission.WRITE_FLOW) === true;

  const { data: embed, isLoading } =
    chatbotEmbedHooks.useChatbotEmbedSettings(projectId);
  const { mutate: updateEmbed, isPending: isUpdating } =
    chatbotEmbedHooks.useUpdateChatbotEmbed(projectId);
  const { mutate: rotateKey, isPending: isRotating } =
    chatbotEmbedHooks.useRotateChatbotEmbedKey(projectId);

  const [domainsDraft, setDomainsDraft] = useState('');

  useEffect(() => {
    if (embed) {
      setDomainsDraft(embed.allowedDomains.join('\n'));
    }
  }, [embed]);

  const domainsMatchServer = useMemo(() => {
    if (!embed) {
      return true;
    }
    const parsed = parseDomainsInput(domainsDraft);
    if (parsed.length !== embed.allowedDomains.length) {
      return false;
    }
    const sortedA = [...parsed].sort().join('|');
    const sortedB = [...embed.allowedDomains].sort().join('|');
    return sortedA === sortedB;
  }, [domainsDraft, embed]);

  const embedSnippet = useMemo(() => {
    if (!embed || projectId.length === 0) {
      return '';
    }
    return [
      `import { ChatbotWidget } from '@activepieces/chatbot-sdk';`,
      '',
      '// Host page must be able to reach this API (CORS). Use allowedDomains to restrict origins.',
      `<ChatbotWidget`,
      `  apiUrl="${API_URL}"`,
      `  projectId="${projectId}"`,
      `  publishableKey="${embed.publishableKey}"`,
      `  mode="builder"`,
      `/>`,
    ].join('\n');
  }, [embed, projectId]);

  if (projectId.length === 0) {
    return null;
  }

  if (isLoading || !embed) {
    return (
      <div className="flex w-full items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <BotIcon size={18} />
          <div className="flex flex-col gap-1">
            <div className="font-medium">{t('ChatbotEmbedTitle')}</div>
            <p className="text-sm text-muted-foreground">
              {t('ChatbotEmbedDescription')}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="chatbot-embed-enabled">
              {t('ChatbotEmbedEnableLabel')}
            </FieldLabel>
            <FieldDescription>
              {t('ChatbotEmbedEnableDescription')}
            </FieldDescription>
          </FieldContent>
          <Switch
            id="chatbot-embed-enabled"
            checked={embed.enabled}
            disabled={!canWrite || isUpdating}
            onCheckedChange={(checked) => {
              updateEmbed({ enabled: checked });
            }}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="chatbot-embed-builder">
              {t('ChatbotEmbedBuilderLabel')}
            </FieldLabel>
          </FieldContent>
          <Switch
            id="chatbot-embed-builder"
            checked={embed.builderEnabled}
            disabled={!canWrite || isUpdating}
            onCheckedChange={(checked) => {
              updateEmbed({ builderEnabled: checked });
            }}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="chatbot-embed-agent">
              {t('ChatbotEmbedAgentLabel')}
            </FieldLabel>
          </FieldContent>
          <Switch
            id="chatbot-embed-agent"
            checked={embed.agentEnabled}
            disabled={!canWrite || isUpdating}
            onCheckedChange={(checked) => {
              updateEmbed({ agentEnabled: checked });
            }}
          />
        </Field>

        <div className="space-y-2">
          <FieldLabel htmlFor="chatbot-embed-domains">
            {t('ChatbotEmbedDomainsLabel')}
          </FieldLabel>
          <p className="text-sm text-muted-foreground">
            {t('ChatbotEmbedDomainsHelp')}
          </p>
          <Textarea
            id="chatbot-embed-domains"
            value={domainsDraft}
            onChange={(e) => setDomainsDraft(e.target.value)}
            disabled={!canWrite}
            rows={5}
            className="font-mono text-sm"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!canWrite || isUpdating || domainsMatchServer}
            onClick={() => {
              updateEmbed(
                { allowedDomains: parseDomainsInput(domainsDraft) },
                {
                  onSuccess: () => {
                    toast.success(t('ChatbotEmbedSaved'));
                  },
                },
              );
            }}
          >
            {t('ChatbotEmbedDomainsSave')}
          </Button>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="chatbot-embed-key">
            {t('ChatbotEmbedPublishableKeyLabel')}
          </FieldLabel>
          <p className="text-sm text-muted-foreground">
            {t('ChatbotEmbedPublishableKeyHelp')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="chatbot-embed-key"
              readOnly
              value={embed.publishableKey}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!canWrite}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(embed.publishableKey);
                    toast.success(t('ChatbotEmbedCopied'));
                  } catch {
                    internalErrorToast();
                  }
                }}
              >
                {t('Copy')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canWrite || isRotating}
                onClick={() => {
                  rotateKey();
                }}
              >
                {t('ChatbotEmbedRotateKey')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="font-medium">{t('ChatbotEmbedSnippetTitle')}</div>
        <p className="text-sm text-muted-foreground">
          {t('ChatbotEmbedSnippetHelp')}
        </p>
        <Textarea
          readOnly
          value={embedSnippet}
          rows={12}
          className="font-mono text-xs"
        />
      </Card>
    </div>
  );
}

function parseDomainsInput(raw: string): string[] {
  const parts = raw.split(/[\n,]+/);
  const result: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      result.push(trimmed);
    }
  }
  return result;
}
