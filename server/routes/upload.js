import { Router } from "express";
import Busboy from "busboy";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import connection from "../database/connection.js";
import globals from "../globals.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const transformPath = (destPath) => {
  return destPath
    .replace(path.join(__dirname, "..", ".."), "")
    .replace(/\\/g, "/");
};

router.post("/", (req, res) => {
  const busboy = Busboy({ headers: req.headers });

  // Manejar evento 'file' cuando se detecta un archivo en la solicitud
  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    // Definir la ubicación y el nombre del archivo en el servidor

    if (!filename.mimeType.startsWith("image/")) {
      res.status(400).json({ error: "Solo se permiten imágenes." });
      file.resume(); // Descartar el archivo
      return;
    }

    const saveTo = path.join(
      __dirname,
      "..",
      "..",
      "public",
      "user",
      "picture",
      "profile",
      `${uuidv4()}__${filename.filename}`
    );

    // Guardar el archivo en el servidor
    file.pipe(fs.createWriteStream(saveTo));

    connection.query(
      "UPDATE paciente SET foto_ruta=? WHERE uuid=?",
      [transformPath(saveTo), req.user.id],
      (err) => {
        if (err) {
          console.error("Error al subir la imagen: ", err.stack);
          return;
        }

        globals.userProfilePhotoPath = transformPath(saveTo);
        // saveGlobalsToDatabase();
      }
    );
  });

  busboy.on("finish", function () {
    res.redirect("/profile");
  });

  return req.pipe(busboy);
});

export default router;
