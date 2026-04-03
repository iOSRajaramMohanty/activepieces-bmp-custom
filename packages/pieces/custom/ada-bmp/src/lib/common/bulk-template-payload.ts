const BULK_TAG2 = 'Send bulk to contact category';
const DEFAULT_TEMPLATE_LANG = 'en';
const DEFAULT_IMAGE_FILE_NAME = 'ada-logo.png';
const BRACE_OPEN_ESC = '{~{';
const BRACE_CLOSE_ESC = '}~}';

/**
 * Activepieces' props-resolver treats `{{…}}` as variable references.
 * Template bodies/headers contain `{{1}}`, `{{2}}`, etc., which the
 * resolver would mangle before they reach DynamicProperties or run().
 * We escape them before storing in the dropdown value and unescape
 * when reading back.
 */
export function escapeBmpBraces(s: string): string {
  return s.replace(/\{\{/g, BRACE_OPEN_ESC).replace(/\}\}/g, BRACE_CLOSE_ESC);
}

export function unescapeBmpBraces(s: string): string {
  return s.replace(/\{~\{/g, '{{').replace(/\}~\}/g, '}}');
}

export function extractPlaceholderIndices(str: string | undefined): number[] {
  if (!str || typeof str !== 'string') {
    return [];
  }
  const re = /\{\{(\d+)\}\}/g;
  const set: Record<string, boolean> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    set[m[1]] = true;
  }
  return Object.keys(set)
    .map(Number)
    .sort((a, b) => a - b);
}

function rawHeaderType(template: AdaBmpTemplateRecord): string {
  if (template.headerType === undefined || template.headerType === null) {
    return '';
  }
  return String(template.headerType);
}

function slotValue(slots: BulkTemplateSlotMap, key: string): string {
  const v = slots[key];
  if (v === undefined || v === null) {
    return '';
  }
  return String(v);
}

function buildTemplateDataOrdered(template: AdaBmpTemplateRecord, slots: BulkTemplateSlotMap): string[] {
  const out: string[] = [];
  const numsH = extractPlaceholderIndices(template.header);
  const numsB = extractPlaceholderIndices(template.body);
  const numsF = extractPlaceholderIndices(template.footer);
  for (const n of numsH) {
    out.push(slotValue(slots, `Header text:${n}`));
  }
  for (const n of numsB) {
    out.push(slotValue(slots, `Body:${n}`));
  }
  for (const n of numsF) {
    out.push(slotValue(slots, `Footer:${n}`));
  }
  return out;
}

function buildCarouselCardsForPayload(
  template: AdaBmpTemplateRecord,
  slots: BulkTemplateSlotMap,
): AdaBmpCarouselCardRow[] | null {
  const cards = template.carouselCards;
  if (!cards || !Array.isArray(cards)) {
    return null;
  }
  return cards.map((cardParts, ci): AdaBmpCarouselCardRow => {
    if (!Array.isArray(cardParts)) {
      return [];
    }
    return cardParts.map((part) => {
      if (part.type === 'header') {
        const mediaOverride = slotValue(slots, `Card ${ci + 1} media:fileName`);
        return {
          type: part.type,
          format: part.format ?? '',
          text: part.text,
          media_url: mediaOverride || part.media_url,
          parameters: part.parameters,
        };
      }
      if (part.type === 'body' && part.text) {
        const nums = extractPlaceholderIndices(part.text);
        const parameters = nums.map((n) => slotValue(slots, `Card ${ci + 1} body:${n}`));
        return {
          type: part.type,
          format: part.format ?? '',
          text: part.text,
          media_url: part.media_url,
          parameters,
        };
      }
      if (part.type === 'buttons' && Array.isArray(part.buttons)) {
        const overriddenButtons = part.buttons.map((b, bi) => {
          const bType = (b.type ?? '').toLowerCase();
          if (bType === 'phone_number') {
            const phone = slotValue(slots, `Card ${ci + 1} btn:${bi}:phone`);
            return { ...b, phone_number: phone || b.phone_number };
          }
          if (bType === 'quick_reply') {
            const qr = slotValue(slots, `Card ${ci + 1} btn:${bi}:qr`);
            const payload = slotValue(slots, `Card ${ci + 1} btn:${bi}:payload`);
            return {
              ...b,
              text: qr || b.text,
              parameters: payload ? [payload] : b.parameters,
            };
          }
          if (bType === 'url') {
            const url = slotValue(slots, `Card ${ci + 1} btn:${bi}:url`);
            return { ...b, url: url || b.url };
          }
          return b;
        });
        return {
          type: part.type,
          format: part.format ?? '',
          text: part.text,
          media_url: part.media_url,
          buttons: overriddenButtons,
          parameters: part.parameters,
        };
      }
      return {
        type: part.type,
        format: part.format ?? '',
        text: part.text,
        media_url: part.media_url,
        buttons: part.buttons,
        parameters: part.parameters,
      };
    });
  });
}

function applyHeaderFields(
  out: Record<string, unknown>,
  template: AdaBmpTemplateRecord,
  slots: BulkTemplateSlotMap,
): void {
  const headerTypeRaw = rawHeaderType(template);
  const ht = headerTypeRaw.toUpperCase();
  if (ht === 'IMAGE' || ht === 'VIDEO' || ht === 'DOCUMENT') {
    out.header = String(template.header ?? '').trim();
    const fn = slotValue(slots, 'headerMedia:fileName').trim();
    out.fileName = fn || DEFAULT_IMAGE_FILE_NAME;
    return;
  }
  if (String(template.headerType) === 'null' && (template.type === 'catalog' || template.type === '')) {
    out.header = String(template.header ?? '').trim();
    const fn = slotValue(slots, 'headerMedia:fileName').trim();
    if (fn) {
      out.fileName = fn;
    }
    return;
  }
  if (ht === 'TEXT' && template.header) {
    out.header = String(template.header).trim();
  }
}

function resolveHeaderTypeForPayload(template: AdaBmpTemplateRecord): string {
  const headerTypeRaw = rawHeaderType(template);
  if (template.type === 'catalog' && String(template.headerType) === 'null') {
    return 'null';
  }
  if (headerTypeRaw && String(headerTypeRaw).toLowerCase() !== 'null') {
    return String(headerTypeRaw).toUpperCase();
  }
  return 'TEXT';
}

export function buildBulkTemplateRequestBody(input: BuildBulkTemplateInput): Record<string, unknown> {
  const { template, from, to, platform, slots, authenticationOtp } = input;
  const templateLang = template.language?.trim() || DEFAULT_TEMPLATE_LANG;
  const baseEnvelope = {
    from,
    to,
    type: 'template' as const,
    channel: 'CONTACT' as const,
    platform,
    tag2: BULK_TAG2,
    templateId: template.id,
    templateLang,
    templateName: template.name,
  };

  const isMarketingOrUtility = template.category === 'MARKETING' || template.category === 'UTILITY';
  if (isMarketingOrUtility && template.isCallPermissionRequest === true) {
    return {
      ...baseEnvelope,
      buttons: [],
      headerType: 'TEXT',
      payload: null,
    };
  }

  if (template.category === 'AUTHENTICATION') {
    const otp = authenticationOtp ?? '';
    return {
      ...baseEnvelope,
      buttons: [null, null],
      templateData: [otp],
      templateButton: [[otp], []],
      headerType: 'TEXT',
      payload: ['', ''],
    };
  }

  if (template.type === 'carousel' && template.carouselCards) {
    const headerTypeRaw = rawHeaderType(template);
    const out: Record<string, unknown> = {
      ...baseEnvelope,
      templateData: buildTemplateDataOrdered(template, slots),
      templateCarouselCards: buildCarouselCardsForPayload(template, slots),
      buttons: null,
      templateButton: null,
      payload: null,
    };
    if (headerTypeRaw && String(headerTypeRaw).toLowerCase() !== 'null') {
      out.headerType = String(headerTypeRaw).toUpperCase();
    } else {
      out.headerType = 'TEXT';
    }
    const htc = headerTypeRaw.toUpperCase();
    if (htc === 'TEXT' && template.header) {
      out.header = String(template.header).trim();
    }
    return out;
  }

  const btnList = template.buttons;
  if (Array.isArray(btnList) && btnList.length > 0) {
    const nBtn = btnList.length;
    const buttonsArr: (null)[] = [];
    const tbArr: unknown[][] = [];
    const payloadArr: string[] = [];
    for (let i = 0; i < nBtn; i++) {
      buttonsArr.push(null);
      tbArr.push([]);
    }
    const templateData = buildTemplateDataOrdered(template, slots);
    for (let i = 0; i < nBtn; i++) {
      const btype = btnList[i]?.type;
      if (btype === 'QUICK_REPLY') {
        payloadArr.push(slotValue(slots, `payload:${i}`));
      } else {
        payloadArr.push('');
      }
    }
    const out: Record<string, unknown> = {
      ...baseEnvelope,
      buttons: buttonsArr,
      templateData,
      templateButton: tbArr,
      payload: payloadArr,
      headerType: resolveHeaderTypeForPayload(template),
    };
    applyHeaderFields(out, template, slots);
    return out;
  }

  const outF: Record<string, unknown> = {
    ...baseEnvelope,
    templateData: buildTemplateDataOrdered(template, slots),
    headerType: resolveHeaderTypeForPayload(template),
  };
  applyHeaderFields(outF, template, slots);
  return outF;
}

function showsHeaderMediaBrowse(ht: string | null | undefined): boolean {
  if (ht === undefined || ht === null) {
    return false;
  }
  const s = String(ht);
  if (s === 'null') {
    return true;
  }
  const u = s.toUpperCase();
  return u === 'IMAGE' || u === 'VIDEO' || u === 'DOCUMENT';
}

function pushHeaderBodyFooterSlots(
  template: AdaBmpTemplateRecord,
  out: Array<{ key: string; displayName: string; description?: string }>,
): void {
  for (const n of extractPlaceholderIndices(template.header)) {
    out.push({
      key: `Header text:${n}`,
      displayName: `Header · Param ${n}`,
      description: '{{' + String(n) + '}} in template header',
    });
  }
  for (const n of extractPlaceholderIndices(template.body)) {
    out.push({
      key: `Body:${n}`,
      displayName: `Body · Param ${n}`,
      description: '{{' + String(n) + '}} in template body',
    });
  }
  for (const n of extractPlaceholderIndices(template.footer)) {
    out.push({
      key: `Footer:${n}`,
      displayName: `Footer · Param ${n}`,
      description: '{{' + String(n) + '}} in template footer',
    });
  }
}

export function listWaTemplateSlotDescriptors(template: AdaBmpTemplateRecord): WaTemplateSlotDescriptor[] {
  const out: Array<{ key: string; displayName: string; description?: string }> = [];
  if (template.category === 'AUTHENTICATION') {
    return out;
  }
  const isCp =
    template.isCallPermissionRequest === true &&
    (template.category === 'MARKETING' || template.category === 'UTILITY');
  if (isCp) {
    return out;
  }

  if (template.type === 'carousel' && template.carouselCards) {
    pushHeaderBodyFooterSlots(template, out);
    const cards = template.carouselCards;
    for (let ci = 0; ci < cards.length; ci++) {
      const cardParts = cards[ci];
      if (!Array.isArray(cardParts)) {
        continue;
      }
      const bodyPart = cardParts.find((p) => p.type === 'body');
      if (bodyPart?.text) {
        for (const n of extractPlaceholderIndices(bodyPart.text)) {
          out.push({
            key: `Card ${ci + 1} body:${n}`,
            displayName: `Carousel card ${ci + 1} · Param ${n}`,
            description: 'Per-card body variable',
          });
        }
      }
    }
    if (showsHeaderMediaBrowse(template.headerType)) {
      out.push({
        key: 'headerMedia:fileName',
        displayName: 'Header media file name',
        description: 'Shown when template uses IMAGE / VIDEO / DOCUMENT header (or optional catalog header)',
      });
    }
    return out;
  }

  const btnList = template.buttons;
  if (Array.isArray(btnList) && btnList.length > 0) {
    pushHeaderBodyFooterSlots(template, out);
    if (showsHeaderMediaBrowse(template.headerType)) {
      out.push({
        key: 'headerMedia:fileName',
        displayName: 'Header media file name',
        description: 'e.g. ada-logo.png when replacing header media',
      });
    }
    btnList.forEach((b, i) => {
      if (b.type === 'QUICK_REPLY') {
        out.push({
          key: `payload:${i}`,
          displayName: `Quick reply payload (${i + 1})`,
          description: b.text ? `Button: ${b.text}` : 'Quick reply payload',
        });
      }
    });
    return out;
  }

  pushHeaderBodyFooterSlots(template, out);
  if (showsHeaderMediaBrowse(template.headerType)) {
    out.push({
      key: 'headerMedia:fileName',
      displayName: 'Header media file name',
      description: 'e.g. ada-logo.png when replacing header media',
    });
  }
  return out;
}

function isBmpApiPayload(parsed: object): boolean {
  const templateName = Reflect.get(parsed, 'templateName');
  const templateData = Reflect.get(parsed, 'templateData');
  const templateCarouselCards = Reflect.get(parsed, 'templateCarouselCards');
  return (
    typeof templateName === 'string' ||
    Array.isArray(templateData) ||
    Array.isArray(templateCarouselCards)
  );
}

function extractBmpCarouselSlots(
  carouselCards: unknown[],
  slots: BulkTemplateSlotMap,
): void {
  for (let ci = 0; ci < carouselCards.length; ci++) {
    const card = carouselCards[ci];
    if (!Array.isArray(card)) continue;

    for (const rawPart of card) {
      if (rawPart === null || typeof rawPart !== 'object' || Array.isArray(rawPart)) continue;
      const partType = Reflect.get(rawPart, 'type');
      if (typeof partType !== 'string') continue;

      if (partType === 'header') {
        const mediaUrl = Reflect.get(rawPart, 'media_url');
        if (typeof mediaUrl === 'string' && mediaUrl) {
          slots[`Card ${ci + 1} media:fileName`] = mediaUrl;
        }
      }

      if (partType === 'body') {
        const params = Reflect.get(rawPart, 'parameters');
        const paramsArr: unknown[] = Array.isArray(params) ? params : [];
        for (let pi = 0; pi < paramsArr.length; pi++) {
          slots[`Card ${ci + 1} body:${pi + 1}`] = String(paramsArr[pi] ?? '');
        }
      }

      if (partType === 'buttons') {
        const buttons = Reflect.get(rawPart, 'buttons');
        if (!Array.isArray(buttons)) continue;
        for (let bi = 0; bi < buttons.length; bi++) {
          const rawBtn = buttons[bi];
          if (rawBtn === null || typeof rawBtn !== 'object' || Array.isArray(rawBtn)) continue;
          const bType = Reflect.get(rawBtn, 'type');
          if (typeof bType !== 'string') continue;
          const bTypeLower = bType.toLowerCase();
          if (bTypeLower === 'phone_number') {
            const phone = Reflect.get(rawBtn, 'phone_number');
            slots[`Card ${ci + 1} btn:${bi}:phone`] = typeof phone === 'string' ? phone : '';
          } else if (bTypeLower === 'quick_reply') {
            const text = Reflect.get(rawBtn, 'text');
            slots[`Card ${ci + 1} btn:${bi}:qr`] = typeof text === 'string' ? text : '';
            const pl = Reflect.get(rawBtn, 'payload');
            if (typeof pl === 'string') {
              slots[`Card ${ci + 1} btn:${bi}:payload`] = pl;
            }
          } else if (bTypeLower === 'url') {
            const url = Reflect.get(rawBtn, 'url');
            slots[`Card ${ci + 1} btn:${bi}:url`] = typeof url === 'string' ? url : '';
          }
        }
      }
    }
  }
}

function convertBmpPayloadToSlotMap(
  payload: object,
  template: AdaBmpTemplateRecord,
): BulkTemplateSlotMap {
  const slots: BulkTemplateSlotMap = {};

  const templateData = Reflect.get(payload, 'templateData');
  const tdArray: unknown[] = Array.isArray(templateData) ? templateData : [];

  const headerNums = extractPlaceholderIndices(template.header);
  const bodyNums = extractPlaceholderIndices(template.body);
  const footerNums = extractPlaceholderIndices(template.footer);

  let idx = 0;
  for (const n of headerNums) {
    if (idx < tdArray.length) {
      slots[`Header text:${n}`] = String(tdArray[idx] ?? '');
    }
    idx++;
  }
  for (const n of bodyNums) {
    if (idx < tdArray.length) {
      slots[`Body:${n}`] = String(tdArray[idx] ?? '');
    }
    idx++;
  }
  for (const n of footerNums) {
    if (idx < tdArray.length) {
      slots[`Footer:${n}`] = String(tdArray[idx] ?? '');
    }
    idx++;
  }

  const carouselCards = Reflect.get(payload, 'templateCarouselCards');
  if (Array.isArray(carouselCards)) {
    extractBmpCarouselSlots(carouselCards, slots);
  }

  const payloadArr = Reflect.get(payload, 'payload');
  if (Array.isArray(payloadArr) && Array.isArray(template.buttons)) {
    template.buttons.forEach((b, i) => {
      if (b.type === 'QUICK_REPLY' && i < payloadArr.length) {
        slots[`payload:${i}`] = String(payloadArr[i] ?? '');
      }
    });
  }

  const fileName = Reflect.get(payload, 'fileName');
  if (typeof fileName === 'string' && fileName) {
    slots['headerMedia:fileName'] = fileName;
  }

  return slots;
}

export function parseTemplateParametersJson(
  raw: string | undefined,
  template?: AdaBmpTemplateRecord,
): { ok: true; slots: BulkTemplateSlotMap } | { ok: false; error: string } {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: true, slots: {} };
  }
  try {
    const rawStr = String(raw);
    const parsed = robustJsonParse(rawStr);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Template parameters must be a JSON object.' };
    }

    if (template && isBmpApiPayload(parsed)) {
      return { ok: true, slots: convertBmpPayloadToSlotMap(parsed, template) };
    }

    const slots: BulkTemplateSlotMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === undefined || v === null) {
        slots[k] = '';
      } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        slots[k] = String(v);
      } else {
        return { ok: false, error: `Template parameters: value for "${k}" must be a string, number, or boolean.` };
      }
    }
    return { ok: true, slots };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ADA-BMP] parseTemplateParametersJson error:', msg);
    return { ok: false, error: `Template parameters JSON is invalid: ${msg}` };
  }
}

function robustJsonParse(s: string): unknown {
  const attempts: Array<() => unknown> = [
    () => JSON.parse(s),
    () => JSON.parse(s.replace(/\\"/g, '"')),
    () => JSON.parse(s.replace(/\\\\"/g, '"')),
  ];
  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      let result = attempt();
      if (typeof result === 'string') {
        result = robustJsonParse(result);
      }
      return result;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export type WaTemplateSlotDescriptor = {
  key: string;
  displayName: string;
  description?: string;
};

export type BulkTemplateSlotMap = Record<string, string>;

export type AdaBmpTemplateButton = {
  type?: string;
  text?: string;
  url?: string;
  phoneNumber?: string;
  flow_id?: number | null;
};

export type AdaBmpCardButton = {
  type?: string;
  text?: string;
  url?: string | null;
  phone_number?: string | null;
  parameters?: string[] | null;
};

export type AdaBmpCarouselCardPart = {
  type: string;
  format?: string;
  text?: string | null;
  media_url?: string | null;
  buttons?: AdaBmpCardButton[] | null;
  parameters?: string[] | null;
};

export type AdaBmpCarouselCardRow = AdaBmpCarouselCardPart[];

export type AdaBmpTemplateRecord = {
  id: string;
  name: string;
  category: string;
  type?: string;
  body?: string;
  header?: string;
  footer?: string;
  headerType?: string | null;
  language?: string;
  isCallPermissionRequest?: boolean;
  bodyParameters?: string[] | null;
  buttons?: AdaBmpTemplateButton[] | null;
  carouselCards?: AdaBmpCarouselCardRow[] | null;
};

export type BuildBulkTemplateInput = {
  template: AdaBmpTemplateRecord;
  from: string;
  to: string[];
  platform: string;
  slots: BulkTemplateSlotMap;
  authenticationOtp?: string;
};
