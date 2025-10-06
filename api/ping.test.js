/**
 * Test for the /api/ping endpoint
 * Verifies deployment verification functionality
 */

describe('/api/ping endpoint', () => {
  let pingHandler;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Import the ping handler
    pingHandler = require('../api/ping.js');
    
    // Mock request object
    mockReq = {};
    
    // Mock response object
    mockRes = {
      statusCode: null,
      responseData: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };
  });

  it('should return 200 status code', () => {
    pingHandler(mockReq, mockRes);
    expect(mockRes.statusCode).toBe(200);
  });

  it('should return JSON response with required fields', () => {
    pingHandler(mockReq, mockRes);
    
    expect(mockRes.responseData).toBeDefined();
    expect(typeof mockRes.responseData).toBe('object');
    expect(mockRes.responseData.message).toBeDefined();
    expect(mockRes.responseData.status).toBe('ok');
    expect(mockRes.responseData.timestamp).toBeDefined();
  });

  it('should return valid timestamp', () => {
    pingHandler(mockReq, mockRes);
    
    const timestamp = mockRes.responseData.timestamp;
    expect(timestamp).toBeDefined();
    
    // Should be a valid ISO string
    const date = new Date(timestamp);
    expect(date.toISOString()).toBe(timestamp);
    
    // Should be recent (within last minute)
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - date.getTime());
    expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
  });

  it('should be suitable for deployment verification', () => {
    pingHandler(mockReq, mockRes);
    
    // Verify all requirements for deployment verification
    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.responseData.message).toBe('pong');
    expect(mockRes.responseData.status).toBe('ok');
    expect(mockRes.responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});