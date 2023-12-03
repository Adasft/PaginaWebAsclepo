import * as dotenv from "dotenv";
import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";
import router from "./routes/routes.js";
import managerRouter from "./routes/manager.js";
import apiRouter from "./routes/api.js";
import uploadRouter from "./routes/upload.js";
import adminRouter from "./routes/admin.js";
import initPassportAuth from "./authentication/auth.js";
import globals from "./globals.js";

// Importar helpers de handlebars
import "./handlebars/helpers.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configurar motor de renderizado de vistas
app.engine("handlebars", engine());

// Configurar variables globales del servidor
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));
app.set("port", process.env.PORT || 3000);

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SECRET_KEY_FOR_EXPRESS_SESSION,
    resave: false,
    saveUninitialized: false,
    cookie: {
      //expires: 60000,
      expires: 3600000, // Se cierra la sesion despues de una hora
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Inicializar autenticación con passport
initPassportAuth();

// Establecer directorio de archivos estáticos
app.use(
  "/public",
  express.static(path.join(__dirname, "..", "public"), {
    setHeaders: function (res, path) {
      if (path.endsWith(".css")) {
        res.set("Content-Type", "text/css");
      } else if (path.endsWith(".svg")) {
        res.set("Content-Type", "image/svg+xml");
      }
    },
  })
);

// Definir rutas
app.use("/", router);
app.use("/admin", adminRouter);
app.use("/manager/api", managerRouter);
app.use("/calendar/api", apiRouter);
app.use("/upload", uploadRouter);

// Middleware para establecer valores en objeto globals
app.use(function (req, res, next) {
  if (req.isAuthenticated()) {
    if ((globals.userType = req.user.type) === "user") {
      globals.userProfilePhotoPath = req.user.profilePhotoPath;
    }
  } else {
    globals.isLogged = false;
    globals.userType = "";
  }
  // saveGlobalsToDatabase();
  next();
});

// Ruta para manejar solicitudes a rutas no definidas
app.use(function (req, res, next) {
  res.render("404");
});

// Iniciar servidor
app.listen(app.get("port"), () => {
  console.log(`Servidor iniciado en http://localhost:${app.get("port")}`);
});
