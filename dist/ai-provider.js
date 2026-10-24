export const AI_PROVIDER='openai';
export const AI_BUILD='resume-studio-v4-openai';
export const DEFAULT_MODEL='gpt-6.1-sol';
export function isCompatibleOpenAIStatus(status){
  if(!status||typeof status.configured!=='boolean')return false;
  const current=status.provider===AI_PROVIDER&&status.build===AI_BUILD;
  const previous=status.provider===undefined&&status.build==='resume-studio-v2'&&typeof status.model==='string'&&!status.model.includes('/');
  return current||previous;
}
