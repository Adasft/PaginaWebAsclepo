import passport from "passport";
import passportLocal from "passport-local";
import connection from "../database/connection.js";
import bcrypt from "bcrypt";
import globals from "../globals.js";

const LocalStrategy = passportLocal.Strategy;

/**
 * Realiza la autenticación del usuario.
 * @param {string} email - El correo electrónico del usuario.
 * @param {string} password - La contraseña del usuario.
 * @param {function} done - Función de retorno de llamada para indicar el resultado de la autenticación.
 * @returns {undefined}
 */
function authenticator(email, password, done) {
  /**
   * Aquí se realiza una consulta a la base de datos para buscar al usuario en las tablas paciente, doctor y
   * consultorio_medico.admin. La consulta utiliza la cláusula UNION para combinar los resultados de las tres
   * tablas en una única lista.
   */
  connection.query(
    `SELECT uuid, contrasena, tipo_cuenta FROM paciente WHERE correo = ? UNION 
     SELECT uuid, contrasena, tipo_cuenta FROM doctor WHERE correo = ? UNION 
     SELECT uuid, contrasena, tipo_cuenta FROM consultorio_medico.admin WHERE correo = ?`,
    [email, email, email],
    (err, results, fields) => {
      if (err) {
        console.error("Error al buscar el usuario: " + err.stack);
        return;
      }

      // Si hay resultados, el usuario existe
      if (results.length > 0) {
        const user = results[0];
        const type = user.tipo_cuenta;

        // Comprabamos si la contrasena ingresada por el usuario coincide con la que tenemos en la base de datos
        if (bcrypt.compareSync(password, user.contrasena)) {
          globals.isLogged = true;
          globals.userType = type;

          if (type === "user") {
            connection.query(
              "SELECT foto_ruta FROM paciente WHERE uuid=?",
              [user.uuid],
              (_, results) => {
                done(null, {
                  id: user.uuid,
                  type,
                  profilePhotoPath: results[0].foto_ruta,
                });
                globals.userProfilePhotoPath = results[0].foto_ruta;
              }
            );
            return;
          } else {
            return done(null, { id: user.uuid, type });
          }
        } else {
          return done(null, false, { message: "Contrasena invalidad" });
        }
      } else {
        return done(null, false, { message: "Usuario no encontrado" });
      }
    }
  );
}

/**
 * Inicializa la autenticación de Passport.
 * @returns {undefined}
 */
export default function initPassportAuth() {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      authenticator
    )
  );

  // Serializa al usuario para la sesión.
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserializa al usuario para ingresar sus datos en la sesión.
  passport.deserializeUser((id, done) => {
    connection.query(
      "SELECT uuid, tipo_cuenta FROM paciente WHERE uuid = ? UNION SELECT uuid, tipo_cuenta FROM doctor WHERE uuid = ? UNION SELECT uuid, tipo_cuenta FROM consultorio_medico.admin WHERE uuid = ?",
      [id, id, id],
      (err, results, fields) => {
        if (err) {
          console.error("Error al buscar el usuario: " + err.stack);
          return;
        }

        // Si hay resultados, el usuario existe.
        if (results.length > 0) {
          const user = results[0];
          const type = user.tipo_cuenta;

          if (type === "user") {
            connection.query(
              "SELECT foto_ruta FROM paciente WHERE uuid=?",
              [user.uuid],
              (_, results) => {
                done(null, {
                  id: user.uuid,
                  type,
                  profilePhotoPath: results[0].foto_ruta,
                });
              }
            );
          } else {
            return done(null, { id: user.uuid, type });
          }
        } else {
          return done(null, false, { message: "Usuario no encontrado" });
        }
      }
    );
  });
}
