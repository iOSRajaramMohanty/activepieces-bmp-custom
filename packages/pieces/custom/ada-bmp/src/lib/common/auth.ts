import { PieceAuth, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';

export const adaBmpAuth = PieceAuth.CustomAuth({
  displayName: 'ADA BMP Connection',
  description: 'Configure your ADA BMP API connection with environment-specific settings',
  required: true,
  props: {
    apiToken: Property.ShortText({
      displayName: 'API Token',
      description: 'Enter your ADA BMP API token',
      required: true,
    }),
    environment: Property.StaticDropdown({
      displayName: 'Environment',
      description: 'Select the environment for this connection (filtered by your organization)',
      required: true,
      options: {
        disabled: false,
        options: [
          { label: 'Dev', value: 'Dev' },
          { label: 'Staging', value: 'Staging' },
          { label: 'Production', value: 'Production' },
        ],
      },
    }),
  },
  validate: async ({ auth }) => {
    try {
      const typedAuth = auth as { apiToken: string; environment: string };

      // API URL must come from organization_environment.metadata (injected as process.env.ADA_BMP_API_URL)
      const apiUrl = process.env.ADA_BMP_API_URL?.trim();
      if (!apiUrl) {
        return {
          valid: false,
          error: `No API URL configured for "${typedAuth.environment}" environment. Configure ADA_BMP_API_URL in Organization > Environments > [your org] > Configure for the selected environment.`,
        };
      }

      const checkTokenUrl = `${apiUrl.replace(/\/$/, '')}/user/checkToken`;
      console.log('[ADA-BMP Auth] Validating against URL:', checkTokenUrl);
      
      // Validate token by calling /user/checkToken endpoint
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: checkTokenUrl,
        body: {
          accessToken: typedAuth.apiToken,
        },
      });

      console.log('[ADA-BMP Auth] Response Status:', response.status);
      console.log('[ADA-BMP Auth] Response Body:', JSON.stringify(response.body, null, 2));

      if (response.status === 200) {
        console.log('[ADA-BMP Auth] Token validated for environment:', typedAuth.environment);
        
        // Don't store API URL in connection metadata - let database metadata take precedence
        // The .env URL is only used for validation; runtime will use database metadata
        return {
          valid: true,
          metadata: {
            ADA_BMP_ENVIRONMENT: typedAuth.environment,
            ADA_BMP_VALIDATED_AT: new Date().toISOString(),
            ADA_BMP_DEBUG: process.env.ADA_BMP_DEBUG === 'true',
            ADA_BMP_TIMEOUT: parseInt(process.env.ADA_BMP_TIMEOUT || '30000', 10),
          },
        };
      }

      console.log('[ADA-BMP Auth] ===== TOKEN VALIDATION FAILED =====');
      
      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          error: `Invalid token for ${typedAuth.environment} environment. Please ensure you are using the correct token for the ${apiUrl} API.`,
        };
      }
      
      if (response.status === 400) {
        const errorBody = response.body as { message?: string; error?: string } | null;
        const errorMessage = errorBody?.message || errorBody?.error || 'Invalid token format or token expired';
        return {
          valid: false,
          error: `Token validation failed: ${errorMessage}`,
        };
      }

      if (response.status >= 500 && response.status < 600) {
        return {
          valid: false,
          error: `BMP ${typedAuth.environment} API is temporarily unavailable (server error ${response.status}). Please try again later or use a different environment.`,
        };
      }
      
      return {
        valid: false,
        error: `Token validation returned status ${response.status}. Please check your API token.`,
      };
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; body?: { message?: string; error?: string } }; message?: string; constructor?: { name?: string } };
      
      console.error('[ADA-BMP Auth] ===== TOKEN VALIDATION ERROR =====');
      console.error('[ADA-BMP Auth] Error Type:', err.constructor?.name);
      console.error('[ADA-BMP Auth] Error Message:', err.message);
      console.error('[ADA-BMP Auth] Error Response Status:', err.response?.status);
      console.error('[ADA-BMP Auth] Error Response Body:', err.response?.body);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        return {
          valid: false,
          error: `Invalid token: Authentication failed for ${(auth as { environment?: string }).environment} environment.`,
        };
      }
      
      if (err.response?.status === 400) {
        const errorBody = err.response?.body;
        const errorMessage = errorBody?.message || errorBody?.error || 'Invalid token format or token expired';
        return {
          valid: false,
          error: `Token validation failed: ${errorMessage}`,
        };
      }

      const status = err.response?.status;
      if (status && status >= 500 && status < 600) {
        const env = (auth as { environment?: string })?.environment ?? 'API';
        return {
          valid: false,
          error: `BMP ${env} API is temporarily unavailable (server error ${status}). Please try again later or use a different environment.`,
        };
      }
      
      return {
        valid: false,
        error: `Failed to validate token: ${err.message || 'Unknown error'}`,
      };
    }
  },
});
