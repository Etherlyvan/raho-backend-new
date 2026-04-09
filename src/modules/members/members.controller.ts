import { Response, NextFunction } from "express";
import {
  listMembersService,
  getMemberByIdService,
  listMemberSessionsService,
} from "./members.service";
import { sendSuccess } from "../../utils/response";
import type { AuthRequest } from "../../middlewares/authenticate";

export const listMembers = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    sendSuccess(res, await listMembersService(req.user!), "Daftar member berhasil diambil");
  } catch (err) { next(err); }
};

export const getMemberById = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    sendSuccess(res, await getMemberByIdService(req.params.memberId, req.user!), "Detail member berhasil diambil");
  } catch (err) { next(err); }
};

export const listMemberSessions = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    sendSuccess(res, await listMemberSessionsService(req.params.memberId, req.user!), "Sesi member berhasil diambil");
  } catch (err) { next(err); }
};