import { AppError } from '../middleware/error';
import { CreateNGOInput, UpdateNGOInput } from '../types';

export const identityFields = [
  'name', 'email', 'phone', 'craNumber', 'orgType', 'registrationNumber',
  'primaryContactName', 'primaryContactTitle', 'website', 'address',
  'city', 'province', 'country', 'postalCode', 'foodDonationDetails',
  'description', 'mission', 'category', 'logoUrl', 'coverUrl',
] as const;

const textFields = identityFields;
const orgTypes = ['REGISTERED_CHARITY', 'NON_PROFIT', 'COMMUNITY_GROUP', 'SOCIAL_ENTERPRISE'];
const fieldLabels: Record<string, string> = {
  name: 'organisation name', email: 'contact email', phone: 'organisation phone',
  description: 'description', category: 'category', address: 'street address',
  city: 'city', province: 'province', country: 'country', postalCode: 'postal code',
  orgType: 'organisation type', craNumber: 'CRA charity number',
  registrationNumber: 'registration number', primaryContactName: 'primary contact name',
  primaryContactTitle: 'contact role or title', foodDonationDetails: 'food receiving arrangements',
  mission: 'mission', website: 'website', logoUrl: 'logo URL', coverUrl: 'cover image URL',
  evidenceSources: 'independent sources checked', contactMethod: 'representative confirmation method',
  contactedAt: 'date contacted', notes: 'review notes', applicationUpdatedAt: 'application version (reload the page)',
};

// Only accept editable application fields; never accept status or verification metadata.
export function parseNGOInput(body: unknown): UpdateNGOInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Organisation details are required', 400);
  }
  const result: Record<string, string> = {};
  for (const key of textFields) {
    const value = (body as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || value.trim().length > 5000) {
      throw new AppError(`Please provide valid text for ${fieldLabels[key]}`, 400);
    }
    result[key] = value.trim();
  }
  if (result.email !== undefined) result.email = result.email.toLowerCase();
  if (result.craNumber !== undefined) result.craNumber = result.craNumber.replace(/\s/g, '').toUpperCase();
  for (const field of ['website', 'logoUrl', 'coverUrl']) {
    if (!result[field]) continue;
    try {
      const url = new URL(result[field]);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new AppError(`Please provide an http or https URL for ${fieldLabels[field]}`, 400);
    }
  }
  return result;
}

export function validateNGOApplication(input: UpdateNGOInput): asserts input is CreateNGOInput {
  for (const field of ['name', 'email', 'description', 'category', 'address', 'city', 'province', 'country', 'postalCode', 'phone', 'orgType', 'primaryContactName', 'primaryContactTitle', 'foodDonationDetails'] as const) {
    if (!input[field]?.trim()) throw new AppError(`Please complete ${fieldLabels[field]}`, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email!)) {
    throw new AppError('Please provide a valid contact email', 400);
  }
  if (!orgTypes.includes(input.orgType!)) throw new AppError('Please select a valid organisation type', 400);
  if (!['FOOD_BANK', 'HEALTHCARE', 'EDUCATION', 'SHELTER', 'COMMUNITY'].includes(input.category!)) {
    throw new AppError('Please select a valid category', 400);
  }
  if (input.orgType === 'REGISTERED_CHARITY' && !/^\d{9}RR\d{4}$/.test(input.craNumber ?? '')) {
    throw new AppError('Please provide the full CRA charity number, for example 123456789RR0001', 400);
  }
  if ((input.foodDonationDetails?.length ?? 0) < 20) {
    throw new AppError('Please describe your receiving location, hours, accepted food and storage arrangements', 400);
  }
}

export interface NGOReviewInput {
  organisationChecked: boolean;
  representativeConfirmed: boolean;
  foodOperationsConfirmed: boolean;
  evidenceSources: string;
  contactMethod: string;
  contactedAt: string;
  notes: string;
  applicationUpdatedAt: string;
}

export function parseNGOReview(body: unknown): NGOReviewInput {
  const data = body as Record<string, unknown> | undefined;
  if (!data || ['organisationChecked', 'representativeConfirmed', 'foodOperationsConfirmed'].some(key => data[key] !== true)) {
    throw new AppError('Complete all three verification checks before approving', 400);
  }
  for (const field of ['evidenceSources', 'contactMethod', 'contactedAt', 'notes', 'applicationUpdatedAt']) {
    if (typeof data[field] !== 'string' || !(data[field] as string).trim() || (data[field] as string).length > 5000) {
      throw new AppError(`Please complete ${fieldLabels[field]}`, 400);
    }
  }
  if ((data.evidenceSources as string).trim().length < 10 || (data.notes as string).trim().length < 10) {
    throw new AppError('Provide supporting sources and review notes of at least 10 characters each', 400);
  }
  const contactedAt = Date.parse(data.contactedAt as string);
  if (!Number.isFinite(contactedAt) || contactedAt > Date.now() || !Number.isFinite(Date.parse(data.applicationUpdatedAt as string))) {
    throw new AppError('Please provide a valid contact date in the past and reload the application', 400);
  }
  return {
    organisationChecked: true, representativeConfirmed: true, foodOperationsConfirmed: true,
    evidenceSources: (data.evidenceSources as string).trim(),
    contactMethod: (data.contactMethod as string).trim(),
    contactedAt: new Date(contactedAt).toISOString(),
    notes: (data.notes as string).trim(),
    applicationUpdatedAt: new Date(data.applicationUpdatedAt as string).toISOString(),
  };
}
