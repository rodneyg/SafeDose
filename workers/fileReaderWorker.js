// fileReaderWorker.js
self.onmessage = function(e) {
    const file = e.data;
    const reader = new FileReader();
  
    reader.onload = function() {
      const result = reader.result;
      if (typeof result !== 'string' || !result.includes(',')) {
        self.postMessage({ error: 'Failed to read image data' });
        return;
      }
      const base64Image = result.split(',')[1];
      self.postMessage({ base64Image, mimeType: file.type });
    };
  
    reader.onerror = function() {
      self.postMessage({ error: 'Failed to read image' });
    };
  
    reader.readAsDataURL(file);
  };