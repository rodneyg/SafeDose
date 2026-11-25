import { Platform, Share } from 'react-native';
import { DoseLog } from '../types/doseLog';
import { buildDoseLogCsv, doseLogCsvFileName } from './doseLogCsv';

export async function exportDoseLogCsv(logs: DoseLog[]): Promise<void> {
  const csv = buildDoseLogCsv(logs);
  const fileName = doseLogCsvFileName();
  if (Platform.OS === 'web') {
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: fileName, message: csv });
}
