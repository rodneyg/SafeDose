import { addDoc, setDoc, collection, doc, DocumentReference, CollectionReference, DocumentData, SetOptions } from 'firebase/firestore';
import { isPreviewEnvironment } from './environment';

/**
 * Enhanced addDoc that adds environment field in preview environment
 */
export const addDocWithEnv = async (
  reference: CollectionReference<DocumentData>,
  data: DocumentData
): Promise<DocumentReference<DocumentData>> => {
  const enhancedData = isPreviewEnvironment() 
    ? { ...data, env: 'preview' }
    : data;
  
  if (isPreviewEnvironment()) {
    console.log('[Firestore] Preview environment - adding env field to document');
  }
  
  return addDoc(reference, enhancedData);
};

/**
 * Enhanced setDoc that adds environment field in preview environment for create operations
 * Note: This only adds env field for new documents, not updates as per requirements
 */
export const setDocWithEnv = async (
  reference: DocumentReference<DocumentData>,
  data: DocumentData,
  options?: SetOptions
): Promise<void> => {
  // Only add env field if it's a create operation (no merge option or merge is false)
  const isCreateOperation = !options || (!options.merge && !options.mergeFields);
  
  const enhancedData = (isPreviewEnvironment() && isCreateOperation)
    ? { ...data, env: 'preview' }
    : data;
  
  if (isPreviewEnvironment() && isCreateOperation) {
    console.log('[Firestore] Preview environment - adding env field to document (create operation)');
  }
  
  return setDoc(reference, enhancedData, options);
};