import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Camera } from 'expo-camera';
import { useCamera } from './useCamera';

jest.mock('expo-camera', () => ({
  Camera: {
    getCameraPermissionsAsync: jest.fn(),
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

const granted = { granted: true, status: 'granted', canAskAgain: true, expires: 'never' };
const denied = { ...granted, granted: false, status: 'denied' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Camera.getCameraPermissionsAsync).mockResolvedValue(granted);
  jest.mocked(Camera.requestCameraPermissionsAsync).mockResolvedValue(granted);
});

it('uses the current Expo permission API without asking again when already granted', async () => {
  const { result } = renderHook(() => useCamera());
  await waitFor(() => expect(result.current.permission).toBe(true));
  expect(Camera.getCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(Camera.requestCameraPermissionsAsync).not.toHaveBeenCalled();
});

it('requests permission and exposes denial when permission is not granted', async () => {
  jest.mocked(Camera.getCameraPermissionsAsync).mockResolvedValue(denied);
  jest.mocked(Camera.requestCameraPermissionsAsync).mockResolvedValue(denied);
  const { result } = renderHook(() => useCamera());
  await waitFor(() => expect(result.current.permission).toBe(false));
  expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);

  jest.mocked(Camera.requestCameraPermissionsAsync).mockResolvedValue(granted);
  await act(async () => {
    expect(await result.current.requestPermissionAgain()).toBe(true);
  });
  expect(result.current.permission).toBe(true);
});

it('switches between the current Expo facing values', async () => {
  const { result } = renderHook(() => useCamera());
  await waitFor(() => expect(result.current.permission).toBe(true));
  expect(result.current.type).toBe('back');
  act(() => result.current.toggleCameraType());
  expect(result.current.type).toBe('front');
  act(() => result.current.toggleCameraType());
  expect(result.current.type).toBe('back');
});
