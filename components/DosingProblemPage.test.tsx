import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import DosingProblemPage from '../app/dosing-problem';
import PublicLinks from '../components/PublicLinks';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('expo-router/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('expo-router', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

let renderer: ReactTestRenderer | undefined;

afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
});

it('renders the dosing guide, worked example and medical advice note', () => {
  act(() => { renderer = create(<DosingProblemPage />); });
  const text = JSON.stringify(renderer!.toJSON());

  expect(text).toContain('The dosing problem');
  expect(text).toContain('5 mg per mL');
  expect(text).toContain('0.1 mL');
  expect(text).toContain('10 units');
  expect(text).toContain('not medical advice');
});

it('links to the dosing guide from the public footer links', () => {
  act(() => { renderer = create(<PublicLinks />); });
  const link = renderer!.root.findByProps({ children: 'Understanding dosing' });

  expect(link.props.href).toBe('/dosing-problem');
});
