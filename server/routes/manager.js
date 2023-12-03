import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";
import connection from "../database/connection.js";
import globals, { privateGlobals } from "../globals.js";

const router = Router();

/**
 * Manejador de ruta para crear una nueva cita.
 * @name POST /new
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.post("/new", (req, res) => {
  // Verifica si el usuario está autenticado y si su tipo de usuario es "doctor". Si no cumple con estas condiciones, redirige a la página anterior.
  if (!req.isAuthenticated() || req.user.type !== "doctor") {
    res.redirect("back");
    return;
  }

  // Obtiene los datos de fecha, hora y ID del servicio de la solicitud.
  const { date, time, serviceId } = req.body;

  // Valida el formato de la fecha y la hora utilizando expresiones regulares.
  if (
    !/^(\d{4})-(\d{2})-(\d{2})$/.test(date) ||
    !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)
  ) {
    res.redirect("/manager");
    return;
  }

  // Formatea la fecha y hora en el formato necesario para la base de datos.
  const formatDate = `${date}T${time}:00`;

  // Obtiene el ID del doctor a partir del ID de usuario autenticado.
  connection.query(
    "SELECT id_doctor AS id FROM doctor WHERE uuid=?",
    req.user.id,
    (err, results) => {
      const { id: doctorId } = results[0];

      // Obtiene el ID del servicio a partir del ID del doctor y el ID del servicio proporcionado.
      connection.query(
        "SELECT id_servicio AS serviceId FROM servicio, doctor WHERE doctor.id_doctor=? AND servicio.id_servicio=?",
        [doctorId, serviceId],
        (err, results) => {
          if (err) {
            console.error(err.stack);
            return;
          }

          // Verifica si el resultado de la consulta es vacío, lo que indica que el servicio no existe.
          if (!results.length) {
            res.send({ code: 1 }); // El servicio no existe
            return;
          }

          const { serviceId } = results[0];

          // Verifica si ya existe una cita en la misma fecha y hora para el doctor.
          connection.query(
            `
            SELECT IF(COUNT(cita.id_cita) > 0, TRUE, FALSE) AS exits
              FROM cita
              INNER JOIN servicio ON cita.id_servicio = servicio.id_servicio
              WHERE cita.fecha = ?
              AND servicio.id_doctor = ?;`,
            [formatDate, doctorId],
            (err, results) => {
              if (err) {
                console.error(err.stack);
                return;
              }

              const exits = results[0].exits;

              if (exits) {
                res.send({ code: 2 }); // Ya existe la fecha
                return;
              }

              if (moment(formatDate).isBefore(moment())) {
                res.send({ code: 3 }); // La fecha de la cita es anterior al día de hoy
                return;
              }

              // Verifica si la nueva fecha se acopla con alguna fecha existente en la base de datos con una diferencia de 30 minutos o menos.
              connection.query(
                `
                SELECT fecha AS date
                  FROM cita, servicio
                  WHERE servicio.id_doctor = ?;
              `,
                [doctorId],
                (err, results) => {
                  if (err) {
                    console.error(err.stack);
                    return;
                  }

                  let mate = false,
                    dateAdded,
                    existingDate;
                  for (let result of results) {
                    const diff = moment(formatDate).diff(
                      moment(result.date),
                      "minutes"
                    );
                    if (Math.abs(diff) <= 30) {
                      mate = true;
                      dateAdded = moment(formatDate).format("YYYY-MM-DD HH:mm");
                      existingDate = moment(result.date).format(
                        "YYYY-MM-DD HH:mm"
                      );
                      break;
                    }
                  }

                  if (mate) {
                    res.send({ code: 5, dateAdded, existingDate }); // La fecha se acopla con al menos una fecha existente en la base de datos
                    return;
                  }

                  // Inserta la nueva cita en la base de datos.
                  connection.query(
                    "INSERT INTO cita (id_servicio, fecha, estado, uuid) VALUES (?, ?, ?, ?)",
                    [serviceId, formatDate, 1, uuidv4()],
                    (err, results) => {
                      if (err) {
                        console.error(err.stack);
                        return;
                      }
                      globals.dataUpdateSuccessfullyMessage = true;
                      privateGlobals.message =
                        "La cita se agregó correctamente.";
                      res.send({ code: 4 }); // Todo salió ok
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

/**
 * Manejador de ruta para editar una cita existente.
 * @name PUT /edit
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.put("/edit", (req, res) => {
  // Verifica si el usuario está autenticado y si su tipo de usuario es "doctor". Si no cumple con estas condiciones, redirige a la página anterior.
  if (!req.isAuthenticated() || req.user.type !== "doctor") {
    res.redirect("back");
    return;
  }

  // Obtiene los datos de fecha, hora, ID del servicio, UUID y precio del servicio de la solicitud.
  const { date, time, serviceId, uuid, servicePrice } = req.body;

  // Valida el formato de la fecha y la hora utilizando expresiones regulares.
  if (
    !/^(\d{4})-(\d{2})-(\d{2})$/.test(date) ||
    !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)
  ) {
    res.redirect("/manager");
    return;
  }

  // Formatea la fecha y hora en el formato necesario para la base de datos.
  const formatDate = `${date}T${time}:00`;

  // Obtiene el ID del doctor a partir del ID de usuario autenticado.
  connection.query(
    "SELECT id_doctor AS id FROM doctor WHERE uuid=?",
    req.user.id,
    (err, results) => {
      const { id: doctorId } = results[0];

      // Obtiene el ID del servicio a partir del ID del doctor y el ID del servicio proporcionado.
      connection.query(
        "SELECT id_servicio AS serviceId FROM servicio, doctor WHERE doctor.id_doctor=? AND servicio.id_servicio=?",
        [doctorId, serviceId],
        (err, results) => {
          if (err) {
            console.error(err.stack);
            return;
          }

          // Verifica si el resultado de la consulta es vacío, lo que indica que el servicio no existe.
          if (!results.length) {
            res.send({ code: 1 }); // El servicio no existe
            return;
          }

          const { serviceId } = results[0];

          // Verifica si ya existe una cita en la misma fecha y hora para el doctor.
          connection.query(
            `
            SELECT IF(COUNT(cita.id_cita) > 0, TRUE, FALSE) AS exits
              FROM cita
              INNER JOIN servicio ON cita.id_servicio = servicio.id_servicio
              WHERE cita.fecha = ?
              AND servicio.id_doctor = ?;`,
            [formatDate, doctorId],
            (err, results) => {
              if (err) {
                console.error(err.stack);
                return;
              }

              const exits = results[0].exits;

              if (exits) {
                res.send({ code: 2 }); // Ya existe la fecha
                return;
              }

              if (moment(formatDate).isBefore(moment())) {
                res.send({ code: 3 }); // La fecha de la cita es anterior al día de hoy
                return;
              }

              // Actualiza la cita en la base de datos con los nuevos datos proporcionados.
              connection.query(
                "UPDATE cita SET id_servicio=?, fecha=? WHERE uuid=?",
                [serviceId, formatDate, uuid],
                (err, results) => {
                  if (err) {
                    console.error(err.stack);
                    return;
                  }
                  connection.query(
                    "UPDATE servicio SET precio=? WHERE id_servicio=?",
                    [Number(servicePrice), serviceId],
                    (err) => {
                      if (err) {
                        console.error(err.stack);
                        return;
                      }
                      globals.dataUpdateSuccessfullyMessage = true;
                      privateGlobals.message =
                        "La cita se actualizó correctamente.";
                      res.send({ code: 4 });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

/**
 * Manejador de ruta para eliminar una cita.
 * @name POST /delete/:id
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.post("/delete/:id", (req, res) => {
  // Verifica si el usuario está autenticado y si su tipo de usuario es "doctor". Si no cumple con estas condiciones, redirige a la página anterior.
  if (!req.isAuthenticated() || req.user.type !== "doctor") {
    res.redirect("back");
    return;
  }

  // Obtiene el ID de la cita de los parámetros de la solicitud.
  const { id } = req.params;

  // Elimina la cita de la base de datos utilizando el UUID.
  connection.query("DELETE FROM cita WHERE uuid=?", [id], (err) => {
    if (err) {
      console.error(err.stack);
      return;
    }

    globals.dataUpdateSuccessfullyMessage = true;
    privateGlobals.message = "La cita se eliminó correctamente.";
    res.send({ code: 4 });
  });
});

/**
 * Manejador de ruta para agregar un nuevo servicio.
 * @name POST /new/service
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.post("/new/service", (req, res) => {
  // Verifica si el usuario está autenticado y si su tipo de usuario es "doctor". Si no cumple con estas condiciones, redirige a la página de inicio de sesión.
  if (!req.isAuthenticated() || req.user.type !== "doctor") {
    res.redirect("/login");
    return;
  }

  // Obtiene el nombre y el precio del servicio de la solicitud.
  const { service, price } = req.body;

  // Obtiene el ID del doctor a partir del ID de usuario autenticado.
  connection.query(
    'SELECT id_doctor AS "idDoctor" FROM doctor WHERE uuid=?',
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error(err.stack);
        return;
      }
      const doctorId = results[0].idDoctor;
      const serviceNFD = service
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      // Verifica si el servicio ya está agregado para el doctor.
      connection.query(
        "SELECT tipo AS 'serviceType' FROM servicio WHERE servicio.id_doctor=? AND tipo_nfd=?",
        [doctorId, serviceNFD],
        (err, results) => {
          if (err) {
            console.error(err.stack);
            return;
          }

          if (results.length) {
            globals.dataUpdateSuccessfullyMessage = true;
            privateGlobals.message = `El servicio '${results[0].serviceType}' ya se encuentra agregado.`;
            privateGlobals.typeMessage = "warning";
            res.redirect("/manager/services");
            return;
          }

          // Agrega el nuevo servicio a la base de datos.
          connection.query(
            `INSERT INTO servicio (id_doctor, tipo, tipo_nfd, precio) VALUES (?,?,?,?)`,
            [doctorId, service, serviceNFD, price],
            (err, _) => {
              if (err) {
                console.error(err.stack);
                return;
              }
              globals.dataUpdateSuccessfullyMessage = true;
              privateGlobals.message = "El servicio se agregó correctamente.";
              privateGlobals.typeMessage = "successfull";
              res.redirect("/manager/services");
            }
          );
        }
      );
    }
  );
});

/**
 * Manejador de ruta para editar un servicio existente.
 * @name PUT /edit/service/:id
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.put("/edit/service/:id", (req, res) => {
  // Verifica si el usuario está autenticado y si su tipo de usuario es "doctor". Si no cumple con estas condiciones, redirige a la página anterior.
  if (!req.isAuthenticated() || req.user.type !== "doctor") {
    res.redirect("back");
    return;
  }

  // Obtiene el precio actualizado del servicio de la solicitud y el ID del servicio de los parámetros de la solicitud.
  const { price } = req.body;
  const { id } = req.params;

  // Actualiza el precio del servicio en la base de datos utilizando el ID del servicio.
  connection.query(
    "UPDATE servicio SET precio=? WHERE id_servicio=?",
    [price, id],
    (err) => {
      if (err) {
        console.error(err.stack);
        return;
      }

      res.send({ code: 4 });
    }
  );
});

/**
 * Manejador de ruta para eliminar un servicio.
 * @name DELETE /delete/service/:id
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.delete("/delete/service/:id", (req, res) => {
  // Verifica si el usuario está autenticado y si su tipo de usuario es "doctor". Si no cumple con estas condiciones, redirige a la página anterior.
  if (!req.isAuthenticated() || req.user.type !== "doctor") {
    res.redirect("back");
    return;
  }

  // Obtiene el ID del servicio de los parámetros de la solicitud.
  const { id } = req.params;

  // Elimina el servicio de la base de datos utilizando el ID del servicio.
  connection.query("DELETE FROM servicio WHERE id_servicio=?", [id], (err) => {
    if (err) {
      console.error(err.stack);
      return;
    }
    res.send({ code: 4 });
  });
});

/**
 * Manejador de ruta para obtener la cantidad de citas para un servicio específico.
 * @name GET /service/appointment
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.get("/service/appointment", (req, res) => {
  // Verifica si el usuario está autenticado y si su tipo de usuario es "doctor". Si no cumple con estas condiciones, redirige a la página anterior.
  if (!req.isAuthenticated() || req.user.type !== "doctor") {
    res.redirect("back");
    return;
  }

  // Obtiene el ID del servicio de los parámetros de la solicitud.
  const { id } = req.query;

  // Obtiene la cantidad de citas para el servicio específico utilizando el ID del servicio.
  connection.query(
    "SELECT COUNT(*) AS 'count' FROM cita WHERE cita.id_servicio=?",
    [id],
    (err, results) => {
      if (err) {
        console.error(err.stack);
        return;
      }

      res.send({ count: results[0].count });
    }
  );
});

export default router;
