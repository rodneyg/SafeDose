/**
 * Test to verify preview environment handling for analytics and Firestore
 */

import { isPreviewEnvironment, getCurrentEnvironment } from '../environment';
import { logAnalyticsEvent, setAnalyticsUserProperties } from '../analytics';
import { addDocWithEnv, setDocWithEnv } from '../firestoreWithEnv';

// Mock expo-constants for testing
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      NEXTPUBLIC_ENVIRONMENT: 'preview'
    }
  }
}));

// Mock firebase modules
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('../firebase', () => ({
  getAnalyticsInstance: jest.fn(() => null)
}));

describe('Preview Environment Handling', () => {
  beforeEach(() => {
    // Clear console.log mock calls before each test
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  describe('Environment Detection', () => {
    it('should detect preview environment correctly', () => {
      expect(getCurrentEnvironment()).toBe('preview');
      expect(isPreviewEnvironment()).toBe(true);
    });
  });

  describe('Analytics Disabling', () => {
    it('should disable analytics events in preview environment', () => {
      logAnalyticsEvent('test_event', { param: 'value' });
      
      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] Preview environment - skipping event: test_event',
        { param: 'value' }
      );
    });

    it('should disable analytics user properties in preview environment', () => {
      setAnalyticsUserProperties({ userId: '123', plan: 'free' });
      
      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] Preview environment - skipping user properties:',
        { userId: '123', plan: 'free' }
      );
    });
  });

  describe('Firestore Environment Tagging', () => {
    it('should add env field to addDoc in preview environment', async () => {
      const { addDoc } = require('firebase/firestore');
      const mockCollection = {} as any;
      const mockDocRef = { id: 'test-doc' };
      
      addDoc.mockResolvedValue(mockDocRef);
      
      const testData = { field1: 'value1', field2: 'value2' };
      const result = await addDocWithEnv(mockCollection, testData);
      
      expect(addDoc).toHaveBeenCalledWith(mockCollection, {
        ...testData,
        env: 'preview'
      });
      expect(result).toBe(mockDocRef);
      expect(console.log).toHaveBeenCalledWith(
        '[Firestore] Preview environment - adding env field to document'
      );
    });

    it('should add env field to setDoc for create operations in preview environment', async () => {
      const { setDoc } = require('firebase/firestore');
      const mockDocRef = {} as any;
      
      setDoc.mockResolvedValue(undefined);
      
      const testData = { field1: 'value1', field2: 'value2' };
      await setDocWithEnv(mockDocRef, testData);
      
      expect(setDoc).toHaveBeenCalledWith(mockDocRef, {
        ...testData,
        env: 'preview'
      }, undefined);
      expect(console.log).toHaveBeenCalledWith(
        '[Firestore] Preview environment - adding env field to document (create operation)'
      );
    });

    it('should not add env field to setDoc for update operations', async () => {
      const { setDoc } = require('firebase/firestore');
      const mockDocRef = {} as any;
      
      setDoc.mockResolvedValue(undefined);
      
      const testData = { field1: 'value1', field2: 'value2' };
      await setDocWithEnv(mockDocRef, testData, { merge: true });
      
      expect(setDoc).toHaveBeenCalledWith(mockDocRef, testData, { merge: true });
      expect(console.log).not.toHaveBeenCalledWith(
        '[Firestore] Preview environment - adding env field to document (create operation)'
      );
    });
  });
});