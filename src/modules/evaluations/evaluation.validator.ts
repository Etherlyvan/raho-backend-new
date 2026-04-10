import { z } from 'zod';

export const upsertEvaluationSchema = z.object({
  subjective:     z.string().max(2000).optional(),
  objective:      z.string().max(2000).optional(),
  assessment:     z.string().max(2000).optional(),
  plan:           z.string().max(2000).optional(),
  evaluasiDokter: z.string().max(2000).optional(),
}).refine(
  data => Object.values(data).some(v => v !== undefined && v !== ''),
  { message: 'Minimal satu field SOAP harus diisi.' },
);

export type UpsertEvaluationInput = z.infer<typeof upsertEvaluationSchema>;