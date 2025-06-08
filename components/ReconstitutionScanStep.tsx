import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { Camera, AlertCircle } from 'lucide-react-native';
import { isMobileWeb, isWeb } from '../lib/utils';

interface Props {
  cameraRef: React.RefObject<CameraView>;
  permission: any;
  requestPermission: () => Promise<any>;
  isProcessing: boolean;
  error: string | null;
  onCapture: () => void;
  webCameraStream: MediaStream | null;
}

export default function ReconstitutionScanStep({
  cameraRef,
  permission,
  requestPermission,
  isProcessing,
  error,
  onCapture,
  webCameraStream,
}: Props) {
  const isPermissionGranted = permission?.granted || false;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Connect video element to stream for web camera - same pattern as main ScanScreen
  useEffect(() => {
    if (isWeb && webCameraStream && videoRef.current) {
      console.log('[ReconstitutionScanStep] Connecting web camera stream to video element');
      videoRef.current.srcObject = webCameraStream;
      videoRef.current.play().catch(err => {
        console.error('[ReconstitutionScanStep] Error playing video:', err);
      });
    }
  }, [webCameraStream]);

  if (!permission || !permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera color="#007AFF" size={64} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            To scan your vial label, we need access to your camera.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Position your vial label clearly in the camera view and tap to capture
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle color="#DC2626" size={16} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.cameraContainer}>
        {isWeb && webCameraStream ? (
          <video
            ref={videoRef}
            style={styles.webCamera}
            autoPlay
            playsInline
            muted
          />
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            autofocus="on"
          />
        )}

        {/* Camera overlay with targeting frame */}
        <View style={styles.overlay}>
          <View style={styles.targetFrame} />
          <Text style={styles.overlayText}>
            Center the vial label in the frame
          </Text>
        </View>
      </View>

      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
          onPress={onCapture}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.captureButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <Camera color="#fff" size={20} />
              <Text style={styles.captureButtonText}>Capture Label</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.helpText}>
        Make sure the label is well-lit and clearly visible. The AI will extract the peptide amount for you.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    gap: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  cameraContainer: {
    position: 'relative',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  webCamera: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetFrame: {
    width: 200,
    height: 120,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  captureContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  captureButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginHorizontal: 16,
  },
});