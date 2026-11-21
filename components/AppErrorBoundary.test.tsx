import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AppErrorBoundary } from './AppErrorBoundary';

function ThrowingChild(): React.ReactElement {
  throw new Error('test render failure');
}

describe('AppErrorBoundary', () => {
  it('renders the fallback when a child throws', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Please try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(consoleError).toHaveBeenCalledWith(
      '[AppErrorBoundary] Unhandled render error',
      expect.any(Error),
      expect.any(Object),
    );

    consoleError.mockRestore();
  });
});
