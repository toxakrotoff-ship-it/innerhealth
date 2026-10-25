import { z } from 'zod';

export interface OzonMoney {
  amount: string;
  currency_code: 'RUB';
}

export interface OzonDeliveryPoint {
  delivery_point_id: number;
  name: string;
  full_address: string;
  type: string;
  is_active: boolean;
  coordinates?: { latitude: number; longitude: number };
}

export interface OzonDimensions {
  weight_g: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
}

export interface OzonCheckoutPosting {
  request_id: number;
  shipment_method_id: number;
  cutoff_at: string;
  declared_value: OzonMoney;
  dimensions: OzonDimensions;
}

export interface OzonCheckoutRequest {
  recipient: { phone_number: string };
  delivery: { delivery_point: { delivery_point_id: number } };
  postings: OzonCheckoutPosting[];
}

export interface OzonCheckoutResponse {
  results: Array<{
    request_id: number;
    posting?: {
      estimated_delivery_cost: OzonMoney;
      estimated_insurance_cost: OzonMoney;
      estimated_delivery_days: number;
      cutoff_at: string;
    };
    error?: { code: string; message?: string };
  }>;
}

export interface OzonCreateOrderRequest {
  order_external_id: string;
  recipient: { phone_number: string; full_name: string };
  delivery: { delivery_point: { delivery_point_id: number } };
  postings: Array<OzonCheckoutPosting & { posting_external_id: string; description: string }>;
}

export interface OzonCreateOrderResponse {
  order_number: string;
  postings: Array<{
    request_id: number;
    posting_number: string;
    estimated_delivery_days: number;
    cutoff_at: string;
  }>;
}

export interface OzonDeliveryPointsListResponse {
  delivery_points: Array<{
    delivery_point_id: number;
    shipment_method_ids: number[] | number;
  }>;
  next_cursor?: string | null;
}

export interface OzonPostingInfoResponse {
  postings: Array<{
    posting_number: string;
    status?: string;
    [key: string]: unknown;
  }>;
}

export interface OzonApprovePostingsResponse {
  [key: string]: unknown;
}

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const moneySchema = z.object({ amount: z.string().regex(/^\d+(\.\d+)?$/), currency_code: z.literal('RUB') });
export const ozonTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive().finite(),
});
export const ozonCheckClientSchema = z.object({ can_be_delivered: z.boolean() });
export const ozonDeliveryPointsListSchema = z.object({
  delivery_points: z.array(z.object({ delivery_point_id: id, shipment_method_ids: z.union([id, z.array(id)]).nonoptional() })),
  next_cursor: z.string().nullish(),
// With strictNullChecks disabled, Zod infers union fields as optional despite runtime validation.
}) as z.ZodType<OzonDeliveryPointsListResponse>;
export const ozonDeliveryPointsSchema = z.object({
  delivery_points: z.array(z.object({
    delivery_point_id: id,
    name: z.string(),
    full_address: z.string(),
    type: z.string(),
    is_active: z.boolean(),
    coordinates: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional(),
  })),
});
export const ozonCheckoutSchema = z.object({
  results: z.array(z.object({
    request_id: id,
    posting: z.object({
      estimated_delivery_cost: moneySchema,
      estimated_insurance_cost: moneySchema,
      estimated_delivery_days: z.number().int().nonnegative(),
      cutoff_at: z.string().min(1),
    }).optional(),
    error: z.object({ code: z.string().min(1), message: z.string().optional() }).optional(),
  }).refine((result) => Boolean(result.posting) !== Boolean(result.error))),
});
export const ozonCreateOrderSchema = z.object({
  order_number: z.string().min(1),
  postings: z.array(z.object({
    request_id: id,
    posting_number: z.string().min(1),
    estimated_delivery_days: z.number().int().nonnegative(),
    cutoff_at: z.string().min(1),
  })).min(1),
});
export const ozonPostingInfoSchema = z.object({
  postings: z.array(z.object({ posting_number: z.string().min(1), status: z.string().min(1) }).passthrough()),
});
