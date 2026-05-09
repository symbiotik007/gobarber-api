import nodemailer from 'nodemailer';
import { resolve } from 'path';
import { lookup } from 'dns';
import exphbs from 'express-handlebars';
import nodemailerhbs from 'nodemailer-express-handlebars';
import mailConfig from '../config/mail';

function resolveHost(hostname) {
  return new Promise(r => {
    lookup(hostname, (err, addr) => r(err ? hostname : addr));
  });
}

function buildTransporter(host) {
  const { port, secure, auth } = mailConfig;
  const viewPath = resolve(__dirname, '..', 'app', 'views', 'emails');

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure,
    auth: auth.user ? auth : null,
    tls: { rejectUnauthorized: false },
  });

  transporter.use(
    'compile',
    nodemailerhbs({
      viewEngine: exphbs.create({
        layoutsDir: resolve(viewPath, 'layouts'),
        partialsDir: resolve(viewPath, 'partials'),
        defaultLayout: 'default',
        extname: '.hbs',
      }),
      viewPath,
      extName: '.hbs',
    })
  );

  return transporter;
}

class Mail {
  constructor() {
    // Transporter síncrono con hostname crudo como fallback
    this._transporter = buildTransporter(mailConfig.host);

    // Reemplaza con IP resuelta por getaddrinfo (OS DNS) para evitar
    // queryA ECONNREFUSED en Windows donde Node dns.resolve usa UDP:53
    resolveHost(mailConfig.host).then(ip => {
      if (ip !== mailConfig.host) {
        this._transporter = buildTransporter(ip);
      }
    });
  }

  sendMail(message) {
    return this._transporter.sendMail({
      ...mailConfig.default,
      ...message,
    });
  }
}

export default new Mail();
