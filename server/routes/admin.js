import { Router } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import connection from "../database/connection.js";
import globals, { privateGlobals } from "../globals.js";

const router = Router();

/**
  Ruta GET para la página de administración.
  @function
  @name getAdminPage
  @param {object} req - Objeto de solicitud de Express.
  @param {object} res - Objeto de respuesta de Express.
  @returns {void}
*/
router.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user?.type !== "admin") {
      res.redirect("back");
      return;
    }

    res.render("admin", {
      message: privateGlobals.message,
      showFieldMessage: globals.dataUpdateSuccessfullyMessage,
    });
    globals.dataUpdateSuccessfullyMessage = false;
    privateGlobals.message = "";
  } else {
    res.redirect("/login");
  }
});

/**
  Ruta POST para dar de alta a un doctor en el sistema.
  @function
  @name dischargeDoctor
  @param {object} req - Objeto de solicitud de Express.
  @param {object} res - Objeto de respuesta de Express.
  @returns {void}
*/
router.post("/dischargeDoctor", (req, res) => {
  if (!req.isAuthenticated() || req.user.type !== "admin") {
    res.redirect("back");
    return;
  }

  const { name, email, password, specialty } = req.body;

  connection.query(
    "SELECT id_admin AS 'adminId' FROM admin WHERE uuid=?",
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error(err.stack);
        return;
      }
      connection.query(
        "SELECT uuid FROM doctor WHERE correo=?",
        [email],
        (err, results) => {
          if (err) {
            console.error(err.stack);
            return;
          }

          if (results.length) {
            // El correo electrónico ya está registrado, muestra un mensaje de error en el campo correspondiente.
            results[0].email = email;
            res.render("admin", {
              activePage: "",
              data: results[0],
              fieldFocus: "email",
              showMessageFieldFocus: true,
            });
          } else {
            const adminId = results[0].adminId;
            connection.query(
              "INSERT INTO doctor (id_admin, nombre, especialidad, correo, contrasena, tipo_cuenta, uuid) VALUES (?,?,?,?,?,?,?)",
              [
                adminId,
                name,
                specialty,
                email,
                bcrypt.hashSync(password, 10),
                "doctor",
                uuidv4(),
              ],
              (err) => {
                if (err) {
                  console.error(err.stack);
                  return;
                }

                globals.dataUpdateSuccessfullyMessage = true;
                privateGlobals.message =
                  "El doctor ha sido agregado exitosamente.";
                res.redirect("/admin");
              }
            );
          }
        }
      );
    }
  );
});

export default router;
