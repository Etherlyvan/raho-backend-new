import express                     from 'express';
import cors                        from 'cors';
import helmet                      from 'helmet';
import morgan                      from 'morgan';
import path                        from 'path';
import { env }                     from './config/env';
import { errorHandler }            from './middlewares/errorHandler';
import authRoutes                  from './modules/auth/auth.routes';
import sessionRoutes               from './modules/sessions/sessions.routes';
import { diagnosisNestedRouter, diagnosisStandaloneRouter } from './modules/diagnoses/diagnoses.routes';
import { dashboardRouter }         from './modules/dashboard/dashboard.routes';
import membersRouter               from './modules/members/members.routes';
import usersRouter                 from './modules/users/users.routes';
import packageRoutes               from './modules/packages/packages.routes';
import encounterRoutes             from './modules/encounters/encounters.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',                             authRoutes);
app.use('/treatment-sessions',               sessionRoutes);
app.use('/encounters/:encounterId/diagnoses', diagnosisNestedRouter);
app.use('/diagnoses',                        diagnosisStandaloneRouter);
app.use('/dashboard',                        dashboardRouter);
app.use('/members',                          membersRouter);
app.use('/users',                            usersRouter);

// ✅ FIX: daftarkan tanpa prefix /api — langsung ke root
// packageRoutes berisi: /package-pricings, /members/:id/packages
// encounterRoutes berisi: /members/:id/encounters, /encounters/:id/sessions
app.use('/',                                 packageRoutes);
app.use('/',                                 encounterRoutes);

app.use(errorHandler);

app.listen(env.PORT, () =>
  console.log(`RAHO Backend running on port ${env.PORT} [${env.NODE_ENV}]`),
);

export default app;