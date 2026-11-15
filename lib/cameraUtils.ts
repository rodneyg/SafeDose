import { logAnalyticsEvent, ANALYTICS_EVENTS } from './analytics';
import { readScan, mapScanToDoseInputs, type ScanResult } from './scan';
import { completeScanOnServer } from './scan/completeOnServer';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { insulinVolumes, standardVolumes, MAX_FILE_SIZE, isWeb } from '../lib/utils';
import { CameraView } from 'expo-camera';

interface CameraRef {
  takePictureAsync: (options: { base64: boolean; quality: number }) => Promise<{ base64?: string; uri?: string } | undefined>;
}

interface CaptureAndProcessImageProps {
  cameraRef: React.RefObject<CameraRef>;
  permission: { status: string } | null;
  isMobileWeb: boolean;
  setIsProcessing: (value: boolean) => void;
  setProcessingMessage: (message: string) => void;
  setScanError: (error: string | null) => void;
  incrementScansUsed: () => Promise<void>;
  webCameraStream?: MediaStream | null;
}

export async function captureAndProcessImage({
  cameraRef,
  permission,
  isMobileWeb,
  setIsProcessing,
  setProcessingMessage,
  setScanError,
  incrementScansUsed,
  webCameraStream,
}: CaptureAndProcessImageProps): Promise<ScanResult | null> {
  console.log('[Capture] Button pressed - Start');

  // OpenAI keys stay on the server. The client only posts the image to /api/analyze-scan.
  // Set the processing state at the beginning
  console.log('[Capture] Setting isProcessing to true');
  setIsProcessing(true);
  setScanError(null);
  setProcessingMessage('Waiting for photo selection...');

  try {
    let base64Image: string | undefined;
    let mimeType: string = '';

    if (isWeb) {
      // For any web platform (mobile or desktop), use web camera stream if available, otherwise file input
      // First check if we have an active web camera stream
      if (webCameraStream && webCameraStream.active) {
        console.log('[Capture] Using active web camera stream');
        setProcessingMessage('Taking photo...');
        
        try {
          const { base64Image: capturedImage, mimeType: capturedMimeType } = await captureImageFromStream(webCameraStream);
          base64Image = capturedImage;
          mimeType = capturedMimeType;
          console.log('[Capture] Captured image from web camera stream');
        } catch (streamError) {
          console.error('[Capture] Error capturing from stream:', streamError);
          // Fall back to file input if stream capture fails
          console.log('[Capture] Falling back to file input');
        }
      }
      
      // If we don't have a stream or stream capture failed, use file input
      if (!base64Image) {
        console.log('[Capture] Web platform detected, using file input');

        // Clean up any existing file inputs first
        const existingInputs = document.querySelectorAll('input[type="file"]');
        existingInputs.forEach(input => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        });
        console.log('[Capture] Cleared existing file inputs');

        const filePromise = new Promise<{ file: File }>((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          let fileInputTimeoutId: any = null;

          input.onchange = (event) => {
            console.log('[Capture] File input change event');
            // Clear timeout since we got a response
            if (fileInputTimeoutId) {
              clearTimeout(fileInputTimeoutId);
              fileInputTimeoutId = null;
            }
            
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) {
              console.log('[Capture] No file selected');
              if (document.body.contains(input)) {
                document.body.removeChild(input);
              }
              reject(new Error('No file selected or user cancelled'));
              return;
            }
            console.log('[Capture] File selected:', file.name, 'Size:', file.size);
            if (file.size > MAX_FILE_SIZE) {
              if (document.body.contains(input)) {
                document.body.removeChild(input);
              }
              reject(new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds 5 MB limit`));
              return;
            }
            resolve({ file });
            if (document.body.contains(input)) {
              document.body.removeChild(input);
              console.log('[Capture] File input removed after selection');
            }
          };

          input.onerror = (error) => {
            console.error('[Capture] File input error:', error);
            if (fileInputTimeoutId) {
              clearTimeout(fileInputTimeoutId);
              fileInputTimeoutId = null;
            }
            if (document.body.contains(input)) {
              document.body.removeChild(input);
              console.log('[Capture] File input removed on error');
            }
            reject(new Error('File input failed'));
          };

          document.body.appendChild(input);
          console.log('[Capture] Triggering file input click');
          input.click();

          // Set a timeout to clean up if the user doesn't select a file
          fileInputTimeoutId = setTimeout(() => {
            if (document.body.contains(input)) {
              document.body.removeChild(input);
              console.log('[Capture] File input cancelled due to timeout');
              reject(new Error('File selection cancelled after timeout'));
            }
          }, 30000); // 30 seconds timeout
        });

        const { file } = await filePromise;
        setProcessingMessage('Reading image data...');

        const reader = new FileReader();
        const readerPromise = new Promise<{ base64Image: string; mimeType: string }>((resolve, reject) => {
          reader.onload = () => {
            console.log('[Capture] FileReader onload triggered');
            const result = reader.result;
            if (typeof result !== 'string' || !result.includes(',')) {
              console.error('[Capture] Invalid FileReader result');
              reject(new Error('Failed to read image data'));
              return;
            }
            const base64Image = result.split(',')[1];
            const mimeType = file.type || 'image/jpeg';
            console.log('[Capture] Image converted to base64, length:', base64Image.length);
            resolve({ base64Image, mimeType });
          };

          reader.onerror = () => {
            console.error('[Capture] FileReader error');
            reject(new Error('Failed to read image'));
          };

          console.log('[Capture] Starting FileReader readAsDataURL');
          reader.readAsDataURL(file);
        });

        const result = await readerPromise;
        base64Image = result.base64Image;
        mimeType = result.mimeType;
      }
    } else {
      if (!cameraRef.current) {
        console.log('[Capture] Camera ref is null or undefined');
        throw new Error('Camera not ready');
      }

      if (permission?.status !== 'granted') {
        console.log('[Capture] Camera permission not granted:', permission?.status);
        throw new Error('Camera permission required');
      }

      console.log('[Capture] Starting capture with expo-camera');
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });
      console.log('[Capture] Picture taken successfully');

      base64Image = photo.base64;
      if (!base64Image && photo.uri) {
        console.log('[Capture] Base64 missing, reading from URI:', photo.uri);
        setProcessingMessage('Reading image data...');
        base64Image = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('[Capture] Base64 read from URI. Length:', base64Image.length);
      }

      if (!base64Image) {
        console.error('[Capture] No base64 data available');
        throw new Error('Failed to capture image data');
      }

      mimeType = '';
      if (base64Image.startsWith('data:image/')) {
        const prefixMatch = base64Image.match(/^data:image\/([a-z]+);base64,/);
        if (prefixMatch) {
          mimeType = `image/${prefixMatch[1]}`;
          base64Image = base64Image.substring(prefixMatch[0].length);
          console.log(`[Capture] Stripped prefix. MIME type: ${mimeType}`);
        }
      }

      if (!mimeType) {
        if (base64Image.startsWith('/9j/')) mimeType = 'image/jpeg';
        else if (base64Image.startsWith('iVBORw0KGgo=')) mimeType = 'image/png';
        else if (base64Image.startsWith('UklGR')) mimeType = 'image/webp';
        else if (base64Image.startsWith('R0lGODlh')) mimeType = 'image/gif';
        else {
          console.error('[Capture] Unknown image format:', base64Image.substring(0, 20));
          throw new Error('Unrecognized image format');
        }
        console.log('[Capture] Detected MIME type:', mimeType);
      }

      if (base64Image.length % 4 !== 0) {
        const paddingNeeded = (4 - (base64Image.length % 4)) % 4;
        base64Image += "=".repeat(paddingNeeded);
        console.log('[Capture] Padded base64 length:', base64Image.length);
      }
    }

    setProcessingMessage('Analyzing image with AI...');
    console.log('[Process] Starting image processing');

    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    console.log('[Process] Constructed Image URL (first 150 chars):', imageUrl.substring(0, 150));
    console.log('[Process] Sending image to /api/analyze-scan');

    const result = await readScan(imageUrl, {
      complete: async () => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            completeScanOnServer(imageUrl),
            new Promise<string>((_, reject) => {
              timeout = setTimeout(() => reject(new Error('API request timed out after 45 seconds')), 45000);
            }),
          ]);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      },
    });
    const mapped = mapScanToDoseInputs(result);
    if (mapped.status === 'needs-input') {
      logAnalyticsEvent(ANALYTICS_EVENTS.SAFETY_REFUSAL, { stage: 'scan', reason: mapped.reasons.join(' ') });
      throw new Error(`I couldn't read the syringe size / vial strength safely. Retake or enter it manually. Keep the syringe scale and vial strength in focus, avoid glare, and include all units. ${mapped.reasons.join(' ')}`);
    }

    await incrementScansUsed();
    console.log('[Process] Incremented scans used');

    // Add the captured image data to the result for preview
    if (base64Image && mimeType) {
      result.capturedImage = {
        uri: `data:${mimeType};base64,${base64Image}`,
        mimeType
      };
      console.log('[Process] Added captured image data to result');
    }

    return result;
  } catch (error) {
    console.error('[Process] Error processing image:', error);
    let message = 'An unexpected error occurred during scanning';
    if (error instanceof Error) {
      if (error.message.includes('format is not recognized')) {
        message = 'Image format could not be processed';
      } else if (error.message.includes('No file selected')) {
        message = 'No image selected';
      } else if (error.message.includes('File size')) {
        message = error.message;
      } else if (error.message.includes('cancelled')) {
        message = 'Image selection cancelled';
      } else {
        message = `Error: ${error.message}`;
      }
    }
    setScanError(message);
    return null;
  } finally {
    // Always ensure isProcessing is reset to prevent stuck states
    setIsProcessing(false);
    console.log('[Capture] isProcessing set to false');
  }
}

// Helper function to capture an image from a web camera stream
async function captureImageFromStream(stream: MediaStream): Promise<{ base64Image: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    try {
      // Create a video element to display the stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true'); // Required for iOS Safari
      
      // Wait for the video to be ready
      video.onloadedmetadata = () => {
        // Start playing the video
        video.play().then(() => {
          // Create a canvas to draw the video frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw the current video frame to the canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert the canvas to a base64 image
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const base64Data = dataUrl.split(',')[1];
            
            // Stop video display
            video.pause();
            video.srcObject = null;
            
            resolve({
              base64Image: base64Data,
              mimeType: 'image/jpeg'
            });
          } catch (error) {
            console.error('Error converting canvas to image:', error);
            reject(error);
          }
        }).catch(error => {
          console.error('Error playing video:', error);
          reject(error);
        });
      };
      
      video.onerror = (error) => {
        console.error('Video element error:', error);
        reject(error);
      };
      
    } catch (error) {
      console.error('Error setting up video capture:', error);
      reject(error);
    }
  });
}