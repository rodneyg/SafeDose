import { useState, useEffect, useRef } from 'react';
import { Camera, CameraView, CameraType, CameraCapturedPicture } from 'expo-camera';

export function useCamera() {
  const [permission, setPermission] = useState<boolean | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [type, setType] = useState<CameraType>('back'); // Default to back camera
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      const existingPermissions = await Camera.getCameraPermissionsAsync();
      if (existingPermissions.granted) {
        setPermission(true);
      } else {
        // If not granted, request permissions
        const { status } = await Camera.requestCameraPermissionsAsync();
        setPermission(status === 'granted');
      }
    })();
  }, []);

  const takePicture = async (): Promise<CameraCapturedPicture | null> => {
    if (cameraRef.current && isCameraReady) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7, // Adjust quality as needed
          base64: true, // Include base64 if needed for OpenAI, etc.
          // You might want 'fast' for speed or keep default
          // exif: false, // Exif data often not needed and adds size
        });
        if (!photo) return null;
        console.log('Photo taken:', photo.uri);
        return photo;
      } catch (error) {
        console.error("Failed to take picture:", error);
        return null;
      }
    }
    console.log('Camera not ready or ref not set');
    return null;
  };

  const toggleCameraType = () => {
    setType(current => (current === 'back' ? 'front' : 'back'));
  };

  return {
    permission,
    requestPermissionAgain: async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermission(status === 'granted');
      return status === 'granted';
    },
    isCameraReady,
    setIsCameraReady, // Pass setter to Camera component's onCameraReady prop
    cameraRef,
    takePicture,
    type,
    toggleCameraType,
  };
}