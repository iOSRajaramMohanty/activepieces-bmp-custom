import { createAction, Property, type DynamicPropsValue } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { adaBmpAuth } from '../common/auth';
import {
  adaBmpChannelForBulk,
  adaBmpAccount,
  messageType,
  adaBmpContactCategory,
  adaBmpTemplate,
  adaBmpTemplateCategory,
  channelInfo,
  CHANNEL_TO_PLATFORM,
} from '../common/props';
import { API_ENDPOINTS, bmpLogger, debugLog, fetchMetadata, extractApiToken } from '../common/config';
import {
  buildBulkTemplateRequestBody,
  extractPlaceholderIndices,
  parseTemplateParametersJson,
  unescapeBmpBraces,
  type AdaBmpTemplateRecord,
  type BulkTemplateSlotMap,
} from '../common/bulk-template-payload';

function isAdaBmpTemplateRecord(value: unknown): value is AdaBmpTemplateRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const id = Reflect.get(value, 'id');
  const name = Reflect.get(value, 'name');
  const category = Reflect.get(value, 'category');
  return typeof id === 'string' && typeof name === 'string' && typeof category === 'string';
}

function parseTemplateRow(raw: string): AdaBmpTemplateRecord | null {
  try {
    const parsed: unknown = JSON.parse(unescapeBmpBraces(raw));
    if (!isAdaBmpTemplateRecord(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildRecordFromApiTemplate(t: Record<string, unknown>): AdaBmpTemplateRecord {
  return {
    id: String(t.id ?? ''),
    name: String(t.name ?? ''),
    category: String(t.category ?? ''),
    type: t.type as string | undefined,
    isCallPermissionRequest: t.isCallPermissionRequest === true,
    body: String(t.body ?? t.content ?? ''),
    header: t.header as string | undefined,
    footer: t.footer as string | undefined,
    headerType: t.headerType as string | null | undefined,
    language: t.language as string | undefined,
    bodyParameters: (t.bodyParameters ?? null) as string[] | null,
    buttons: (t.buttons ?? null) as AdaBmpTemplateRecord['buttons'],
    carouselCards: (t.carouselCards ?? null) as AdaBmpTemplateRecord['carouselCards'],
  };
}

async function fetchTemplateByName(
  templateName: string,
  auth: unknown,
  accountId: unknown,
  serverCtx: unknown,
  projectId: unknown,
): Promise<AdaBmpTemplateRecord | null> {
  if (!auth || !accountId || typeof accountId !== 'string') return null;
  try {
    const server = serverCtx && typeof serverCtx === 'object'
      ? serverCtx as { apiUrl: string; token: string }
      : undefined;
    const metadata = await fetchMetadata(
      typeof projectId === 'string' ? projectId : undefined,
      server,
      httpClient,
      auth,
    );
    const apiUrl = API_ENDPOINTS.getTemplates(accountId, metadata, auth);
    const token = extractApiToken(auth);
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: apiUrl,
      authentication: { type: AuthenticationType.BEARER_TOKEN, token },
    });
    const body = response.body as { data?: Array<Record<string, unknown>> };
    if (!body.data || !Array.isArray(body.data)) return null;
    const found = body.data.find(
      (t) => typeof t.name === 'string' && t.name === templateName && t.status === 'APPROVED',
    );
    if (!found) return null;
    return buildRecordFromApiTemplate(found);
  } catch {
    return null;
  }
}

async function resolveTemplate(
  templateValue: unknown,
  auth: unknown,
  accountId: unknown,
  serverCtx: unknown,
  projectId: unknown,
): Promise<AdaBmpTemplateRecord | null> {
  if (!templateValue || typeof templateValue !== 'string' || !templateValue.trim()) return null;
  const fromJson = parseTemplateRow(templateValue);
  if (fromJson) return fromJson;
  return fetchTemplateByName(templateValue.trim(), auth, accountId, serverCtx, projectId);
}

const DYNAMIC_MD_KEY = /^\d{3}_md_/;
const DYNAMIC_SLOT_KEY = /^(\d{3})_j?slot_(.+)$/;

function mergeTemplateSlotMaps(
  jsonSlots: BulkTemplateSlotMap,
  dynamicFields: unknown,
): BulkTemplateSlotMap {
  const merged: BulkTemplateSlotMap = {};
  if (dynamicFields && typeof dynamicFields === 'object' && !Array.isArray(dynamicFields)) {
    for (const [k, v] of Object.entries(dynamicFields)) {
      if (k.startsWith('_info_')) continue;
      if (DYNAMIC_MD_KEY.test(k)) continue;
      const slotMatch = k.match(DYNAMIC_SLOT_KEY);
      const slotKey = slotMatch ? slotMatch[2] : k;
      const slotVal = extractFileSlotValue(v);
      if (slotVal) {
        merged[slotKey] = slotVal;
      }
    }
  }
  for (const [k, v] of Object.entries(jsonSlots)) {
    if (v) {
      merged[k] = v;
    }
  }
  return merged;
}

function hasMediaHeader(ht: string | null | undefined): boolean {
  if (ht === undefined || ht === null) return false;
  const s = String(ht);
  if (s === 'null') return true;
  const u = s.toUpperCase();
  return u === 'IMAGE' || u === 'VIDEO' || u === 'DOCUMENT';
}

function hasMediaFormat(fmt: string | undefined | null): boolean {
  if (!fmt) return false;
  const u = fmt.toUpperCase();
  return u === 'IMAGE' || u === 'VIDEO' || u === 'DOCUMENT';
}

function escapeMarkdownBraces(text: string): string {
  return text.replace(/\{\{/g, '{\u200B{').replace(/\}\}/g, '}\u200B}');
}

function buildFileBrowseProperty(displayName: string, defaultUrl: string) {
  return Property.Custom({
    displayName,
    description: defaultUrl ? 'default:' + defaultUrl : '',
    required: false,
    code: (ctx) => {
      const container = document.getElementById(ctx.containerId);
      if (!container) return;

      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '6px';

      const desc = ctx.property.description || '';
      const defUrl = desc.startsWith('default:') ? desc.slice(8) : '';

      const val = ctx.value;
      const isObj = val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val);
      let initName = '';
      let initSource = '';
      let initSize = 0;
      if (isObj) {
        initName = String(Reflect.get(val, 'fileName') || '');
        initSource = String(Reflect.get(val, 'source') || '');
        initSize = Number(Reflect.get(val, 'size') || 0);
      } else if (typeof val === 'string' && val) {
        initName = val;
      }
      if (!initName && defUrl) {
        initName = defUrl;
      }

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.placeholder = 'File name or URL';
      textInput.value = initName;
      textInput.style.cssText =
        'flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;background:transparent;color:inherit;outline:none;';
      if (ctx.disabled) textInput.disabled = true;

      textInput.addEventListener('input', function () {
        ctx.onChange({ fileName: textInput.value, source: 'manual' });
      });

      const browseBtn = document.createElement('button');
      browseBtn.textContent = 'Browse';
      browseBtn.type = 'button';
      browseBtn.style.cssText =
        'padding:6px 16px;background:#6c47ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;white-space:nowrap;';
      if (ctx.disabled) {
        browseBtn.disabled = true;
        browseBtn.style.opacity = '0.5';
        browseBtn.style.cursor = 'default';
      }

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx';
      fileInput.style.display = 'none';

      browseBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      });

      const statusEl = document.createElement('small');
      statusEl.style.cssText = 'color:#6b7280;font-size:12px;';
      if (initSource === 'browse' && initName) {
        statusEl.textContent =
          'Selected: ' + initName + ' (' + Math.round(initSize / 1024) + ' KB)';
      } else if (initName) {
        statusEl.textContent = 'Current: ' + initName;
      } else {
        statusEl.textContent = 'Select a media file or type the file name / URL.';
      }

      fileInput.addEventListener('change', function () {
        const files = fileInput.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        textInput.value = file.name;

        const reader = new FileReader();
        reader.onload = function () {
          ctx.onChange({
            fileName: file.name,
            base64Content: reader.result,
            mimeType: file.type,
            size: file.size,
            source: 'browse',
          });
          statusEl.textContent =
            'Selected: ' + file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
        };
        reader.readAsDataURL(file);
      });

      row.appendChild(textInput);
      row.appendChild(browseBtn);
      container.appendChild(row);
      container.appendChild(statusEl);
      container.appendChild(fileInput);

      return function () {
        container.innerHTML = '';
      };
    },
  });
}

function extractFileSlotValue(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object' && !Array.isArray(v)) {
    const fileName = Reflect.get(v, 'fileName');
    return typeof fileName === 'string' && fileName.trim() ? fileName.trim() : null;
  }
  const s = String(v).trim();
  return s || null;
}

function createOrderedDynamicKeys(jsonMode = false) {
  let n = 0;
  const slotTag = jsonMode ? 'jslot' : 'slot';
  return {
    md(suffix: string): string {
      n += 1;
      return `${String(n).padStart(3, '0')}_md_${suffix}`;
    },
    slot(realKey: string): string {
      n += 1;
      return `${String(n).padStart(3, '0')}_${slotTag}_${realKey}`;
    },
  };
}

function buildWaTemplateSlotDynamicProps(record: AdaBmpTemplateRecord | null, messageTypeValue: unknown, jsonOverridesRaw?: unknown): DynamicPropsValue {
  if (messageTypeValue !== 'template' || !record) {
    return {};
  }

  if (record.category === 'AUTHENTICATION') return {};
  const isCp =
    record.isCallPermissionRequest === true &&
    (record.category === 'MARKETING' || record.category === 'UTILITY');
  if (isCp) return {};

  let jv: BulkTemplateSlotMap = {};
  let jsonDiagnostic = '';
  if (typeof jsonOverridesRaw === 'string' && jsonOverridesRaw.trim()) {
    const trimmed = jsonOverridesRaw.trim();
    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
      jsonDiagnostic = `Variable \`${escapeMarkdownBraces(trimmed)}\` was not resolved. Test the trigger step first to generate sample data, then toggle Apply off and on again.`;
    } else {
      const parsed = parseTemplateParametersJson(trimmed, record);
      if (parsed.ok) {
        jv = parsed.slots;
      } else {
        jsonDiagnostic = `JSON parse error: ${parsed.error}\n\nReceived (first 120 chars): \`${escapeMarkdownBraces(trimmed.substring(0, 120))}\``;
      }
    }
  } else if (jsonOverridesRaw !== undefined && jsonOverridesRaw !== null && jsonOverridesRaw !== '') {
    jsonDiagnostic = `Unexpected value type: ${typeof jsonOverridesRaw}`;
  }
  const hasJsonOverrides = Object.keys(jv).length > 0;

  const key = createOrderedDynamicKeys(hasJsonOverrides);
  const fields: DynamicPropsValue = {};
  const htStr = String(record.headerType ?? '').toUpperCase() || 'TEXT';

  const jsonAppliedKey = key.md('json_applied');
  if (hasJsonOverrides) {
    let previewMd = `**JSON Applied** — ${Object.keys(jv).length} value(s) resolved:\n\n`;
    for (const [slotKey, slotVal] of Object.entries(jv)) {
      const displayVal = slotVal.length > 80 ? slotVal.substring(0, 77) + '...' : slotVal;
      previewMd += `- **${escapeMarkdownBraces(slotKey)}**: \`${escapeMarkdownBraces(displayVal)}\`\n`;
    }
    fields[jsonAppliedKey] = Property.MarkDown({ value: previewMd });
  } else if (jsonDiagnostic) {
    fields[jsonAppliedKey] = Property.MarkDown({ value: `**Preview unavailable** — ${jsonDiagnostic}` });
  }

  let headerIntro = `**Header (Optional)**\n\nType: \`${htStr}\``;
  if (htStr === 'TEXT' && record.header) {
    headerIntro += `\n\n**Header Text**\n\n${escapeMarkdownBraces(record.header)}`;
  }
  fields[key.md('hdr')] = Property.MarkDown({ value: headerIntro });

  const headerNums = extractPlaceholderIndices(record.header);
  for (const n of headerNums) {
    fields[key.slot(`Header text:${n}`)] = Property.ShortText({
      displayName: `Header · Param ${n}`,
      description: `{{${n}}} in template header`,
      required: false,
      defaultValue: jv[`Header text:${n}`] ?? '',
    });
  }

  if (hasMediaHeader(record.headerType)) {
    fields[key.slot('headerMedia:fileName')] = buildFileBrowseProperty(
      'File',
      jv['headerMedia:fileName'] ?? String(record.header ?? ''),
    );
  }

  if (record.body) {
    fields[key.md('tpl_text')] = Property.MarkDown({
      value: `**Template Text**\n\n${escapeMarkdownBraces(record.body)}`,
    });
  }
  const bodyNums = extractPlaceholderIndices(record.body);
  const bodyExamples: string[] = Array.isArray(record.bodyParameters) ? record.bodyParameters : [];
  for (let ni = 0; ni < bodyNums.length; ni++) {
    const n = bodyNums[ni];
    const example = bodyExamples[ni];
    fields[key.slot(`Body:${n}`)] = Property.ShortText({
      displayName: `Template body · Param ${n}`,
      description: example ? `e.g. ${example}` : `{{${n}}} in main template body`,
      required: false,
      defaultValue: jv[`Body:${n}`] ?? example ?? '',
    });
  }

  const footerNums = extractPlaceholderIndices(record.footer);
  if (footerNums.length > 0) {
    fields[key.md('ftr')] = Property.MarkDown({ value: `**Footer**\n\n${escapeMarkdownBraces(record.footer ?? '')}` });
    for (const n of footerNums) {
      fields[key.slot(`Footer:${n}`)] = Property.ShortText({
        displayName: `Footer · Param ${n}`,
        description: `{{${n}}} in template footer`,
        required: false,
        defaultValue: jv[`Footer:${n}`] ?? '',
      });
    }
  }

  if (record.type === 'carousel' && Array.isArray(record.carouselCards) && record.carouselCards.length > 0) {
    fields[key.md('car_sep')] = Property.MarkDown({ value: '---\n\n**CAROUSEL**' });

    for (let ci = 0; ci < record.carouselCards.length; ci++) {
      const cardParts = record.carouselCards[ci];
      if (!Array.isArray(cardParts)) continue;

      const headerPart = cardParts.find((p) => p.type === 'header');
      const bodyPart = cardParts.find((p) => p.type === 'body');
      const buttonsPart = cardParts.find((p) => p.type === 'buttons');

      const cardHeaderMd = `### Carousel Card ${ci + 1}\n\n**Card Header : ${headerPart?.format ?? 'none'}**`;
      fields[key.md(`c${ci}_title`)] = Property.MarkDown({ value: cardHeaderMd });

      if (hasMediaFormat(headerPart?.format)) {
        fields[key.slot(`Card ${ci + 1} media:fileName`)] = buildFileBrowseProperty(
          'File',
          jv[`Card ${ci + 1} media:fileName`] ?? String(headerPart?.media_url ?? ''),
        );
      }

      if (bodyPart?.text) {
        fields[key.md(`c${ci}_body_hdr`)] = Property.MarkDown({ value: '**Card Body**' });
        fields[key.md(`c${ci}_body`)] = Property.MarkDown({
          value: `**Content**\n\n${escapeMarkdownBraces(bodyPart.text)}`,
        });
        const cardNums = extractPlaceholderIndices(bodyPart.text);
        const examples: string[] = Array.isArray(bodyPart.parameters) ? bodyPart.parameters : [];
        for (let ni = 0; ni < cardNums.length; ni++) {
          const n = cardNums[ni];
          const example = examples[ni];
          fields[key.slot(`Card ${ci + 1} body:${n}`)] = Property.ShortText({
            displayName: `Param ${n}`,
            description: example ? `e.g. ${example}` : `{{${n}}} in card ${ci + 1} body`,
            required: false,
            defaultValue: jv[`Card ${ci + 1} body:${n}`] ?? example ?? '',
          });
        }
      }

      if (buttonsPart?.buttons && Array.isArray(buttonsPart.buttons) && buttonsPart.buttons.length > 0) {
        fields[key.md(`c${ci}_btns_hdr`)] = Property.MarkDown({ value: '**Card Buttons**' });

        buttonsPart.buttons.forEach((b, bi) => {
          const bType = (b.type ?? '').toLowerCase();
          if (bType === 'phone_number') {
            fields[key.slot(`Card ${ci + 1} btn:${bi}:phone`)] = Property.ShortText({
              displayName: `Button ${bi + 1} Phone Number`,
              description: b.text ? `Label: ${b.text}` : 'Phone number',
              required: false,
              defaultValue: jv[`Card ${ci + 1} btn:${bi}:phone`] ?? b.phone_number ?? '',
            });
          } else if (bType === 'quick_reply') {
            fields[key.slot(`Card ${ci + 1} btn:${bi}:qr`)] = Property.ShortText({
              displayName: `Button ${bi + 1} Quick Reply`,
              description: 'Quick reply button text',
              required: false,
              defaultValue: jv[`Card ${ci + 1} btn:${bi}:qr`] ?? b.text ?? '',
            });
            fields[key.slot(`Card ${ci + 1} btn:${bi}:payload`)] = Property.ShortText({
              displayName: `Button Payload ${bi + 1}`,
              description: 'Developer payload for this quick reply',
              required: false,
              defaultValue: jv[`Card ${ci + 1} btn:${bi}:payload`] ?? '',
            });
          } else if (bType === 'url') {
            fields[key.slot(`Card ${ci + 1} btn:${bi}:url`)] = Property.ShortText({
              displayName: `Button ${bi + 1} URL`,
              description: b.text ? `Label: ${b.text}` : 'Button URL',
              required: false,
              defaultValue: jv[`Card ${ci + 1} btn:${bi}:url`] ?? b.url ?? '',
            });
          }
        });
      }
    }
  }

  const btnList = record.buttons;
  if (Array.isArray(btnList) && btnList.length > 0) {
    fields[key.md('btn_sep')] = Property.MarkDown({ value: '---\n\n**BUTTONS**' });
    let btnMd = '';
    btnList.forEach((b, i) => {
      const bType = (b.type ?? '').toUpperCase();
      if (bType === 'QUICK_REPLY') {
        btnMd += `\n**Button ${i + 1} Quick Reply:** \`${b.text ?? ''}\``;
      } else if (bType === 'PHONE_NUMBER') {
        btnMd += `\n**Button ${i + 1} Phone Number:** \`${b.phoneNumber ?? ''}\``;
      } else if (bType === 'URL') {
        btnMd += `\n**Button ${i + 1} URL:** \`${b.url ?? ''}\``;
      } else if (bType === 'FLOW') {
        btnMd += `\n**Button ${i + 1} Flow:** \`${b.text ?? ''}\``;
      } else {
        btnMd += `\n**Button ${i + 1}:** \`${b.type ?? ''}\` — ${b.text ?? ''}`;
      }
    });
    fields[key.md('btn_list')] = Property.MarkDown({ value: btnMd.trim() });

    btnList.forEach((b, i) => {
      if (b.type === 'QUICK_REPLY') {
        fields[key.slot(`payload:${i}`)] = Property.ShortText({
          displayName: `Button Payload ${i + 1}`,
          description: b.text ? `Quick reply: ${b.text}` : 'Quick reply payload',
          required: false,
          defaultValue: jv[`payload:${i}`] ?? '',
        });
      }
    });
  }

  return fields;
}

export const sendBulkMessageAction = createAction({
  auth: adaBmpAuth,
  name: 'send_bulk_message',
  displayName: 'Send Bulk Message',
  description: 'Send bulk messages through ADA BMP to WhatsApp, Facebook, Line, or Instagram using contact categories',
  props: {
    info: channelInfo,
    channel: adaBmpChannelForBulk(true),
    contactCategory: adaBmpContactCategory(true),
    messageType: messageType,
    account: adaBmpAccount(true),
    templateCategory: adaBmpTemplateCategory,
    template: adaBmpTemplate(false),
    templateParametersJson: Property.LongText({
      displayName: 'Template parameters (JSON)',
      description:
        'Optional: paste a BMP API payload (with templateData, templateCarouselCards, etc.) and values auto-map to slot keys. Or use raw slot keys (Body:1, Card 1 body:1, payload:0, …). Non-empty Template fields below override JSON values.',
      required: false,
    }),
    applyJson: Property.Checkbox({
      displayName: 'Apply JSON to preview',
      description: 'Toggle on to fill template fields from the JSON above for validation before publishing.',
      required: false,
      defaultValue: false,
    }),
    waTemplateSlots: Property.DynamicProperties({
      auth: adaBmpAuth,
      displayName: 'Template fields',
      description:
        'Parameters for the selected template. Shown when Message Type is Send WA Template and a template is selected.',
      required: false,
      refreshers: ['template', 'messageType', 'applyJson', 'templateParametersJson'],
      props: async ({ auth, account, template, messageType: messageTypeValue, applyJson, templateParametersJson: tpJson }, ctx) => {
        const shouldApply = applyJson === true || applyJson === 'true';
        const jsonRaw = shouldApply && typeof tpJson === 'string' ? tpJson : undefined;
        const record = await resolveTemplate(template, auth, account, ctx.server, ctx.project.id);
        return buildWaTemplateSlotDynamicProps(record, messageTypeValue, jsonRaw);
      },
    }),
    message: Property.LongText({
      displayName: 'Message / OTP',
      description:
        'Required for non-template message types (text, media, etc.). For AUTHENTICATION templates, enter the OTP. Optional for other templates when Template fields or JSON parameters are set.',
      required: false,
    }),
  },
  async run(context) {
    const metadata = await fetchMetadata(
      context.project.id,
      context.server,
      httpClient,
      context.auth,
    );

    const token = extractApiToken(context.auth);
    const {
      channel,
      account,
      messageType: msgType,
      contactCategory,
      templateCategory,
      template,
      message,
      templateParametersJson,
      waTemplateSlots,
    } = context.propsValue;

    if (!contactCategory) {
      return {
        success: false,
        error: 'Contact category is required.',
      };
    }

    if (msgType === 'template' && !templateCategory) {
      return {
        success: false,
        error: 'Template Category is required when Message Type is "Send WA Template".',
      };
    }

    try {
      const platformCode = CHANNEL_TO_PLATFORM[channel as string];

      if (!platformCode) {
        throw new Error(`Invalid channel: ${channel}`);
      }

      const accountsUrl = API_ENDPOINTS.getAccounts(platformCode, metadata, context.auth);
      bmpLogger.request({ method: 'GET', url: accountsUrl });
      const accountsResponse = await httpClient.sendRequest({
        method: HttpMethod.GET,
        url: accountsUrl,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token,
        },
      });
      bmpLogger.response({ status: accountsResponse.status, body: accountsResponse.body });

      const accountsBody = accountsResponse.body as {
        status: number;
        message: string;
        data: Array<{
          id: string;
          accountNo: string;
          platform: string;
        }>;
      };

      const selectedAccount = accountsBody.data.find((acc) => acc.id === account);

      if (!selectedAccount) {
        throw new Error('Selected account not found');
      }

      const apiUrl = API_ENDPOINTS.sendBulkMessage(metadata, context.auth);
      debugLog(
        'Sending bulk message',
        {
          url: apiUrl,
          channel,
          platform: platformCode,
          from: selectedAccount.accountNo,
          contactCategory,
          messageType: msgType,
        },
        metadata,
      );

      let requestBody: Record<string, unknown>;

      if (msgType === 'template') {
        if (!template || typeof template !== 'string') {
          return {
            success: false,
            error: 'Template is required when Message Type is "Send WA Template".',
          };
        }

        bmpLogger.info('Send bulk: template prop value', { template, type: typeof template });

        const templateRecord = await resolveTemplate(
          template,
          context.auth,
          account,
          context.server,
          context.project.id,
        );
        bmpLogger.info('Send bulk: resolved template record', {
          found: !!templateRecord,
          name: templateRecord?.name,
          category: templateRecord?.category,
        });
        if (!templateRecord) {
          return {
            success: false,
            error: 'Could not resolve template. Re-select the template.',
          };
        }

        bmpLogger.info('Send bulk: templateParametersJson', {
          type: typeof templateParametersJson,
          isString: typeof templateParametersJson === 'string',
          first200: typeof templateParametersJson === 'string' ? templateParametersJson.substring(0, 200) : String(templateParametersJson).substring(0, 200),
        });
        const paramsResult = parseTemplateParametersJson(
          typeof templateParametersJson === 'string' ? templateParametersJson : undefined,
          templateRecord,
        );
        if (!paramsResult.ok) {
          return {
            success: false,
            error: paramsResult.error,
          };
        }

        const mergedSlots = mergeTemplateSlotMaps(paramsResult.slots, waTemplateSlots);
        bmpLogger.info('Send bulk: slots from templateParametersJson (after parse)', paramsResult.slots);
        bmpLogger.info('Send bulk: merged slots (UI + JSON; JSON wins on conflict)', mergedSlots);

        if (templateRecord.category === 'AUTHENTICATION') {
          const otpValue = (message ?? '').trim();
          if (!otpValue) {
            return {
              success: false,
              error: 'Message / OTP is required for AUTHENTICATION templates.',
            };
          }
          requestBody = buildBulkTemplateRequestBody({
            template: templateRecord,
            from: selectedAccount.accountNo,
            to: [contactCategory],
            platform: platformCode,
            slots: {},
            authenticationOtp: otpValue,
          });
          debugLog('Using AUTHENTICATION template format', {
            templateName: templateRecord.name,
            otpValue: '[REDACTED]',
          });
        } else {
          requestBody = buildBulkTemplateRequestBody({
            template: templateRecord,
            from: selectedAccount.accountNo,
            to: [contactCategory],
            platform: platformCode,
            slots: mergedSlots,
          });
          debugLog('Using BMP template bulk format', {
            templateName: templateRecord.name,
            category: templateRecord.category,
          });
        }
      } else {
        const text = (message ?? '').trim();
        if (!text) {
          return {
            success: false,
            error: 'Message is required for this message type.',
          };
        }
        requestBody = {
          from: selectedAccount.accountNo,
          to: [contactCategory],
          type: msgType,
          channel: 'CONTACT',
          platform: platformCode,
          text,
          tag2: 'Send bulk to contact category',
        };
      }

      bmpLogger.requestBodyFull(apiUrl, requestBody);
      bmpLogger.request({ method: 'POST', url: apiUrl, body: requestBody });
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: apiUrl,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token,
        },
        body: requestBody,
      });
      bmpLogger.response({ status: response.status, body: response.body });

      return {
        success: true,
        data: response.body,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      bmpLogger.error('Error in send_bulk_message', err.message);
      return {
        success: false,
        error: err.message || 'Failed to send bulk message',
      };
    }
  },
});
