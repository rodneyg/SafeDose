import { useState, useEffect, useRef } from 'react';
import { Camera } from 'expo-camera';

export function useCamera() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      console.log('Requesting camera permissions...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      setHasPermission(status === 'granted');
    })();
  }, []);

  return { hasPermission, cameraRef };
}