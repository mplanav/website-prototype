require('dotenv').config();

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const nodemailer = require('nodemailer');
const platos = require('./data/platos');
const testimonios = require('./data/testimonios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const fs = require('fs');

const app = express();
app.use(express.static('public'));


function cargarIdioma(lang = 'es') {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', `${lang}.json`), 'utf8'));
  } catch (err) {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'es.json'), 'utf8'));
  }
}

// Middleware para la ruta raíz que carga idioma español por defecto
function middlewareDefault(req, res, next) {
  const lang = 'es'; // idioma por defecto
  req.lang = lang;
  req.langPath = '';
  req.traducciones = cargarIdioma(lang);
  next();
}

// Seguridad
app.use(helmet());
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", 
    "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline';"
  );
  next();
});
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// Configuración Express
app.use(express.urlencoded({ extended: true }));
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Idiomas soportados
const idiomasSoportados = ['es', 'en'];

// Middleware para cargar traducciones y validar idioma para rutas con idioma
function middlewareIdioma(req, res, next) {
  const lang = req.params.lang;
  console.log('Idioma recibido:', lang);
  if (!idiomasSoportados.includes(lang)) {
    return res.status(404).send('Idioma no soportado');
  }
  req.lang = lang;
  req.langPath = lang === 'es' ? '' : `/${lang}`;
  req.traducciones = cargarIdioma(lang);
  next();
}

// Email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const fotos = [
  'images/foto1.jpg',
  'images/foto2.jpg',
];

// --- RUTAS SIN IDIOMA (ESPAÑOL POR DEFECTO) ---


app.get('/', middlewareDefault, (req, res) => {
  res.render('home', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion,
    page: '',
    isHome: true, // Define isHome aquí
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones,
    testimonios
  });
});

app.get('/carta', middlewareDefault, (req, res) => {
  res.render('carta', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion_carta || 'Carta de platos.',
    page: 'carta',
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones,
    platos
  });
});

app.get('/reserva', middlewareDefault, (req, res) => {
  res.render('reserva', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion_reserva || 'Reserva tu mesa.',
    page: 'reserva',
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones
  });
});

app.post('/reserva', middlewareDefault, [
  body('nombre').trim().escape().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('fecha').notEmpty(),
  body('hora').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('personas').isInt({ min: 1, max: 50 }).toInt(),
  body('peticiones').trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).send('Datos inválidos.');

  const { nombre, email, fecha, hora, personas, peticiones } = req.body;
  const fechaHoraISO = `${fecha}T${hora}:00`;
  const fechaCompleta = new Date(fechaHoraISO);

  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  manana.setHours(0, 0, 0, 0);

  if (isNaN(fechaCompleta.getTime()) || fechaCompleta < manana) {
    return res.status(400).send('Fecha y hora inválidas o anteriores a mañana.');
  }

  const mailToRestaurante = {
    from: `"Reservas El Sabor" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `Nueva reserva de ${nombre}`,
    html: `
      <h2>Reserva</h2>
      <p><strong>Nombre:</strong> ${xss(nombre)}</p>
      <p><strong>Email:</strong> ${xss(email)}</p>
      <p><strong>Fecha y hora:</strong> ${fechaCompleta.toLocaleString()}</p>
      <p><strong>Personas:</strong> ${xss(personas)}</p>
      <p><strong>Peticiones:</strong> ${xss(peticiones || 'Ninguna')}</p>
    `
  };

  const mailToCliente = {
    from: `"Restaurante El Sabor" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Confirmación de tu reserva',
    html: `
      <h2>¡Reserva recibida!</h2>
      <p>Hola ${xss(nombre)}, gracias por reservar con nosotros. Esta es una solicitud de reserva, y el restaurante te confirmará pronto:</p>
      <ul>
        <li><strong>Fecha y hora:</strong> ${fechaCompleta.toLocaleString()}</li>
        <li><strong>Personas:</strong> ${xss(personas)}</li>
        <li><strong>Peticiones:</strong> ${xss(peticiones || 'Ninguna')}</li>
      </ul>
      <p>Gracias por tu confianza.</p>
    `
  };

  try {
    await transporter.sendMail(mailToRestaurante);
    await transporter.sendMail(mailToCliente);
    res.render('reserva-confirmacion', {
      title: 'Reserva Confirmada',
      description: `Reserva recibida para ${nombre} el día ${fechaCompleta.toLocaleDateString('es-ES')}.`,
      page: 'reserva',
      lang: req.lang,
      langPath: req.langPath,
      traducciones: req.traducciones,
      nombre,
      personas,
      fechaFormateada: fechaCompleta.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    });
  } catch (error) {
    console.error('Error al enviar email:', error);
    res.status(500).send('Error al enviar la reserva.');
  }
});

app.get('/contacto', middlewareDefault, (req, res) => {
  res.render('contacto', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion_contacto || 'Contáctanos.',
    page: 'contacto',
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones
  });
});

app.post('/contacto', middlewareDefault, [
  body('nombre').trim().escape().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('mensaje').trim().escape().isLength({ min: 5, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).send('Datos inválidos.');

  const { nombre, email, mensaje } = req.body;

  const mailToRestaurante = {
    from: `"Contacto Web Restaurante" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `Mensaje de ${nombre}`,
    html: `
      <h2>Contacto</h2>
      <p><strong>Nombre:</strong> ${xss(nombre)}</p>
      <p><strong>Email:</strong> ${xss(email)}</p>
      <p><strong>Mensaje:</strong><br>${xss(mensaje)}</p>
    `
  };

  const mailToCliente = {
    from: `"Restaurante El Sabor" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Hemos recibido tu mensaje',
    html: `
      <h2>Hola ${xss(nombre)},</h2>
      <p>Gracias por contactar con El Sabor.</p>
      <blockquote>${xss(mensaje)}</blockquote>
      <p>Te responderemos pronto.</p>
    `
  };

  try {
    await transporter.sendMail(mailToRestaurante);
    await transporter.sendMail(mailToCliente);
    res.render('contacto-confirmacion', {
      title: 'Mensaje Enviado',
      description: 'Tu mensaje ha sido enviado correctamente.',
      page: 'contacto',
      lang: req.lang,
      langPath: req.langPath,
      traducciones: req.traducciones,
      nombre
    });
  } catch (error) {
    console.error('Error al enviar email de contacto:', error);
    res.status(500).send('Error al enviar el mensaje.');
  }
});

app.get('/galeria', middlewareDefault, (req, res) => {
  res.render('galeria', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion_galeria || 'Galería de fotos.',
    page: 'galeria',
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones,
    fotos
  });
});

// --- RUTAS CON IDIOMA ('es' o 'en') ---

app.get('/:lang/', middlewareIdioma, (req, res) => {
  res.render('home', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion,
    page: '',
    isHome: true, // Definido aquí también
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones,
    testimonios
  });
});

app.get('/:lang/carta', middlewareIdioma, (req, res) => {
  res.render('carta', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion_carta || 'Carta de platos.',
    page: 'carta',
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones,
    platos
  });
});

app.get('/:lang/reserva', middlewareIdioma, (req, res) => {
  res.render('reserva', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion_reserva || 'Reserva tu mesa.',
    page: 'reserva',
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones
  });
});

app.post('/:lang/reserva', middlewareIdioma, [
  body('nombre').trim().escape().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('fecha').notEmpty(),
  body('hora').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('personas').isInt({ min: 1, max: 50 }).toInt(),
  body('peticiones').trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).send('Datos inválidos.');

  const { nombre, email, fecha, hora, personas, peticiones } = req.body;
  const fechaHoraISO = `${fecha}T${hora}:00`;
  const fechaCompleta = new Date(fechaHoraISO);

  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  manana.setHours(0, 0, 0, 0);

  if (isNaN(fechaCompleta.getTime()) || fechaCompleta < manana) {
    return res.status(400).send('Fecha y hora inválidas o anteriores a mañana.');
  }

  const mailToRestaurante = {
    from: `"Reservas El Sabor" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `Nueva reserva de ${nombre}`,
    html: `
      <h2>Reserva</h2>
      <p><strong>Nombre:</strong> ${xss(nombre)}</p>
      <p><strong>Email:</strong> ${xss(email)}</p>
      <p><strong>Fecha y hora:</strong> ${fechaCompleta.toLocaleString()}</p>
      <p><strong>Personas:</strong> ${xss(personas)}</p>
      <p><strong>Peticiones:</strong> ${xss(peticiones || 'Ninguna')}</p>
    `
  };

  const mailToCliente = {
    from: `"Restaurante El Sabor" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Confirmación de tu reserva',
    html: `
      <h2>¡Reserva recibida!</h2>
      <p>Hola ${xss(nombre)}, gracias por reservar con nosotros. Esta es una solicitud de reserva, y el restaurante te confirmará pronto:</p>
      <ul>
        <li><strong>Fecha y hora:</strong> ${fechaCompleta.toLocaleString()}</li>
        <li><strong>Personas:</strong> ${xss(personas)}</li>
        <li><strong>Peticiones:</strong> ${xss(peticiones || 'Ninguna')}</li>
      </ul>
      <p>Gracias por tu confianza.</p>
    `
  };

  try {
    await transporter.sendMail(mailToRestaurante);
    await transporter.sendMail(mailToCliente);
    res.render('reserva-confirmacion', {
      title: 'Reserva Confirmada',
      description: `Reserva recibida para ${nombre} el día ${fechaCompleta.toLocaleDateString(req.lang)}.`,
      page: 'reserva',
      lang: req.lang,
      langPath: req.langPath,
      traducciones: req.traducciones,
      nombre,
      personas,
      fechaFormateada: fechaCompleta.toLocaleDateString(req.lang, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    });
  } catch (error) {
    console.error('Error al enviar email:', error);
    res.status(500).send('Error al enviar la reserva.');
  }
});

app.get('/:lang/contacto', middlewareIdioma, (req, res) => {
  res.render('contacto', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion_contacto || 'Contáctanos.',
    page: 'contacto',
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones
  });
});

app.post('/:lang/contacto', middlewareIdioma, [
  body('nombre').trim().escape().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('mensaje').trim().escape().isLength({ min: 5, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).send('Datos inválidos.');

  const { nombre, email, mensaje } = req.body;

  const mailToRestaurante = {
    from: `"Contacto Web Restaurante" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `Mensaje de ${nombre}`,
    html: `
      <h2>Contacto</h2>
      <p><strong>Nombre:</strong> ${xss(nombre)}</p>
      <p><strong>Email:</strong> ${xss(email)}</p>
      <p><strong>Mensaje:</strong><br>${xss(mensaje)}</p>
    `
  };

  const mailToCliente = {
    from: `"Restaurante El Sabor" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Hemos recibido tu mensaje',
    html: `
      <h2>Hola ${xss(nombre)},</h2>
      <p>Gracias por contactar con El Sabor.</p>
      <blockquote>${xss(mensaje)}</blockquote>
      <p>Te responderemos pronto.</p>
    `
  };

  try {
    await transporter.sendMail(mailToRestaurante);
    await transporter.sendMail(mailToCliente);
    res.render('contacto-confirmacion', {
      title: 'Mensaje Enviado',
      description: 'Tu mensaje ha sido enviado correctamente.',
      page: 'contacto',
      lang: req.lang,
      langPath: req.langPath,
      traducciones: req.traducciones,
      nombre
    });
  } catch (error) {
    console.error('Error al enviar email de contacto:', error);
    res.status(500).send('Error al enviar el mensaje.');
  }
});

app.get('/:lang/galeria', middlewareIdioma, (req, res) => {
  res.render('galeria', {
    title: req.traducciones.titulo,
    description: req.traducciones.descripcion_galeria || 'Galería de fotos.',
    page: 'galeria',
    lang: req.lang,
    langPath: req.langPath,
    traducciones: req.traducciones,
    fotos
  });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en http://0.0.0.0:${PORT}`);
});
