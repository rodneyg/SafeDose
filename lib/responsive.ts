import { Dimensions, PixelRatio } from 'react-native';

// Base width for scaling calculations (iPhone 11 width)
const guidelineBaseWidth = 375;

/**
 * Scale a size based on the device's screen width.
 * This helps keep UI elements proportional on small screens.
 */
export function scaleSize(size: number): number {
  const { width } = Dimensions.get('window');
  return (width / guidelineBaseWidth) * size;
}

/**
 * Scale a font size with pixel rounding.
 */
export function scaleFont(size: number): number {
  return Math.round(PixelRatio.roundToNearestPixel(scaleSize(size)));
}

