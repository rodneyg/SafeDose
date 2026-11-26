export const SCAN_MODEL: string;
export const SCAN_PROMPT: string;
export function buildScanRequest(image: string): {
  model: string;
  reasoning_effort: 'none';
  temperature: number;
  response_format: { type: 'json_object' };
  messages: Array<{
    role: 'user';
    content: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;
  }>;
};
