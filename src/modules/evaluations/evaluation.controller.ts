import { Response, NextFunction }   from 'express';
import { upsertEvaluationSchema }   from './evaluation.validator';
import { getEvaluationService,
         upsertEvaluationService }  from './evaluation.service';
import { sendSuccess }              from '../../utils/response';
import { AppError }                 from '../../utils/AppError';
import type { AuthRequest }         from '../../middlewares/authenticate';

export const getEvaluation = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const ev = await getEvaluationService(req.params.sessionId, req.user!);
    if (!ev) throw new AppError('Evaluasi belum tersedia untuk sesi ini.', 404);
    sendSuccess(res, ev, 'Evaluasi berhasil diambil');
  } catch (err) { next(err); }
};

export const upsertEvaluation = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const dto = upsertEvaluationSchema.parse(req.body);
    const ev  = await upsertEvaluationService(req.params.sessionId, dto, req.user!);
    sendSuccess(res, ev, 'Evaluasi berhasil disimpan', 200);
  } catch (err) { next(err); }
};