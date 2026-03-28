import { createAction, Property, type Action } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { adaBmpAuth } from '../common/auth';
import { API_ENDPOINTS, bmpLogger, fetchMetadata, extractApiToken } from '../common/config';
import FormData from 'form-data';

export const uploadContactParametersAction: Action = createAction({
  auth: adaBmpAuth,
  name: 'upload_contact_parameters',
  displayName: 'Upload Contact Parameters',
  description: 'Upload a CSV file to the BMP /contact/upload-parameters endpoint',
  props: {
    csvContent: Property.LongText({
      displayName: 'CSV Content',
      description: 'The CSV content to upload. Use semicolons as delimiters. First row should be the header: Platform;Customer No;Customer Name;Category;Param1;Param2;Param3;Param3',
      required: true,
    }),
    fileName: Property.ShortText({
      displayName: 'File Name',
      description: 'Name of the CSV file to upload',
      required: false,
      defaultValue: 'contacts.csv',
    }),
  },
  async run(context) {
    const metadata = await fetchMetadata(
      context.project.id,
      context.server as { apiUrl: string; token: string },
      httpClient,
      context.auth,
    );

    const token = extractApiToken(context.auth);
    const { csvContent, fileName } = context.propsValue;

    if (!csvContent) {
      return {
        success: false,
        error: 'CSV content is required.',
      };
    }

    try {
      const apiUrl = API_ENDPOINTS.uploadContactParameters(metadata, context.auth);
      const effectiveFileName = fileName || 'contacts.csv';

      bmpLogger.request({ method: 'POST', url: apiUrl, fileName: effectiveFileName, contentLength: csvContent.length });

      const formData = new FormData();
      formData.append('file', Buffer.from(csvContent, 'utf-8'), {
        filename: effectiveFileName,
        contentType: 'text/csv',
      });

      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: apiUrl,
        headers: {
          Authorization: `Bearer ${token}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });
      bmpLogger.response({ status: response.status, body: response.body });

      return {
        success: true,
        data: response.body,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      bmpLogger.error('Error in upload_contact_parameters', err.message);
      return {
        success: false,
        error: err.message || 'Failed to upload contact parameters',
      };
    }
  },
});
