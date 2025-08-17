# 🍽️ Prototipo web para restaurante

Aplicación web para un restaurante, desarrollada con Node.js, Express, EJS y Tailwind CSS.  
Incluye sistema de reservas, carta digital, testimonios de clientes y páginas de contacto.

---

## 🚀 Stack Tecnológico

- **Backend:** Node.js + Express
- **Motor de vistas:** EJS
- **Estilos:** Tailwind CSS + PostCSS
- **Datos dinámicos:** Archivos JS (`data/platos.js`, `data/testimonios.js`)
- **Frontend assets:** Carpeta `public/` (imágenes, sitemap, robots.txt)
- **Vistas:** Plantillas en `views/` (`home.ejs`, `carta.ejs`, `reserva.ejs`, etc.)

Ejemplo de uso de **Tailwind en las vistas** (`home.ejs`):

```html
<section id="inicio" class="min-h-screen flex flex-col justify-center items-center px-4 py-16 text-center">
  <img src="/images/logo.jpg" alt="Logo" class="w-40 h-40 rounded-full border-4 border-[#3e1f0f]" />
  <h1 class="text-4xl lg:text-5xl font-serif font-bold mb-6 text-[#3e1f0f]">
    <%= traducciones.home.welcomeTitle %>
  </h1>
  <p class="text-gray-700 max-w-2xl mx-auto mb-8 text-lg">
    <%= traducciones.home.descripcion %>
  </p>
  <a href="#reserva" class="bg-[#c1440e] hover:bg-[#a1380c] text-white px-6 py-3 rounded-xl text-lg">
    <%= traducciones.home.reserva %>
  </a>
</section>
```

---

## 📂 Estructura del proyecto

```
.
├── app.js                 # Punto de entrada del servidor Express
├── package.json           # Dependencias del proyecto
├── postcss.config.js      # Configuración de PostCSS
├── tailwind.config.js     # Configuración de TailwindCSS
│
├── data/                  # Datos en JS
│   ├── platos.js
│   └── testimonios.js
│
├── public/                # Archivos estáticos
│   ├── images/
│   ├── robots.txt
│   └── sitemap.xml
│
├── src/
│   └── input.css          # Entrada de estilos Tailwind
│
└── views/                 # Plantillas EJS
    ├── home.ejs
    ├── carta.ejs
    ├── contacto.ejs
    ├── contacto.confirmacion.ejs
    ├── galeria.ejs
    ├── layout.ejs
    ├── reserva.ejs
    ├── reserva-confirmacion.ejs
    └── testimonios.ejs
```

---

## ⚙️ Instalación y uso

1. Clona este repositorio:
   ```bash
   git clone git@github.com:TU_USUARIO/elbrases-prod.git
   cd elbrases-prod
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Ejecuta el servidor en desarrollo:
   ```bash
   npm run dev
   ```

4. Abre en tu navegador:
   ```
   http://localhost:3000
   ```

---

## 📸 Funcionalidades principales

- ✅ Carta digital dinámica (`/carta`)  
- ✅ Sistema de reservas (`/reserva`)  
- ✅ Página de testimonios (`/testimonios`)  
- ✅ Sección de contacto con confirmación  
- ✅ Estilos modernos con **Tailwind CSS**  
- ✅ SEO básico (`robots.txt`, `sitemap.xml`)  

---

## 🔒 Notas

- Recuerda crear un archivo `.env` para variables sensibles (ej: puerto, credenciales, API keys).  
- Archivos grandes (videos, data de producción) están excluidos en `.gitignore`.  

---