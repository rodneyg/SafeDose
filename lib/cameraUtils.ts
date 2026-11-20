import { logAnalyticsEvent, ANALYTICS_EVENTS } from './analytics';
import { readScan, mapScanToDoseInputs, type ScanResult } from './scan';
import { completeScanOnServer, SCAN_UNAVAILABLE_MESSAGE } from './scan/completeOnServer';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { insulinVolumes, standardVolumes, MAX_FILE_SIZE, isWeb } from '../lib/utils';
import { CameraView } from 'expo-camera';

const PHOTO_ERROR_FALLBACK = 'We could not process this photo. Please try another photo or enter the details manually.';
const UNREADABLE_PHOTO_MESSAGE = 'We could not read the syringe size or vial strength safely. Try a clear photo showing the syringe scale and vial strength, or enter the details manually.';

// Only exact, authored messages may cross the capture/upload boundary into the UI.
const PHOTO_ERROR_MESSAGES = new Map<string, string>([
  ['No file selected or user cancelled', 'No image selected'],
  ['File selection cancelled after timeout', 'Image selection cancelled'],
  ['Selected image exceeds the 5 MB limit. Please choose a smaller image.', 'Selected image exceeds the 5 MB limit. Please choose a smaller image.'],
  ['Camera not ready', 'Camera not ready'],
  ['Camera permission required', 'Camera permission required'],
  ['Camera returned no picture', 'Camera returned no picture'],
  ['Failed to capture image data', 'Failed to capture image data'],
  ['Unrecognized image format', 'Image format could not be processed'],
  ['Could not reach the scan service. Please try again.', 'Could not reach the scan service. Please try again.'],
  ['Image analysis failed. Please try again.', 'Image analysis failed. Please try again.'],
  ['Invalid response from image analysis', 'Invalid response from image analysis'],
  ['API request timed out after 45 seconds', 'Image analysis took too long. Please try again.'],
  [UNREADABLE_PHOTO_MESSAGE, UNREADABLE_PHOTO_MESSAGE],
]);

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
  onScanUnavailable?: () => void;
  returnIncompleteScan?: boolean;
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
  onScanUnavailable,
  returnIncompleteScan,
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

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        let fileInputTimeout: ReturnType<typeof setTimeout> | undefined;

        const file = await new Promise<File>((resolve, reject) => {
          const cancel = () => reject(new Error('No file selected or user cancelled'));
          input.oncancel = cancel;
          input.onchange = (event) => {
            const selected = (event.target as HTMLInputElement).files?.[0];
            if (!selected) {
              cancel();
              return;
            }
            if (selected.size > MAX_FILE_SIZE) {
              reject(new Error(SCAN_UNAVAILABLE_MESSAGE));
              return;
            }
            resolve(selected);
          };
          input.onerror = () => reject(new Error('File input failed'));

          document.body.appendChild(input);
          // Fallback for browsers that do not report picker cancellation.
          fileInputTimeout = setTimeout(() => {
            reject(new Error('File selection cancelled after timeout'));
          }, 30000);
          input.click();
        }).finally(() => {
          if (fileInputTimeout !== undefined) clearTimeout(fileInputTimeout);
          if (document.body.contains(input)) document.body.removeChild(input);
        });
        setProcessingMessage('Reading image data...');

        const readerPromise = new Promise<{ base64Image: string; mimeType: string }>((resolve, reject) => {
          try {
            const reader = new FileReader();
            reader.onload = () => {
              console.log('[Capture] FileReader onload triggered');
              const result = reader.result;
              if (typeof result !== 'string' || !/^data:image\/[^;,]+;base64,.+$/s.test(result)) {
                console.error('[Capture] Invalid FileReader result');
                reject(new Error(SCAN_UNAVAILABLE_MESSAGE));
                return;
              }
              const base64Image = result.split(',')[1];
              const mimeType = file.type || 'image/jpeg';
              console.log('[Capture] Image converted to base64, length:', base64Image.length);
              resolve({ base64Image, mimeType });
            };

            reader.onerror = () => {
              console.error('[Capture] FileReader error');
              reject(new Error(SCAN_UNAVAILABLE_MESSAGE));
            };

            // Aborted reads otherwise leave the capture promise pending.
            reader.onabort = () => reject(new Error(SCAN_UNAVAILABLE_MESSAGE));

            console.log('[Capture] Starting FileReader readAsDataURL');
            reader.readAsDataURL(file);
          } catch {
            // Browser read errors use the same manual-entry path as service errors.
            reject(new Error(SCAN_UNAVAILABLE_MESSAGE));
          }
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
      if (!photo) throw new Error('Camera returned no picture');
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
      complete: () => completeScanOnServer(imageUrl),
    });
    const mapped = mapScanToDoseInputs(result);
    if (mapped.status === 'needs-input') {
      logAnalyticsEvent(ANALYTICS_EVENTS.SAFETY_REFUSAL, { stage: 'scan', reason: mapped.reasons.join(' ') });
      if (returnIncompleteScan) return result;
      throw new Error(UNREADABLE_PHOTO_MESSAGE);
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
    if (error instanceof Error && error.message === SCAN_UNAVAILABLE_MESSAGE) {
      setScanError(SCAN_UNAVAILABLE_MESSAGE);
      onScanUnavailable?.();
      return null;
    }
    const message = error instanceof Error
      ? PHOTO_ERROR_MESSAGES.get(error.message) ?? PHOTO_ERROR_FALLBACK
      : PHOTO_ERROR_FALLBACK;
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