import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Contact } from '@domain/contact';
import type { Interaction } from '@domain/interaction';
import type { Tag } from '@domain/tag';
import {
  buildContactExportRows,
  buildInteractionExportRows,
  CONTACT_EXPORT_COLUMNS,
  INTERACTION_EXPORT_COLUMNS,
} from '@domain/contactExport';

interface ExportSheetLabels {
  contactColumnLabels: string[];
  interactionColumnLabels: string[];
  contactsSheetName: string;
  interactionsSheetName: string;
  interactionTypeLabels: Record<Interaction['type'], string>;
  deletedContactLabel: string;
}

/**
 * RN 實作：用 SheetJS 產生 Excel 檔，寫入暫存檔後透過系統分享面板讓使用者存到「檔案」App
 * 或分享出去（見 iOS 開發計畫：手機上沒有瀏覽器下載這種動作，改成分享比較符合平台慣例）。
 * 對應 Web 版的 `XLSX.writeFile()` 直接觸發瀏覽器下載。
 */
export async function exportContactsToExcel(
  contacts: Contact[],
  interactions: Interaction[],
  tags: Tag[],
  labels: ExportSheetLabels
): Promise<void> {
  const contactRows = buildContactExportRows(contacts, tags);
  const interactionRows = buildInteractionExportRows(interactions, contacts, labels.deletedContactLabel);

  const contactSheet = XLSX.utils.aoa_to_sheet([
    labels.contactColumnLabels,
    ...contactRows.map((row) => CONTACT_EXPORT_COLUMNS.map((col) => row[col.key])),
  ]);

  const interactionSheet = XLSX.utils.aoa_to_sheet([
    labels.interactionColumnLabels,
    ...interactionRows.map((row) =>
      INTERACTION_EXPORT_COLUMNS.map((col) =>
        col.key === 'type' ? labels.interactionTypeLabels[row.type] : row[col.key]
      )
    ),
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, contactSheet, labels.contactsSheetName);
  XLSX.utils.book_append_sheet(workbook, interactionSheet, labels.interactionsSheetName);

  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const today = new Date().toISOString().slice(0, 10);
  const fileUri = `${FileSystem.cacheDirectory}linka-contacts-${today}.xlsx`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: labels.contactsSheetName,
    });
  }
}
