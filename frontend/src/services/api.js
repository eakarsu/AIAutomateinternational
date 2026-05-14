import axios from 'axios';

const apiClient = () =>
  axios.create({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

// Existing CRUD endpoints
export const transfersApi = {
  list: () => apiClient().get('/api/transfers'),
  get: (id) => apiClient().get(`/api/transfers/${id}`),
  create: (data) => apiClient().post('/api/transfers', data),
  update: (id, data) => apiClient().put(`/api/transfers/${id}`, data),
  remove: (id) => apiClient().delete(`/api/transfers/${id}`),
};

export const beneficiariesApi = {
  list: () => apiClient().get('/api/beneficiaries'),
  get: (id) => apiClient().get(`/api/beneficiaries/${id}`),
  create: (data) => apiClient().post('/api/beneficiaries', data),
  update: (id, data) => apiClient().put(`/api/beneficiaries/${id}`, data),
  remove: (id) => apiClient().delete(`/api/beneficiaries/${id}`),
};

export const currenciesApi = {
  list: () => apiClient().get('/api/currencies'),
};

export const fxApi = {
  rates: () => apiClient().get('/api/fx/rates'),
  convert: (from, to, amount) =>
    apiClient().get(`/api/fx/convert?from=${from}&to=${to}&amount=${amount}`),
};

// AI Transfer (existing aiTransfer.js)
export const aiApi = {
  calculateFee: (data) => apiClient().post('/api/ai/calculate-fee', data),
  assessTransfer: (data) => apiClient().post('/api/ai/assess-transfer', data),
};

// Webhook subscriptions
export const webhooksApi = {
  list: () => apiClient().get('/api/webhooks'),
  create: (data) => apiClient().post('/api/webhooks', data),
  remove: (id) => apiClient().delete(`/api/webhooks/${id}`),
  test: (id) => apiClient().post(`/api/webhooks/${id}/test`),
};

// Integrations (NEEDS-CREDS / PRODUCT-DECISION) — added in apply pass 5
export const integrationsApi = {
  swiftTrack: (data) => apiClient().post('/api/integrations/swift/track', data),
  wiseQuote: (data) => apiClient().post('/api/integrations/wise/quote', data),
  remitlyQuote: (data) => apiClient().post('/api/integrations/remitly/quote', data),
  ofacScreen: (data) => apiClient().post('/api/integrations/ofac/screen', data),
  usdcIntent: (data) => apiClient().post('/api/integrations/usdc/intent', data),
  listUsdcIntents: () => apiClient().get('/api/integrations/usdc/intents'),
  bulkPlan: (data) => apiClient().post('/api/integrations/bulk/plan', data),
  settlements: () => apiClient().get('/api/integrations/settlements'),
};

// AI Features (new aiFeatures.js) - 7 NEW custom features
export const aiFeaturesApi = {
  kycScreen: (data) => apiClient().post('/api/ai-features/kyc-screen', data),
  rateAnalysis: (data) => apiClient().post('/api/ai-features/rate-analysis', data),
  beneficiaryRisk: (data) => apiClient().post('/api/ai-features/beneficiary-risk', data),
  routeOptimize: (data) => apiClient().post('/api/ai-features/route-optimize', data),
  splitPlan: (data) => apiClient().post('/api/ai-features/split-plan', data),
  fraudCheck: (data) => apiClient().post('/api/ai-features/fraud-check', data),
  receipt: (transferId) => apiClient().get(`/api/ai-features/receipt/${transferId}`),
};

export default {
  transfersApi,
  beneficiariesApi,
  currenciesApi,
  fxApi,
  aiApi,
  aiFeaturesApi,
  webhooksApi,
  integrationsApi,
};
