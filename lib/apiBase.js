const PRODUCTION_API_BASE_URL = 'https://safedose.rodneygainous.com';

function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (/^https?:\/\//.test(origin) && origin !== 'null') {
      return origin.replace(/\/$/, '');
    }
  }
  return PRODUCTION_API_BASE_URL;
}

module.exports = { getApiBaseUrl, PRODUCTION_API_BASE_URL };
