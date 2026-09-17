import ulianaData from './uliana.json';

export const ULIANA_BUSINESS = (ulianaData as any).business;
export const ULIANA_BLOCKS = (ulianaData as any).blocks;

export function getStaticBusinessByUsername(username: string) {
  if (username?.toLowerCase() === 'ulianapehlivan') {
    return JSON.parse(JSON.stringify(ULIANA_BUSINESS));
  }
  return null;
}

export function getStaticBusinessById(id: string) {
  if (id === ULIANA_BUSINESS.id) {
    return JSON.parse(JSON.stringify(ULIANA_BUSINESS));
  }
  return null;
}

export function getStaticBlocksByBusinessId(businessId: string) {
  if (businessId === ULIANA_BUSINESS.id) {
    return JSON.parse(JSON.stringify(ULIANA_BLOCKS));
  }
  return [];
}
