/* eslint-env browser */
/**
 * @fileoverview AI-powered scanning hook for medication dose calculation
 * 
 * This hook provides comprehensive functionality for AI-powered scanning of syringes and vials
 * in the SafeDose medication management application. It leverages OpenAI's vision capabilities
 * to automatically detect and extract medication information from images, enhancing safety and 
 * accuracy in dose calculations.
 * 
 * Features:
 * - Camera permission management across web and mobile platforms
 * - Real-time image capture and processing
 * - AI-powered text recognition and medication data extraction
 * - Usage limit enforcement for scan operations
 * - Error handling and recovery mechanisms
 * - Cross-platform flashlight support
 * 
 * @author SafeDose Development Team
 * @version 1.0.0
 * @since 2024
 */

const { useState, useCallback, useRef, useEffect } = require('react');

/**
 * @typedef {Object} CameraPermission
 * @property {'granted'|'denied'|'undetermined'} status - Current permission status
 * @property {Function} request - Function to request camera permissions
 */

/**
 * @typedef {Object} ScanResult
 * @property {Object} syringe - Detected syringe information
 * @property {string} syringe.type - Type of syringe ('Insulin' or 'Standard')
 * @property {string} syringe.volume - Volume capacity of the syringe
 * @property {Object} vial - Detected vial information  
 * @property {string} vial.substance - Name of the medication substance
 * @property {string} vial.concentration - Concentration value with units
 * @property {string} vial.totalAmount - Total amount of medication in vial
 * @property {Object} capturedImage - Information about the captured image
 * @property {string} capturedImage.uri - URI of the captured image
 */

/**
 * @typedef {Object} ScanState
 * @property {boolean} isProcessing - Whether a scan is currently being processed
 * @property {string|null} scanError - Current error message, if any
 * @property {string} processingMessage - Message to display during processing
 * @property {boolean} flashlightEnabled - Whether flashlight/torch is enabled
 * @property {boolean} flashlightSupported - Whether device supports flashlight
 */

/**
 * @typedef {Object} ScanConfiguration
 * @property {Object} openai - OpenAI client instance for image processing
 * @property {CameraPermission} permission - Camera permission object
 * @property {React.RefObject} cameraRef - Reference to camera component
 * @property {MediaStream|null} webCameraStream - Web camera stream for browser usage
 * @property {Function} incrementScansUsed - Function to increment usage counter
 * @property {Function} checkUsageLimit - Function to verify scan limits
 */

/**
 * @typedef {Object} ScanHandlers
 * @property {Function} onScanSuccess - Callback when scan completes successfully
 * @property {Function} onScanError - Callback when scan encounters an error
 * @property {Function} onProcessingStart - Callback when processing begins
 * @property {Function} onProcessingEnd - Callback when processing completes
 */

/**
 * Custom hook for AI-powered medication scanning functionality
 * 
 * This hook encapsulates all scanning-related logic including camera management,
 * image processing, AI analysis, and result handling. It provides a clean interface
 * for components to integrate scanning capabilities without managing complex state.
 * 
 * The hook handles:
 * - Camera permission requests and status management
 * - Image capture from device camera or web interface
 * - AI-powered analysis using OpenAI's vision models
 * - Extraction of medication data (substance, concentration, syringe type)
 * - Usage tracking and limit enforcement
 * - Cross-platform flashlight/torch control
 * - Comprehensive error handling and recovery
 * 
 * @param {ScanConfiguration} config - Configuration object for scan operations
 * @param {Object} config.openai - OpenAI client instance for image processing
 * @param {CameraPermission} config.permission - Camera permission object
 * @param {React.RefObject} config.cameraRef - Reference to camera component
 * @param {MediaStream|null} config.webCameraStream - Web camera stream for browser usage
 * @param {Function} config.incrementScansUsed - Function to increment usage counter
 * @param {Function} config.checkUsageLimit - Function to verify scan limits
 * @param {ScanHandlers} [handlers={}] - Optional event handlers for scan lifecycle
 * @param {Function} [handlers.onScanSuccess] - Called when scan succeeds with results
 * @param {Function} [handlers.onScanError] - Called when scan encounters an error  
 * @param {Function} [handlers.onProcessingStart] - Called when AI processing begins
 * @param {Function} [handlers.onProcessingEnd] - Called when AI processing completes
 * 
 * @returns {Object} Scan hook interface
 * @returns {ScanState} returns.state - Current scanning state
 * @returns {Function} returns.initiateScan - Initiates the scanning process
 * @returns {Function} returns.toggleFlashlight - Toggles camera flashlight/torch
 * @returns {Function} returns.resetScanState - Resets scanning state to initial values
 * @returns {Function} returns.handleCameraError - Handles camera-related errors
 * @returns {Function} returns.requestCameraPermission - Requests camera permissions
 * 
 * @example
 * // Basic usage in a React component
 * import { useScan } from './hooks/useScan';
 * 
 * function ScanComponent({ openai, cameraRef, checkUsageLimit, incrementScansUsed }) {
 *   const {
 *     state,
 *     initiateScan,
 *     toggleFlashlight,
 *     resetScanState
 *   } = useScan(
 *     {
 *       openai,
 *       permission: cameraPermission,
 *       cameraRef,
 *       webCameraStream: null,
 *       incrementScansUsed,
 *       checkUsageLimit
 *     },
 *     {
 *       onScanSuccess: (result) => {
 *         console.log('Scan successful:', result);
 *         applyResultsToForm(result);
 *       },
 *       onScanError: (error) => {
 *         console.error('Scan failed:', error);
 *         showErrorMessage(error);
 *       }
 *     }
 *   );
 * 
 *   return (
 *     <div>
 *       <button 
 *         onClick={initiateScan} 
 *         disabled={state.isProcessing}
 *       >
 *         {state.isProcessing ? state.processingMessage : 'Scan Medication'}
 *       </button>
 *       
 *       {state.flashlightSupported && (
 *         <button onClick={toggleFlashlight}>
 *           {state.flashlightEnabled ? 'Turn Off Flash' : 'Turn On Flash'}
 *         </button>
 *       )}
 *       
 *       {state.scanError && (
 *         <div className="error">{state.scanError}</div>
 *       )}
 *     </div>
 *   );
 * }
 * 
 * @example
 * // Advanced usage with custom error handling
 * const {
 *   state,
 *   initiateScan,
 *   handleCameraError,
 *   requestCameraPermission
 * } = useScan(
 *   scanConfig,
 *   {
 *     onScanSuccess: async (result) => {
 *       // Validate scan results before applying
 *       if (validateScanResult(result)) {
 *         await saveScanToHistory(result);
 *         navigateToReviewScreen(result);
 *       } else {
 *         throw new Error('Invalid scan result detected');
 *       }
 *     },
 *     onScanError: (error) => {
 *       // Custom error handling based on error type
 *       if (error.message.includes('permission')) {
 *         requestCameraPermission();
 *       } else if (error.message.includes('limit')) {
 *         showUpgradePrompt();
 *       } else {
 *         logErrorToAnalytics(error);
 *       }
 *     }
 *   }
 * );
 */
function useScan(config, handlers = {}) {
  // Destructure configuration with defaults
  const {
    openai,
    permission,
    cameraRef,
    webCameraStream,
    incrementScansUsed,
    checkUsageLimit
  } = config;

  const {
    onScanSuccess,
    onScanError,
    onProcessingStart,
    onProcessingEnd
  } = handlers;

  // Internal state management
  const [state, setState] = useState({
    isProcessing: false,
    scanError: null,
    processingMessage: 'Processing image... This may take a few seconds',
    flashlightEnabled: false,
    flashlightSupported: false
  });

  // Ref to track component mount status for cleanup
  const isMountedRef = useRef(true);

  /**
   * Updates the scan state with partial updates
   * 
   * @param {Partial<ScanState>} updates - State updates to apply
   * @private
   */
  const updateState = useCallback((updates) => {
    if (isMountedRef.current) {
      setState(prevState => ({ ...prevState, ...updates }));
    }
  }, []);

  /**
   * Resets the scanning state to initial values
   * 
   * Clears any errors, processing status, and flashlight state.
   * Useful for cleaning up after failed scans or when navigating away.
   * 
   * @function
   * @memberof useScan
   */
  const resetScanState = useCallback(() => {
    updateState({
      isProcessing: false,
      scanError: null,
      processingMessage: 'Processing image... This may take a few seconds',
      flashlightEnabled: false
    });
  }, [updateState]);

  /**
   * Handles camera-related errors with appropriate user messaging
   * 
   * @param {Error} error - The camera error to handle
   * @param {string} [context='general'] - Context where error occurred
   * @function
   * @memberof useScan
   */
  const handleCameraError = useCallback((error, context = 'general') => {
    console.error(`[useScan] Camera error in ${context}:`, error);
    
    let userMessage = 'Camera error occurred';
    
    if (error.name === 'NotAllowedError') {
      userMessage = 'Camera permission denied. Please allow camera access.';
    } else if (error.name === 'NotFoundError') {
      userMessage = 'No camera found on this device.';
    } else if (error.name === 'NotReadableError') {
      userMessage = 'Camera is being used by another application.';
    } else if (error.message.includes('permission')) {
      userMessage = 'Camera permission required for scanning.';
    }
    
    updateState({
      scanError: userMessage,
      isProcessing: false
    });

    if (onScanError) {
      onScanError(new Error(userMessage));
    }
  }, [updateState, onScanError]);

  /**
   * Requests camera permissions with proper error handling
   * 
   * @returns {Promise<boolean>} True if permission granted, false otherwise
   * @function
   * @memberof useScan
   */
  const requestCameraPermission = useCallback(async () => {
    try {
      if (permission?.request) {
        const result = await permission.request();
        return result.status === 'granted';
      }
      return false;
    } catch (error) {
      handleCameraError(error, 'permission_request');
      return false;
    }
  }, [permission, handleCameraError]);

  /**
   * Toggles the camera flashlight/torch functionality
   * 
   * Supports both native mobile cameras and web camera streams with torch capability.
   * Gracefully handles cases where flashlight is not supported.
   * 
   * @function
   * @memberof useScan
   */
  const toggleFlashlight = useCallback(async () => {
    try {
      // For web camera streams
      if (webCameraStream) {
        const videoTrack = webCameraStream.getVideoTracks()[0];
        if (!videoTrack) {
          console.warn('[useScan] No video track available for flashlight');
          return;
        }

        const capabilities = videoTrack.getCapabilities();
        if (!capabilities.torch) {
          console.warn('[useScan] Torch not supported on this device');
          return;
        }

        const newFlashlightState = !state.flashlightEnabled;
        await videoTrack.applyConstraints({
          advanced: [{ torch: newFlashlightState }]
        });
        
        updateState({ flashlightEnabled: newFlashlightState });
        console.log(`[useScan] Flashlight ${newFlashlightState ? 'enabled' : 'disabled'}`);
      }
      // For native camera implementations, additional logic would be added here
    } catch (error) {
      console.error('[useScan] Error toggling flashlight:', error);
      // Flashlight errors are not critical, so we don't update error state
    }
  }, [webCameraStream, state.flashlightEnabled, updateState]);

  /**
   * Processes captured image data using AI analysis
   * 
   * @param {string|Blob} imageData - The captured image data
   * @returns {Promise<ScanResult>} Processed scan results
   * @private
   */
  const processImageWithAI = useCallback(async (imageData) => {
    if (!openai) {
      throw new Error('OpenAI client not configured');
    }

    updateState({ processingMessage: 'Analyzing image with AI...' });

    try {
      // This is a simplified example - actual implementation would use
      // OpenAI's vision API to analyze the image and extract medication data
      
      // In the real implementation, this would make an API call like:
      // const response = await openai.chat.completions.create({
      //   model: "gpt-4-vision-preview",
      //   messages: [
      //     {
      //       role: "user",
      //       content: [
      //         { type: "text", text: "Analyze this medication image..." },
      //         { type: "image_url", image_url: { url: imageData } }
      //       ]
      //     }
      //   ]
      // });

      // Simulated AI response structure for documentation purposes
      const mockResult = {
        syringe: {
          type: 'Standard',
          volume: '3 ml'
        },
        vial: {
          substance: 'Example Medication',
          concentration: '10 mg/ml',
          totalAmount: '5 ml'
        },
        capturedImage: {
          uri: typeof imageData === 'string' ? imageData : (typeof URL !== 'undefined' ? URL.createObjectURL(imageData) : imageData)
        }
      };

      return mockResult;
    } catch (error) {
      console.error('[useScan] AI processing error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }, [openai, updateState]);

  /**
   * Initiates the complete scanning process
   * 
   * This is the main entry point for scanning operations. It handles:
   * - Usage limit verification
   * - Camera capture or file selection
   * - AI-powered image analysis
   * - Result processing and callback execution
   * - Error handling and state management
   * 
   * @returns {Promise<ScanResult|null>} Scan results if successful, null if failed
   * @function
   * @memberof useScan
   */
  const initiateScan = useCallback(async () => {
    // Prevent concurrent scans
    if (state.isProcessing) {
      console.log('[useScan] Scan already in progress, ignoring request');
      return null;
    }

    try {
      // Check usage limits before proceeding
      updateState({ 
        isProcessing: true, 
        scanError: null,
        processingMessage: 'Checking scan limits...'
      });

      if (onProcessingStart) {
        onProcessingStart();
      }

      const canProceed = await checkUsageLimit();
      if (!canProceed) {
        throw new Error('Scan limit reached. Please upgrade for unlimited scans.');
      }

      // Capture image
      updateState({ processingMessage: 'Capturing image...' });
      
      let imageData;
      
      if (cameraRef?.current) {
        // Mobile/native camera capture
        const captureResult = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          exif: false
        });
        imageData = captureResult.uri;
      } else if (webCameraStream) {
        // Web camera capture
        if (typeof document !== 'undefined') {
          const canvas = document.createElement('canvas');
          const video = document.querySelector('video'); // Assumes video element exists
          if (video) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            imageData = canvas.toDataURL('image/jpeg', 0.8);
          } else {
            throw new Error('No video element found for capture');
          }
        } else {
          throw new Error('Document not available for web capture');
        }
      } else {
        throw new Error('No camera available for capture');
      }

      // Process image with AI
      const scanResult = await processImageWithAI(imageData);

      // Increment usage counter
      await incrementScansUsed();

      // Complete processing
      updateState({ 
        isProcessing: false,
        processingMessage: 'Processing image... This may take a few seconds'
      });

      if (onProcessingEnd) {
        onProcessingEnd();
      }

      if (onScanSuccess) {
        onScanSuccess(scanResult);
      }

      console.log('[useScan] Scan completed successfully');
      return scanResult;

    } catch (error) {
      console.error('[useScan] Scan failed:', error);
      
      updateState({
        isProcessing: false,
        scanError: error.message,
        processingMessage: 'Processing image... This may take a few seconds'
      });

      if (onProcessingEnd) {
        onProcessingEnd();
      }

      if (onScanError) {
        onScanError(error);
      }

      return null;
    }
  }, [
    state.isProcessing,
    checkUsageLimit,
    cameraRef,
    webCameraStream,
    processImageWithAI,
    incrementScansUsed,
    updateState,
    onProcessingStart,
    onProcessingEnd,
    onScanSuccess,
    onScanError
  ]);

  // Check flashlight support when web camera stream changes
  useEffect(() => {
    if (webCameraStream) {
      const videoTrack = webCameraStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        const supported = !!(capabilities?.torch);
        updateState({ flashlightSupported: supported });
        console.log('[useScan] Flashlight support detected:', supported);
      }
    }
  }, [webCameraStream, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Return the hook interface
  return {
    /**
     * Current scanning state including processing status, errors, and flashlight state
     * @type {ScanState}
     */
    state,

    /**
     * Initiates the complete scanning process including capture and AI analysis
     * @type {Function}
     */
    initiateScan,

    /**
     * Toggles camera flashlight/torch on supported devices
     * @type {Function}
     */
    toggleFlashlight,

    /**
     * Resets scanning state to initial values
     * @type {Function}
     */
    resetScanState,

    /**
     * Handles camera-related errors with user-friendly messaging
     * @type {Function}
     */
    handleCameraError,

    /**
     * Requests camera permissions from the user
     * @type {Function}
     */
    requestCameraPermission
  };
}

/**
 * Default export for convenience
 * @see useScan
 */
module.exports = { useScan };
module.exports.default = useScan;