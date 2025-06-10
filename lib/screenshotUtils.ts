import { Platform } from 'react-native';
import { isWeb } from './utils';

// Screenshot functionality for web platforms
const captureWebScreenshot = async (elementId: string): Promise<void> => {
  if (!isWeb) return;
  
  try {
    // Dynamically import html2canvas only when needed (web only)
    const html2canvas = await import('html2canvas');
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Screenshot element not found');
    }

    const canvas = await html2canvas.default(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Create download link
    const link = document.createElement('a');
    link.download = `SafeDose_Results_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error capturing web screenshot:', error);
    throw new Error('Failed to capture screenshot');
  }
};

// Screenshot functionality for React Native platforms
const captureNativeScreenshot = async (viewRef: any): Promise<void> => {
  if (isWeb) return;
  
  try {
    // Dynamically import react-native-view-shot only when needed (native only)
    const ViewShot = await import('react-native-view-shot');
    
    if (!viewRef || !viewRef.current) {
      throw new Error('View reference not found');
    }

    const uri = await ViewShot.captureRef(viewRef, {
      format: 'png',
      quality: 0.9,
      result: 'data-uri',
    });

    // For React Native, we'd typically need to handle saving differently
    // This is a simplified implementation - in a real app you'd want to:
    // 1. Save to device's photo library (requires permissions)
    // 2. Share via share sheet
    // 3. Or save to app's documents directory
    
    console.log('Screenshot captured:', uri);
    // You would implement platform-specific saving logic here
    
  } catch (error) {
    console.error('Error capturing native screenshot:', error);
    throw new Error('Failed to capture screenshot');
  }
};

// Main screenshot function that handles both platforms
export const captureResultsScreenshot = async (elementIdOrRef: string | any): Promise<void> => {
  try {
    if (isWeb) {
      await captureWebScreenshot(elementIdOrRef);
    } else {
      await captureNativeScreenshot(elementIdOrRef);
    }
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    // Re-throw the original error for better debugging
    throw error;
  }
};

// Helper function to generate screenshot filename
export const getScreenshotFilename = (): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `SafeDose_Results_${timestamp}.png`;
};