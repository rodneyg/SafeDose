import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { insulinVolumes, standardVolumes, MAX_FILE_SIZE, isWeb } from '../lib/utils';
import { CameraView } from 'expo-camera';
import { captureException, addBreadcrumb } from './sentry';

interface CameraRef {
  takePictureAsync: (options: { base64: boolean; quality: number }) => Promise<{ base64?: string; uri?: string } | undefined>;
}

interface CaptureAndProcessImageProps {
  cameraRef: React.RefObject<CameraRef>;
  permission: { status: string } | null;
  openai: any;
  isMobileWeb: boolean;
  setIsProcessing: (value: boolean) => void;
  setProcessingMessage: (message: string) => void;
  setScanError: (error: string | null) => void;
  incrementScansUsed: () => Promise<void>;
  webCameraStream?: MediaStream | null;
}

interface ScanResult {
  syringe: {
    type: 'Insulin' | 'Standard' | 'unreadable' | null;
    volume: string | 'unreadable' | null;
    markings: string | 'unreadable' | null;
  };
  vial: {
    substance: string | 'unreadable' | null;
    totalAmount: string | 'unreadable' | null;
    concentration: string | 'unreadable' | null;
    expiration: string | 'unreadable' | null;
  };
  capturedImage?: {
    uri: string;
    mimeType: string;
  };
}

export async function captureAndProcessImage({
  cameraRef,
  permission,
  openai,
  isMobileWeb,
  setIsProcessing,
  setProcessingMessage,
  setScanError,
  incrementScansUsed,
  webCameraStream,
}: CaptureAndProcessImageProps): Promise<ScanResult | null> {
  console.log('[Capture] Button pressed - Start');

  // Add Sentry breadcrumb for scan attempt
  addBreadcrumb({
    message: 'Scan attempt initiated',
    category: 'scan',
    level: 'info',
    data: {
      platform: isWeb ? 'web' : 'native',
      isMobileWeb,
      hasWebCameraStream: !!webCameraStream
    }
  });

  const apiKey = (Constants as any).expoConfig?.extra?.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Capture] OpenAI API key missing');
    
    // Capture configuration error with Sentry
    captureException(new Error('OpenAI API key missing'), {
      context: 'scan_config_error',
      error_type: 'configuration_error'
    });
    
    Alert.alert('Config Error', 'OpenAI Key missing. Please check your configuration.');
    setScanError('OpenAI configuration error');
    setIsProcessing(false); // Ensure isProcessing is reset on this error path
    return null;
  }

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
    console.log('[Process] Sending request to OpenAI');

    // Add timeout protection for the OpenAI API call
    let responsePromise = openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze the image for syringe and vial details. Provide ONLY a valid JSON object with the following structure: { "syringe": { "type": "Insulin | Standard | unreadable | null", "volume": "e.g., \'1 ml\', \'0.5 ml\', \'unreadable\', null", "markings": "e.g., \'0.1,0.2,...\', \'unreadable\', null" }, "vial": { "substance": "name | unreadable | null", "totalAmount": "e.g., \'20 mg\', \'1000 units\', \'unreadable\', null", "concentration": "e.g., \'100 units/ml\', \'10 mg/ml\', \'unreadable\', null", "expiration": "YYYY-MM-DD | unreadable | null" } }. Use "unreadable" if text is present but illegible. Use null if the information is completely absent or not visible. Do not include any explanatory text before or after the JSON.',
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    });

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API request timed out after 45 seconds')), 45000);
    });

    // Race the API promise against the timeout
    const response = await Promise.race([responsePromise, timeoutPromise])
                      .catch(error => {
                        console.error('[Process] API call failed:', error);
                        throw new Error(`API error: ${error.message || 'Network issue'}`);
                      }) as any;

    console.log('[Process] Received response from OpenAI:', JSON.stringify(response || {}, null, 2));

    // Validate the response
    if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
      console.error('[Process] Invalid or empty response from OpenAI');
      throw new Error('Invalid response from image analysis');
    }

    const content = response.choices[0].message.content;
    console.log('[Process] Raw OpenAI response content:', content);

    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }

    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonContent = jsonMatch ? jsonMatch[1].trim() : content.trim();
    console.log('[Process] Extracted JSON content:', jsonContent);

    let result: ScanResult;
    try {
      result = JSON.parse(jsonContent);
      console.log('[Process] Parsed JSON result:', JSON.stringify(result, null, 2));
      if (typeof result !== 'object' || result === null || !('syringe' in result) || !('vial' in result)) {
        console.error('[Process] Invalid JSON structure:', result);
        throw new Error('Invalid JSON structure received from analysis');
      }
    } catch (parseError) {
      console.error('[Process] JSON parse error:', parseError);
      throw new Error('Could not parse analysis result');
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

    // Add Sentry breadcrumb for successful scan
    addBreadcrumb({
      message: 'Scan completed successfully',
      category: 'scan',
      level: 'info',
      data: {
        platform: isWeb ? 'web' : 'native',
        syringe_type: result.syringe?.type,
        substance_detected: result.vial?.substance ? 'yes' : 'no',
        concentration_detected: result.vial?.concentration ? 'yes' : 'no'
      }
    });

    return result;
  } catch (error) {
    console.error('[Process] Error processing image:', error);
    
    // Capture scan/image analysis failure with Sentry
    captureException(error, {
      context: 'scan_image_analysis_failure',
      error_type: 'scan_processing_error',
      platform: isWeb ? 'web' : 'native',
      isMobileWeb,
      hasWebCameraStream: !!webCameraStream
    });
    
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