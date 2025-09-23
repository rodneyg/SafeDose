# Toggleable Autocapture Feature Implementation

## Overview
This implementation adds a toggleable autocapture feature to the SafeDose camera interface that helps guide users towards taking accurate photos.

## Key Features Added

### 1. Autocapture Toggle Button
- **Icon**: Lightning bolt (⚡) icon that changes based on state
- **States**: 
  - Off: ZapOff icon with white color
  - On: Zap icon with black color (on active background)
- **Location**: Left side of the camera controls, next to flashlight button

### 2. Real-time Quality Detection
- **Brightness Analysis**: Analyzes camera feed for optimal lighting (80-180 range)
- **Focus Detection**: Basic edge detection to ensure image sharpness
- **Stability Check**: Simplified stability assessment
- **Scoring System**: 0-100 quality score with thresholds:
  - Poor: 0-59 (red indicator)
  - Good: 60-79 (yellow indicator) 
  - Excellent: 80+ (green indicator)

### 3. Visual Feedback
- **Quality Indicator**: Color-coded pill showing current image quality
  - "Poor" in red background
  - "Good" in yellow background  
  - "Perfect!" in green background
- **Position**: Above the instruction text

### 4. Autocapture Countdown
- **Trigger**: Starts when quality reaches "Excellent" (80+ score)
- **Duration**: 3-second countdown (3, 2, 1)
- **Display**: Large countdown number with cancel button
- **Cancel**: User can tap "Cancel" to abort autocapture

### 5. Cross-platform Support
- **Web**: Full quality analysis using Canvas API and video stream
- **Native**: Simplified quality scoring with fallback values

## Technical Implementation

### State Management
```typescript
const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(false);
const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
const [qualityScore, setQualityScore] = useState(0);
const [qualityIndicator, setQualityIndicator] = useState<'poor' | 'good' | 'excellent'>('poor');
```

### Quality Analysis Algorithm
1. **Image Capture**: Extract video frame using Canvas API
2. **Brightness Calculation**: Average RGB values across all pixels
3. **Edge Detection**: Compare adjacent pixels to detect focus
4. **Scoring**: Combine metrics into 0-100 score
5. **Threshold Check**: Auto-trigger when score ≥ 80

### User Flow
1. User opens camera interface
2. Toggles autocapture on (optional)
3. System continuously analyzes image quality
4. Visual feedback shows current quality status
5. When excellent quality detected, countdown starts
6. User can cancel or let autocapture proceed
7. Photo captured automatically or manually

## Benefits
- **Improved Photo Quality**: Guides users to optimal conditions
- **Better AI Analysis**: Higher quality images = more accurate results
- **User Friendly**: Optional feature that doesn't interfere with manual capture
- **Visual Guidance**: Clear feedback on image quality
- **Accessible**: Works on both web and mobile platforms

## Files Modified
- `components/ScanScreen.tsx`: Main implementation
- `components/ScanScreen.autocapture.test.tsx`: Basic tests

## Styling
Added new CSS classes for autocapture UI elements:
- `.autocaptureStatus`: Container for quality feedback
- `.qualityIndicator`: Base styling for quality pills
- `.qualityPoor/Good/Excellent`: Color-specific styling
- `.countdownContainer`: Layout for countdown and cancel button
- `.countdownText`: Large countdown number styling
- `.cancelButton`: Cancel button styling

This implementation provides a seamless enhancement to the existing camera functionality while maintaining full backward compatibility.