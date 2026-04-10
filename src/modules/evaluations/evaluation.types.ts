export interface CreateEvaluationDto {
  subjective?:    string;
  objective?:     string;
  assessment?:    string;
  plan?:          string;
  evaluasiDokter?: string;
}

export interface EvaluationResponse {
  doctorEvaluationId: string;
  evaluationCode:     string;
  sessionId:          string;
  doctorId:           string;
  doctorName:         string | null;
  subjective:         string | null;
  objective:          string | null;
  assessment:         string | null;
  plan:               string | null;
  evaluasiDokter:     string | null;
  createdAt:          string;
  updatedAt:          string;
}