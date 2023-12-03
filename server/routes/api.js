import { Router } from "express";
import connection from "../database/connection.js";
import moment from "moment";

const router = Router();
/**
  Consulta para obtener todas las citas agendadas.
  @constant {string}
*/
const queryScheduledAppointments = `
select 
  cita.uuid as "id",
  paciente.uuid as "user",
  cita.estado as "status", 
  cita.fecha as "start", 
  servicio.tipo as "service",
  doctor.nombre as "doctor"
from 
  citas_agendadas, cita, servicio, paciente, doctor
where 
  citas_agendadas.id_cita = cita.id_cita AND 
  citas_agendadas.id_paciente = paciente.id_paciente AND
  servicio.id_servicio = cita.id_servicio AND 
  doctor.id_doctor=servicio.id_doctor;
`;

/**
  Consulta para obtener una cita agendada específica para un paciente.
  @constant {string}
*/
const queryScheduledOneAppointment = `
select 
  cita.uuid as "id",
  paciente.uuid as "user",
  cita.estado as "status", 
  cita.fecha as "start", 
  servicio.tipo as "service",
  servicio.precio as "price",
  doctor.nombre as "doctor"
from 
  citas_agendadas, cita, servicio, paciente, doctor
where 
  paciente.uuid = ? AND
  citas_agendadas.id_cita = cita.id_cita AND 
  citas_agendadas.id_paciente = paciente.id_paciente AND
  servicio.id_servicio = cita.id_servicio AND 
  doctor.id_doctor=servicio.id_doctor;
`;

/**
  Consulta para obtener todas las citas para un calendario.
  @constant {string}
*/
const queryCalendarAppointments = `
SELECT cita.uuid AS "id",
       CASE
           WHEN citas_agendadas.id_paciente = ? THEN 1
           ELSE 0
       END AS _owner,
       cita.estado AS "status",
       cita.fecha AS "start",
       servicio.tipo AS "service",
       servicio.precio AS "price",
       doctor.nombre AS "doctor"
FROM cita
JOIN servicio ON servicio.id_servicio = cita.id_servicio
JOIN doctor ON doctor.id_doctor = servicio.id_doctor
LEFT JOIN citas_agendadas ON citas_agendadas.id_cita = cita.id_cita;
`;

/**
  Consulta para obtener una cita específica para un calendario.
  @constant {string}
*/
const queryCalendarOneAppointment = `
select 
	cita.uuid as "id",
 	cita.estado as "status", 
	cita.fecha as "start",      
	servicio.tipo as "service",
	doctor.nombre as "doctor"
from 
  cita, servicio, doctor
where 
  cita.uuid = ? AND
 	servicio.id_servicio = cita.id_servicio AND 
	doctor.id_doctor=servicio.id_doctor;
`;

/**
  Manejador de ruta para obtener las citas del usuario.
  @name GET /appointments
  @function
  @memberof module:rutas
  @param {Object} req - Objeto de solicitud express.
  @param {Object} res - Objeto de respuesta express.
  @returns {undefined}
  @throws {Error} Redirige al usuario si no está autenticado o si no es un usuario regular.
*/
router.get("/appointments", (req, res) => {
  // Verifica si el usuario no está autenticado y lo redirige a la página de inicio
  if (!req.isAuthenticated()) {
    res.redirect("/");
    return;
  }

  // Verifica si el usuario no es un usuario regular y lo redirige a la página de inicio
  if (req.user.type !== "user") return res.redirect("/");

  // Consulta el id del paciente asociado al usuario actual
  connection.query(
    "SELECT id_paciente FROM paciente WHERE uuid=?",
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error("Error al realizar la búsqueda: " + err.stack);
        return;
      }

      // Consulta las citas del calendario del paciente utilizando el id del paciente
      connection.query(
        queryCalendarAppointments,
        [results[0].id_paciente],
        (err, results) => {
          if (err) {
            console.error("Error al realizar la búsqueda: " + err.stack);
            return;
          }

          // Modifica el estado de las citas según ciertas condiciones
          res.send(
            results.map((result) => {
              if (result._owner === 0 && result.status === 2) {
                result.status = 3;
              }
              if (moment(result.start).isBefore(moment())) {
                result.status = 4;
              }
              return result;
            })
          );
        }
      );
    }
  );
});

/**
 * Manejador de ruta para obtener una cita específica.
 * @name GET /appointments/:id
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 * @throws {Error} Redirige al usuario si no está autenticado.
 */
router.get("/appointments/:id", (req, res) => {
  // Verifica si el usuario no está autenticado y lo redirige a la página de inicio
  if (!req.isAuthenticated()) {
    res.redirect("/");
    return;
  }

  const id = req.params.id;
  // Consulta la información de una cita específica utilizando el id proporcionado
  connection.query(queryCalendarOneAppointment, [id], (err, results) => {
    if (err) {
      console.error("Error al realizar la búsqueda: " + err.stack);
      return;
    }

    // Envía la primera cita encontrada como respuesta al cliente
    res.send(results[0]);
  });
});

/**
 * Manejador de ruta para actualizar una cita.
 * @name PUT /appointments/:id
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 * @throws {Error} Redirige al usuario si no está autenticado.
 */
router.put("/appointments/:id", (req, res) => {
  // Verifica si el usuario no está autenticado y lo redirige a la página de inicio
  if (!req.isAuthenticated()) {
    res.redirect("/");
    return;
  }

  const id = req.params.id;
  const { status, service, date } = req.query;

  // Actualiza el estado de la cita si se proporciona el parámetro "status"
  if (status) {
    connection.query("UPDATE cita SET estado=? WHERE uuid=?;", [status, id]);
  }

  // Actualiza el tipo de servicio de la cita si se proporciona el parámetro "service"
  if (service) {
    connection.query(
      "UPDATE servicio, cita SET tipo=? WHERE cita.id_servicio=servicio.id_servicio AND cita.uuid=?;",
      [service, id]
    );
  }

  // Actualiza la fecha de la cita si se proporciona el parámetro "date"
  if (date) {
    connection.query("UPDATE cita SET fecha=? WHERE uuid=?;", [date, id]);
  }

  // Envía una respuesta indicando los campos actualizados correctamente
  res.send(
    `Campos actualizados correctamente: status=${status}, service=${service}, date=${date}`
  );
});

/**
 * Manejador de ruta para obtener las citas agendadas.
 * @name GET /scheduled
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 * @throws {Error} Redirige al usuario si no está autenticado.
 */
router.get("/scheduled", (req, res) => {
  // Verifica si el usuario no está autenticado y lo redirige a la página de inicio
  if (!req.isAuthenticated()) {
    res.redirect("/");
    return;
  }

  // Realiza una consulta para obtener las citas agendadas
  connection.query(queryScheduledAppointments, (err, results) => {
    if (err) {
      console.error("Error al realizar la búsqueda: " + err.stack);
      return;
    }

    // Envía los resultados de la consulta como respuesta
    res.send(results);
  });
});

/**
 * Manejador de ruta para obtener una cita agendada específica.
 * @name GET /scheduled/:id
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.get("/scheduled/:id", (req, res) => {
  // Obtiene el ID de la cita de los parámetros de la solicitud
  const id = req.params.id;

  // Realiza una consulta para obtener la cita agendada especificada por el ID
  connection.query(queryScheduledOneAppointment, [id], (err, results) => {
    if (err) {
      console.error("Error al realizar la búsqueda: " + err.stack);
      return;
    }

    // Envía los resultados de la consulta como respuesta
    res.send(results);
  });
});

/**
 * Manejador de ruta para cancelar una cita agendada.
 * @name DELETE /scheduled/cancel/:id
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.delete("/scheduled/cancel/:id", (req, res) => {
  // Verifica si el usuario está autenticado
  if (!req.isAuthenticated()) {
    res.redirect("/");
    return;
  }

  // Verifica si el tipo de usuario es "user" y redirige en caso contrario
  if (req.user.type !== "user") return res.redirect("/");

  // Obtiene el ID de la cita de los parámetros de la solicitud
  const id = req.params.id;

  // Realiza una consulta para obtener el ID de la cita asociada al ID de la cita agendada
  connection.query(
    "SELECT id_cita FROM cita WHERE uuid=?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error al realizar la búsqueda: " + err.stack);
        return;
      }

      // Realiza una consulta para eliminar la cita agendada utilizando el ID de la cita
      connection.query(
        "DELETE FROM citas_agendadas WHERE id_cita=?;",
        [results[0].id_cita],
        (err) => {
          if (err) {
            console.error("Error al realizar la búsqueda: " + err.stack);
            return;
          }

          // Envía una respuesta indicando que el registro ha sido eliminado correctamente
          res.send({
            message: "Registro eliminado correctamente",
            status: "Successful",
          });
        }
      );
    }
  );
});

/**
 * Manejador de ruta para agendar una nueva cita.
 * @name POST /scheduled/new/:id
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.post("/scheduled/new/:id", (req, res) => {
  // Verifica si el usuario está autenticado
  if (!req.isAuthenticated()) {
    res.redirect("/");
    return;
  }

  // Verifica si el tipo de usuario es "user" y redirige en caso contrario
  if (req.user.type !== "user") return res.redirect("/");

  // Obtiene el ID de la cita de los parámetros de la solicitud
  const id = req.params.id;

  // Realiza una consulta para obtener el ID de la cita y el ID del paciente asociados al ID de la cita y al ID del usuario autenticado
  connection.query(
    "SELECT id_cita, id_paciente FROM cita, paciente WHERE cita.uuid=? AND paciente.uuid=?",
    [id, req.user.id],
    (err, results) => {
      if (err) {
        console.error("Error al realizar la búsqueda: " + err.stack);
        return;
      }

      // Realiza una consulta para insertar una nueva cita agendada utilizando el ID de la cita y el ID del paciente
      connection.query(
        "INSERT INTO citas_agendadas (id_cita, id_paciente) VALUES (?, ?);",
        [results[0].id_cita, results[0].id_paciente],
        (err) => {
          if (err) {
            console.error("Error al realizar la búsqueda: " + err.stack);
            return;
          }

          // Envía una respuesta indicando que la cita ha sido agendada correctamente
          res.send({
            message: "Cita agendada correctamente.",
            status: "Successful",
          });
        }
      );
    }
  );
});

export default router;
