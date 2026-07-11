// 對照 spec.md §5.5 項目1「名片 OCR」。純 TypeScript：組 prompt 與解析 AI 回應，不依賴任何平台 API。

export interface BusinessCardFields {
  name: string;
  role?: string;
  company?: string;
  phone?: string;
  email?: string;
}

/** 名片在整張照片中的邊界框，正規化座標（0.0–1.0，相對於整張照片寬高）。 */
export interface CardBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BusinessCardScanResult {
  fields: BusinessCardFields;
  cardBoundingBox?: CardBoundingBox;
}

export const BUSINESS_CARD_EXTRACTION_PROMPT = `這是一張名片的照片，請從中辨識出以下欄位並以 JSON 物件回傳：
{
  "name": string, "role": string, "company": string, "phone": string, "email": string,
  "cardBoundingBox": {"x": number, "y": number, "width": number, "height": number}
}

規則：
- name 為必填，其餘文字欄位辨識不到就回傳空字串 ""
- 電話號碼保留原始格式（含國碼、分機等），不要自行改寫
- cardBoundingBox 是這張名片在整張照片裡的最小外框，x/y 是左上角座標、width/height 是寬高，
  四個數字都是相對於整張照片寬高的比例（0.0 到 1.0 之間，不是像素值）；如果照片裡看不出明顯的
  名片邊界（例如已經是裁切好的名片特寫），省略這個欄位，不要亂猜一個數字
- 只回傳 JSON 物件本身，不要加上任何說明文字`;

/** 解析 Cloud Function 回傳的原始資料，過濾掉空字串欄位並確保至少有姓名。 */
export function parseBusinessCardFields(raw: unknown): BusinessCardFields | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) return null;

  const clean = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  return {
    name,
    role: clean(data.role),
    company: clean(data.company),
    phone: clean(data.phone),
    email: clean(data.email),
  };
}

// 邊界框的寬高至少要佔整張照片的這個比例，太小代表偵測結果不可信（例如整張照片誤判成一個點），
// 這種情況直接當作沒有邊界框，退回使用完整未裁切的照片，不要裁出一張看不清楚的碎片。
const MIN_BOX_DIMENSION = 0.05;

/** 驗證 Gemini 回傳的邊界框是否合理；不合理（缺欄位、超出 0–1 範圍、太小）就回傳 undefined，
 *  呼叫端據此決定退回使用完整照片，不裁切（見 BusinessCardScanScreen.tsx）。 */
export function parseCardBoundingBox(raw: unknown): CardBoundingBox | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const data = raw as Record<string, unknown>;
  const { x, y, width, height } = data;
  if (![x, y, width, height].every((v) => typeof v === 'number' && Number.isFinite(v))) return undefined;

  const box = { x: x as number, y: y as number, width: width as number, height: height as number };
  const withinUnitRange = box.x >= 0 && box.y >= 0 && box.x + box.width <= 1.001 && box.y + box.height <= 1.001;
  const largeEnough = box.width >= MIN_BOX_DIMENSION && box.height >= MIN_BOX_DIMENSION;
  return withinUnitRange && largeEnough ? box : undefined;
}

/** 解析 Cloud Function 回傳的完整原始資料：文字欄位 + 可能的裁切框。 */
export function parseBusinessCardScanResult(raw: unknown): BusinessCardScanResult | null {
  const fields = parseBusinessCardFields(raw);
  if (!fields) return null;

  const data = raw as Record<string, unknown>;
  const cardBoundingBox = parseCardBoundingBox(data.cardBoundingBox);
  return { fields, cardBoundingBox };
}
