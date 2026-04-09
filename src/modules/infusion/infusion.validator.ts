import { z } from "zod";
import { JenisBotol } from "../../generated/prisma";

const dosisSchema = z.object({
  ifaMgActual:   z.number().min(0).max(9999.99).default(0),
  hhoMlActual:   z.number().min(0).max(9999.99).default(0),
  h2MlActual:    z.number().min(0).max(9999.99).default(0),
  noMlActual:    z.number().min(0).max(9999.99).default(0),
  gasoMlActual:  z.number().min(0).max(9999.99).default(0),
  o2MlActual:    z.number().min(0).max(9999.99).default(0),
  o3MlActual:    z.number().min(0).max(9999.99).default(0),
  edtaMlActual:  z.number().min(0).max(9999.99).default(0),
  mbMlActual:    z.number().min(0).max(9999.99).default(0),
  h2sMlActual:   z.number().min(0).max(9999.99).default(0),
  kclMlActual:   z.number().min(0).max(9999.99).default(0),
  jmlNbMlActual: z.number().min(0).max(9999.99).default(0),
});

export const upsertInfusionSchema = dosisSchema.extend({
  keterangan:            z.string().max(1000).optional(),
  deviationNote:         z.string().max(1000).optional(),
  tglProduksiCairan:     z.string().datetime({ offset: true }).optional(),
  jenisBotol:            z.nativeEnum(JenisBotol).optional(),
  jenisCairan:           z.string().max(100).optional(),
  volumeCarrierMl:       z.number().int().min(0).optional(),
  jumlahPenggunaanJarum: z.number().int().min(0).optional(),
});

export type UpsertInfusionDto = z.infer<typeof upsertInfusionSchema>;