/**
 * Mapping from our semantic prefill keys → exact Acrobat Sign web form field names.
 *
 * In Acrobat Sign, open the web form → each text field must have a **field name** and
 * **Default value may come from URL** checked. URL hash params must match those names exactly:
 * https://helpx.adobe.com/sign/adv-user/web-form/url-parameters.html
 *
 * Env: `ADOBE_IC_WIDGET_FIELD_MAP` — optional JSON override. Keys are semantic (below), values are Adobe names.
 *
 * Example:
 * {"contractorBusinessName":"IC_Business_Name","address":"IC_Address","cityStateZip":"IC_City_State_Zip","email":"IC_Email","contractorPrintedName":"IC_Printed_Name","effectiveDate":"IC_Effective_Date","floorPrintedName":"FIS_Printed_Name","floorTitle":"FIS_Title"}
 */
export type IcWidgetSemanticKey =
  | 'contractorBusinessName'
  | 'address'
  | 'cityStateZip'
  | 'email'
  | 'contractorTitle'
  | 'contractorPrintedName'
  | 'effectiveDate'
  | 'floorPrintedName'
  | 'floorTitle'

export type IcWidgetFieldMap = Partial<Record<IcWidgetSemanticKey, string>>

export const DEFAULT_IC_WIDGET_FIELD_MAP: IcWidgetFieldMap = {
  contractorBusinessName: 'Official Business Name of Independent Contractor ("Independent Contractor")',
  address: 'Address:',
  cityStateZip: 'City, State, Zip Code:',
  email: 'Email:',
  contractorPrintedName: 'Printed Name:',
  effectiveDate: 'Effective Date:',
}

export function parseIcWidgetFieldMap(raw: string | undefined): IcWidgetFieldMap | null {
  if (!raw?.trim()) return DEFAULT_IC_WIDGET_FIELD_MAP
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DEFAULT_IC_WIDGET_FIELD_MAP
    return { ...DEFAULT_IC_WIDGET_FIELD_MAP, ...(parsed as IcWidgetFieldMap) }
  } catch {
    return DEFAULT_IC_WIDGET_FIELD_MAP
  }
}

export const IC_WIDGET_SEMANTIC_KEYS: IcWidgetSemanticKey[] = [
  'contractorBusinessName',
  'address',
  'cityStateZip',
  'email',
  'contractorTitle',
  'contractorPrintedName',
  'effectiveDate',
  'floorPrintedName',
  'floorTitle',
]
