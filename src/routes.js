import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import multerConfig from './config/multer';

import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import FileController from './app/controllers/FileController';
import ProviderController from './app/controllers/ProviderController';
import AppointmentController from './app/controllers/AppointmentController';
import ScheduleController from './app/controllers/ScheduleController';
import NotificationController from './app/controllers/NotificationController';
import AvailableController from './app/controllers/AvailableController';

import ServiceController from './app/controllers/ServiceController';
import BookingAvailabilityController from './app/controllers/BookingAvailabilityController';
import BookingController, { createBookingValidators } from './app/controllers/BookingController';
import RescheduleController, { rescheduleValidators } from './app/controllers/RescheduleController';
import AdminBookingController from './app/controllers/AdminBookingController';
import AdminSettingController from './app/controllers/AdminSettingController';
import BranchController from './app/controllers/BranchController';
import AdminServiceController from './app/controllers/AdminServiceController';

import authMiddleware from './app/middlewares/auth';
import idempotency from './app/middlewares/idempotency';

const routes = new Router();
const upload = multer(multerConfig);

const bookingRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Demasiadas solicitudes. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const availabilityRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Rutas públicas ────────────────────────────────────────────────────────────
routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);
routes.get('/providers', ProviderController.index);

routes.get('/services', ServiceController.index);
routes.get('/settings/public', AdminSettingController.publicIndex);

routes.get(
  '/bookings/availability/:barberId',
  availabilityRateLimit,
  BookingAvailabilityController.index
);
routes.post('/bookings', bookingRateLimit, idempotency, createBookingValidators, BookingController.store);
routes.get('/bookings/:reference', BookingController.show);

routes.get('/reschedule/:token', RescheduleController.show);
routes.patch('/reschedule/:token', rescheduleValidators, RescheduleController.update);

// ── Rutas autenticadas ────────────────────────────────────────────────────────
routes.use(authMiddleware);

routes.put('/users', UserController.update);
routes.get('/providers/:providerId/available', AvailableController.index);

routes.get('/appointments', AppointmentController.index);
routes.delete('/appointments/:id', AppointmentController.delete);
routes.post('/appointments', AppointmentController.store);

routes.get('/schedule', ScheduleController.index);

routes.get('/notifications', NotificationController.index);
routes.put('/notifications/:id', NotificationController.update);

routes.post('/files', upload.single('file'), FileController.store);

// ── Admin — reservas del nuevo sistema ───────────────────────────────────────
routes.get('/admin/bookings/stats', AdminBookingController.stats);
routes.get('/admin/bookings/export', AdminBookingController.exportCsv);
routes.get('/admin/bookings', AdminBookingController.index);
routes.get('/admin/bookings/:id', AdminBookingController.show);
routes.post('/admin/bookings/:id/confirm', AdminBookingController.confirmPayment);
routes.patch('/admin/bookings/:id/status', AdminBookingController.updateStatus);

// ── Admin — servicios ─────────────────────────────────────────────────────────
routes.get('/admin/services', AdminServiceController.index);
routes.post('/admin/services', AdminServiceController.store);
routes.put('/admin/services/:id', AdminServiceController.update);

// ── Admin — configuración ─────────────────────────────────────────────────────
routes.get('/admin/settings', AdminSettingController.index);
routes.patch('/admin/settings', AdminSettingController.update);

// ── Admin — sucursales ────────────────────────────────────────────────────────
routes.get('/admin/branches', BranchController.index);
routes.post('/admin/branches', BranchController.store);
routes.put('/admin/branches/:id', BranchController.update);

export default routes;
