import { Platform, Share } from 'react-native';
import { buildDoseLogCsv, doseLogCsvFileName } from './doseLogCsv';
import { exportDoseLogCsv } from './exportDoseLogCsv';

jest.mock('./doseLogCsv', () => ({
  buildDoseLogCsv: jest.fn(),
  doseLogCsvFileName: jest.fn(),
}));

const mockBuildDoseLogCsv = jest.mocked(buildDoseLogCsv);
const mockDoseLogCsvFileName = jest.mocked(doseLogCsvFileName);

describe('exportDoseLogCsv', () => {
  const csv = 'Date,Medication\n2026-01-02,Test';
  const fileName = 'dose-log.csv';
  const originalPlatform = Platform.OS;
  const originalDocument = global.document;
  const originalBlob = global.Blob;
  const originalUrl = global.URL;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildDoseLogCsv.mockReturnValue(csv);
    mockDoseLogCsvFileName.mockReturnValue(fileName);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    Object.defineProperty(global, 'document', { configurable: true, value: originalDocument });
    Object.defineProperty(global, 'Blob', { configurable: true, value: originalBlob });
    Object.defineProperty(global, 'URL', { configurable: true, value: originalUrl });
  });

  it('downloads a UTF-8 CSV file and cleans up the temporary web resources', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const share = jest.spyOn(Share, 'share');

    const click = jest.fn();
    const link = { click, download: '', href: '' };
    const appendChild = jest.fn();
    const removeChild = jest.fn();
    const createElement = jest.fn(() => link);
    const blob = { csv: true };
    const BlobMock = jest.fn(() => blob);
    const createObjectURL = jest.fn(() => 'blob:dose-log');
    const revokeObjectURL = jest.fn();

    Object.defineProperty(global, 'document', {
      configurable: true,
      value: { body: { appendChild, removeChild }, createElement },
    });
    Object.defineProperty(global, 'Blob', { configurable: true, value: BlobMock });
    Object.defineProperty(global, 'URL', {
      configurable: true,
      value: { createObjectURL, revokeObjectURL },
    });

    const logs = [{ id: 'log-1' }] as never;
    await exportDoseLogCsv(logs);

    expect(mockBuildDoseLogCsv).toHaveBeenCalledWith(logs);
    expect(mockDoseLogCsvFileName).toHaveBeenCalledTimes(1);
    expect(BlobMock).toHaveBeenCalledWith(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8',
    });
    expect(createElement).toHaveBeenCalledWith('a');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(link).toMatchObject({ download: fileName, href: 'blob:dose-log' });
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledWith(link);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:dose-log');
    expect(share).not.toHaveBeenCalled();
  });

  it('opens the native share sheet with the generated file name and CSV', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    const logs = [{ id: 'log-2' }] as never;

    await exportDoseLogCsv(logs);

    expect(mockBuildDoseLogCsv).toHaveBeenCalledWith(logs);
    expect(mockDoseLogCsvFileName).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ title: fileName, message: csv });
  });
});
