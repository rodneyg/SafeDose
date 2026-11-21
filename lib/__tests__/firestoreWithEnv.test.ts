import {
  addDoc,
  setDoc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { isPreviewEnvironment } from '../environment';
import { addDocWithEnv, setDocWithEnv } from '../firestoreWithEnv';

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('../environment', () => ({
  isPreviewEnvironment: jest.fn(),
}));

const mockAddDoc = jest.mocked(addDoc);
const mockSetDoc = jest.mocked(setDoc);
const mockIsPreviewEnvironment = jest.mocked(isPreviewEnvironment);
const collectionRef = { id: 'entries' } as CollectionReference;
const documentRef = { id: 'entry' } as DocumentReference;

beforeEach(() => {
  jest.resetAllMocks();
  mockIsPreviewEnvironment.mockReturnValue(false);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('addDocWithEnv', () => {
  it('passes through the payload and returns the Firestore reference outside preview', async () => {
    const data = { label: 'entry' };
    mockAddDoc.mockResolvedValue(documentRef);

    await expect(addDocWithEnv(collectionRef, data)).resolves.toBe(documentRef);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc).toHaveBeenCalledWith(collectionRef, { label: 'entry' });
    expect(mockAddDoc.mock.calls[0][1]).toBe(data);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('tags a copy of the payload in preview', async () => {
    const data = Object.freeze({ label: 'entry', env: 'original' });
    mockIsPreviewEnvironment.mockReturnValue(true);
    mockAddDoc.mockResolvedValue(documentRef);

    await expect(addDocWithEnv(collectionRef, data)).resolves.toBe(documentRef);

    expect(mockAddDoc).toHaveBeenCalledWith(collectionRef, { label: 'entry', env: 'preview' });
  });

  it('propagates a Firestore rejection', async () => {
    const error = new Error('Write failed');
    mockAddDoc.mockRejectedValue(error);

    await expect(addDocWithEnv(collectionRef, { label: 'entry' })).rejects.toBe(error);
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });
});

describe('setDocWithEnv', () => {
  it('passes through the payload and omits the options argument outside preview', async () => {
    const data = { label: 'entry' };
    mockSetDoc.mockResolvedValue(undefined);

    await expect(setDocWithEnv(documentRef, data)).resolves.toBeUndefined();

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledWith(documentRef, { label: 'entry' });
    expect(mockSetDoc.mock.calls[0][1]).toBe(data);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('preserves caller-supplied options outside preview', async () => {
    const data = { label: 'entry', env: 'original' };
    const options = { merge: false };
    mockSetDoc.mockResolvedValue(undefined);

    await setDocWithEnv(documentRef, data, options);

    expect(mockSetDoc).toHaveBeenCalledWith(documentRef, data, options);
    expect(mockSetDoc.mock.calls[0][1]).toBe(data);
    expect(mockSetDoc.mock.calls[0][2]).toBe(options);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('tags a copy of the payload for a preview write with merge disabled', async () => {
    const data = Object.freeze({ label: 'entry', env: 'original' });
    const options = { merge: false };
    mockIsPreviewEnvironment.mockReturnValue(true);
    mockSetDoc.mockResolvedValue(undefined);

    await setDocWithEnv(documentRef, data, options);

    expect(mockSetDoc).toHaveBeenCalledWith(documentRef, { label: 'entry', env: 'preview' }, options);
    expect(mockSetDoc.mock.calls[0][2]).toBe(options);
  });

  it('propagates a Firestore rejection', async () => {
    const error = new Error('Write failed');
    mockSetDoc.mockRejectedValue(error);

    await expect(setDocWithEnv(documentRef, { label: 'entry' })).rejects.toBe(error);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });
});
