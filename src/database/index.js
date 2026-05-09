import Sequelize from 'sequelize';
import moongose from 'mongoose';

import User from '../app/models/User';
import File from '../app/models/File';
import Appointment from '../app/models/Appointment';
import Service from '../app/models/Service';
import GuestCustomer from '../app/models/GuestCustomer';
import Booking from '../app/models/Booking';
import BookingStatusHistory from '../app/models/BookingStatusHistory';
import Payment from '../app/models/Payment';
import PaymentAttempt from '../app/models/PaymentAttempt';
import PaymentWebhook from '../app/models/PaymentWebhook';
import AvailabilityLock from '../app/models/AvailabilityLock';
import BookingNotification from '../app/models/BookingNotification';
import AdminSetting from '../app/models/AdminSetting';
import Branch from '../app/models/Branch';
import databaseConfig from '../config/database';

const models = [
  User,
  File,
  Appointment,
  Service,
  GuestCustomer,
  Booking,
  BookingStatusHistory,
  Payment,
  PaymentAttempt,
  PaymentWebhook,
  AvailabilityLock,
  BookingNotification,
  AdminSetting,
  Branch,
];

class Database {
  constructor() {
    this.init();
    this.mongo();
  }

  init() {
    this.connection = new Sequelize(databaseConfig);

    models
      .map(model => model.init(this.connection))
      .map(model => model.associate && model.associate(this.connection.models));
  }

  mongo() {
    if (!process.env.MONGO_URL) return;
    this.mongoConnection = moongose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useFindAndModify: true,
      useUnifiedTopology: true,
      ssl: true,
      authSource: 'admin',
    }).then(() => console.log('MongoDB connected'))
      .catch(err => console.warn('MongoDB connection failed:', err.message));
  }
}

export default new Database();
