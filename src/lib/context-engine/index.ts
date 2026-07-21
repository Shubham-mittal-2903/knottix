export type { ContextSourceType, ContextItem, ContextCollectionResult } from './types';
export { collectContext, renderContextBlock, explainContext } from './engine';
export { recordContextUsage } from './memory';
export { assertContextEngineAvailable } from './demo-guard';
