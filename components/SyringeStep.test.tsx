import React from 'react';
import SyringeStep from './SyringeStep';
import { SyringeSelection } from '../lib/dosing';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('../lib/utils', () => ({ ...jest.requireActual('../lib/dosing'), isMobileWeb: false }));
jest.mock('lucide-react-native', () => ({ Info: 'Info' }));

// Inspect the returned React tree without a native renderer. Exercise actual button callbacks.
function elements(node: React.ReactNode): React.ReactElement<any>[] {
  return React.Children.toArray(node).flatMap(child => React.isValidElement(child)
    ? [child, ...elements((child.props as any).children)] : []);
}
const text = (node: React.ReactNode): string => React.Children.toArray(node).map(child =>
  React.isValidElement(child) ? text((child.props as any).children) : String(child)).join('');
const render = (manualSyringe: SyringeSelection) => {
  const setManualSyringe = jest.fn();
  const tree = SyringeStep({ manualSyringe, setManualSyringe, setSyringeHint: jest.fn(), syringeHint: null, doseValue: 500, unit: 'mcg' });
  return { tree, setManualSyringe, buttons: elements(tree).filter(node => node.props.onPress) };
};

it('SAF-101 #7: rendering never replaces a selected or unreadable syringe', () => {
  expect(render({ type: 'Standard', volume: '3 ml' }).setManualSyringe).not.toHaveBeenCalled();
  expect(render({ type: 'Standard', volume: '', needsConfirmation: true }).setManualSyringe).not.toHaveBeenCalled();
});
it('SAF-101 #7: unknown scan requires selecting type and volume separately', () => {
  const screen = render({ type: 'Standard', volume: '', needsConfirmation: true, needsScaleConfirmation: true });
  expect(screen.buttons).toHaveLength(2);
  screen.buttons.find(button => text(button).includes('Insulin Syringes'))!.props.onPress();
  expect(screen.setManualSyringe).toHaveBeenCalledWith({ type: 'Insulin', volume: '', insulinScale: 'U-100', needsScaleConfirmation: true });
  screen.buttons.find(button => text(button).includes('Standard Syringes'))!.props.onPress();
  expect(screen.setManualSyringe).toHaveBeenCalledWith({ type: 'Standard', volume: '' });
  const typed = render({ type: 'Standard', volume: '' });
  typed.buttons.find(button => text(button).includes('Standard Syringes'))!.props.onPress();
  expect(typed.setManualSyringe).toHaveBeenCalledWith({ type: 'Standard', volume: '' });
  typed.buttons.find(button => text(button) === '3 ml')!.props.onPress();
  expect(typed.setManualSyringe).toHaveBeenCalledWith({ type: 'Standard', volume: '3 ml' });
});
it('SAF-101 #8: U-40 selector and labels use U-40 markings', () => {
  const screen = render({ type: 'Insulin', volume: '0.5 ml', insulinScale: 'U-40', needsScaleConfirmation: true });
  expect(screen.buttons.some(button => text(button) === '0.3 ml')).toBe(false);
  expect(text(screen.tree)).toContain('1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20');
  screen.buttons.find(button => text(button) === 'U-40')!.props.onPress();
  expect(screen.setManualSyringe).toHaveBeenCalledWith({ type: 'Insulin', volume: '0.5 ml', insulinScale: 'U-40', needsScaleConfirmation: false });
});
