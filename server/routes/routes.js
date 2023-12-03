import { Router } from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import moment from "moment";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import connection from "../database/connection.js";
import globals, { privateGlobals } from "../globals.js";

const router = Router();

// La función getUserData toma como argumentos un id y una función de devolución de llamada cb.
// La función ejecuta una consulta SQL para seleccionar los datos del usuario con el uuid igual al valor de id.
// Si ocurre un error durante la ejecución de la consulta, se registra en la consola. Si la consulta se ejecuta
// correctamente, se llama a la función cb con los resultados de la consulta.
const getUserData = (id, cb) => {
  connection.query(
    "SELECT concat(nombre, ' ', apellido) AS username, correo AS email, curp, telefono AS phone, genero AS gender, edad AS age FROM paciente WHERE uuid=?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error al cargar los datos: ", err.stack);
        return;
      }
      cb(results);
    }
  );
};

// El controlador de ruta para la solicitud GET a la ruta / registra en la consola el valor de req.user
// y renderiza la vista home con el objeto { activePage: "home" }.
router.get("/", (req, res) => {
  console.log(req.user);
  res.render("home", {
    activePage: "home",
  });
});

// El controlador de ruta para la solicitud GET a la ruta /contact verifica si el tipo de usuario es "admin".
// Si es así, redirige al usuario a la ruta /. Si no es así, renderiza la vista contact con el objeto
// { activePage: "contact" }.
router.get("/contact", (req, res) => {
  if (req.user?.type === "admin") {
    res.redirect("/");
    return;
  }

  res.render("contact", {
    activePage: "contact",
  });
});

// El controlador de ruta para la solicitud GET a la ruta /about verifica si el tipo de usuario es "admin".
// Si es así, redirige al usuario a la ruta /. Si no es así, renderiza la vista about con el objeto
// { activePage: "about" }.
router.get("/about", (req, res) => {
  if (req.user?.type === "admin") {
    res.redirect("/");
    return;
  }

  res.render("about", {
    activePage: "about",
  });
});

// El controlador de ruta para la solicitud GET a la ruta /calendar verifica si el usuario está autenticado.
// Si está autenticado y su tipo es "user", renderiza la vista calendar con el objeto { activePage: "calendar" }.
// Si no está autenticado o su tipo no es "user", redirige al usuario a la ruta /login o a la página anterior.
router.get("/calendar", (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.type !== "user") {
      res.redirect("back");
      return;
    }

    res.render("calendar", {
      activePage: "calendar",
    });
  } else {
    res.redirect("/login");
  }
});

// El controlador de ruta para la solicitud GET a la ruta /signup verifica si el usuario está autenticado.
//Si está autenticado, redirige al usuario a la ruta /calendar. Si no está autenticado, renderiza la vista signup.
router.get("/signup", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/calendar");
  } else {
    res.render("signup");
  }
});

/**
 * Manejador de ruta para el registro de un nuevo usuario.
 * @name POST /signup
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @param {Function} next - Siguiente middleware en la cadena.
 * @returns {undefined}
 */
router.post("/signup", (req, res, next) => {
  const data = req.body;

  // Verifica si los campos requeridos están presentes y si cumplen con el formato esperado.
  if (
    !data.email ||
    !data.name ||
    !data.lastname ||
    !data.password ||
    !data.birthdate ||
    !data.gender ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
    !/[A-Z]{4}[0-9]{6}[H,M][A-Z]{5}[A-Z0-9]{2}/.test(data.curp) ||
    !/^[0-9]{10}$/.test(data.phone)
  ) {
    return res.render("signup", {
      message: "Por favor verifica que los campos sean correctos.",
    });
  }

  // Genera un UUID único para el usuario y encripta la contraseña.
  const uuid = uuidv4();
  const password = bcrypt.hashSync(data.password, 10);

  // Crea un objeto de usuario con los datos proporcionados.
  const user = {
    uuid,
    password,
    email: data.email,
    name: data.name,
    lastname: data.lastname,
    age: moment().diff(data.birthdate, "years"),
    gender: data.gender,
    phone: data.phone,
    curp: data.curp,
    typeAccount: "user",
    profilePhotoPath: "/public/user/picture/default/default.png",
  };

  // Verifica si el correo electrónico ya está registrado en la base de datos.
  connection.query(
    "SELECT uuid FROM paciente WHERE correo=?",
    [data.email],
    (err, results) => {
      if (err) {
        console.error(err.stack);
        return;
      }

      if (results.length) {
        // El correo electrónico ya está registrado, muestra un mensaje de error en el campo correspondiente.
        results[0].email = data.email;
        res.render("signup", {
          activePage: "",
          data: results[0],
          fieldFocus: "email",
          showMessageFieldFocus: true,
        });
      } else {
        // Verifica si el número de teléfono ya está registrado en la base de datos.
        connection.query(
          "SELECT uuid FROM paciente WHERE telefono=?",
          [data.phone],
          (err, results) => {
            if (err) {
              console.error(err.stack);
              return;
            }

            if (results.length) {
              // El número de teléfono ya está registrado, muestra un mensaje de error en el campo correspondiente.
              results[0].phone = data.phone;
              res.render("signup", {
                activePage: "",
                data: results[0],
                fieldFocus: "phone",
                showMessageFieldFocus: true,
              });
            } else {
              // Verifica si el CURP ya está registrado en la base de datos.
              connection.query(
                "SELECT curp FROM paciente WHERE curp=?",
                [data.curp],
                (err, results) => {
                  if (results.length) {
                    // El CURP ya está registrado, muestra un mensaje de error en el campo correspondiente.
                    results[0].curp = data.curp;
                    res.render("signup", {
                      activePage: "",
                      data: results[0],
                      fieldFocus: "curp",
                      showMessageFieldFocus: true,
                    });
                  } else {
                    // Inserta el nuevo usuario en la base de datos.
                    connection.query(
                      `INSERT INTO paciente (curp, correo, telefono, nombre, apellido, contrasena, edad, genero, uuid, tipo_cuenta, foto_ruta) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                      [
                        user.curp,
                        user.email,
                        user.phone,
                        user.name,
                        user.lastname,
                        user.password,
                        user.age,
                        user.gender,
                        user.uuid,
                        user.typeAccount,
                        user.profilePhotoPath,
                      ],
                      (err) => {
                        if (err) {
                          console.error(
                            "Error al insertar el usuario: " + err.stack
                          );
                          return;
                        }
                        res.redirect("/login");
                      }
                    );
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

// El controlador de ruta para la solicitud GET a la ruta /login verifica si el usuario está autenticado.
// Si está autenticado, redirige al usuario a la ruta /calendar. Si no está autenticado, renderiza la vista login.
router.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/calendar");
  } else {
    res.render("login");
  }
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      // Manejo del error
      return next(err);
    }
    if (!user) {
      // Autenticación fallida, redirige a la página de inicio de sesión
      return res.redirect("/login");
    }
    // Autenticación exitosa, establece la sesión del usuario
    req.logIn(user, (err) => {
      if (err) {
        // Manejo del error
        return next(err);
      }
      // Redirige al usuario a la página deseada

      return res.redirect(
        user.type === "admin"
          ? "/admin"
          : user.type === "doctor"
          ? "/manager"
          : "/profile"
      );
    });
  })(req, res, next);
});

// El controlador de ruta para la solicitud GET a la ruta /logout llama a la función req.logout para
// cerrar sesión del usuario. Si ocurre un error durante el cierre de sesión, se llama a la función
// next con el error. Si el cierre de sesión se realiza correctamente, se redirige al usuario a la
// ruta /login y se establecen varios valores en el objeto globals.
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
    globals.isLogged = false;
    globals.userType = "";
    globals.userProfilePhotoPath = "";
    globals.editEnabled = false;
    globals.dataUpdateSuccessfullyMessage = false;
  });
});

router.get("/appointments", async (req, res) => {
  const appointments = [];

  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  try {
    const response = await axios.get(
      `http://localhost:3000/calendar/api/scheduled/${req.user.id}`
    );
    const data = await response.data;

    // Ordenamos las citas por fecha, ordenando cada cita en su correspondiente mes
    data.forEach((item) => {
      const start = item.start;

      const appointment = appointments.find(
        (appointment) =>
          moment(new Date(appointment.start)).format("MMM, D") ===
          moment(new Date(start)).format("MMM, D")
      );
      const appointmentData = {
        id: item.id,
        doctor: item.doctor,
        service: item.service,
        price: item.price,
        time: moment(new Date(start)).format("LT"),
        start: item.start,
      };

      if (!appointment) {
        appointments.push({
          start,
          date: moment(new Date(start)).format("MMM, D"),
          data: [appointmentData],
        });
      } else {
        appointment.data.push(appointmentData);
      }
    });

    // Ordenamos las fechas de menor a mayor
    appointments.sort(
      (a, b) => moment(a.date, "MMM, D") - moment(b.date, "MMM, D")
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  appointments.forEach((item) => {
    item.data.forEach((d) => {
      const currentDate = moment();
      d.expired = moment(d.start).isBefore(currentDate);
    });
  });

  res.render("appointments", { appointments });
});

router.get("/profile", (req, res) => {
  if (!req.isAuthenticated() || req.user?.type !== "user") {
    res.redirect("/login");
    return;
  }

  getUserData(req.user.id, (results) => {
    console.log(results);
    res.render("profile", {
      activePage: "profile",
      data: results[0],
      fieldFocus: "",
      showMessageFieldFocus: false,
      dataUpdateSuccessfullyMessage: globals.dataUpdateSuccessfullyMessage,
    });
    globals.dataUpdateSuccessfullyMessage = false;
  });
});

router.post("/confirmPassword", (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  }

  const { password } = req.body;

  connection.query(
    "SELECT contrasena as 'password' FROM paciente WHERE uuid=?",
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error(err.stack);
        return;
      }

      const { password: dbpassword } = results[0];
      if (bcrypt.compareSync(password, dbpassword)) {
        globals.editEnabled = true;
        res.send({ allowEdit: true });
      } else {
        globals.editEnabled = false;
        res.send({ allowEdit: false });
      }
    }
  );
});

/**
 * Manejador de ruta para la actualización de datos de un usuario.
 * @name POST /updateData
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @param {Function} next - Siguiente middleware en la cadena.
 * @returns {undefined}
 */
router.post("/updateData", (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const { email, phone } = req.body;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = /^[0-9]{10}$/.test(phone);

  if (!isValidEmail || !isValidPhone) {
    return res.render("profile", {
      message: "Por favor verifica que los campos sean correctos.",
    });
  }

  const fields = {
    correo: email,
    telefono: phone,
  };

  // Verifica si el correo electrónico o el número de teléfono ya están registrados en la base de datos.
  connection.query(
    "SELECT uuid, correo, telefono FROM paciente WHERE correo=? OR telefono=?",
    [email, phone],
    (err, results) => {
      if (err) {
        console.error(err.stack);
        return;
      }

      const hasDuplicateEmail = results.some(
        (result) => result.uuid !== req.user.id && result.correo === email
      );
      const hasDuplicatePhone = results.some(
        (result) => result.uuid !== req.user.id && result.telefono === phone
      );

      if (hasDuplicateEmail) {
        // El correo electrónico ya está registrado por otro usuario, muestra un mensaje de error en el campo correspondiente.
        getUserData(req.user.id, (results) => {
          results[0].email = email;
          res.render("profile", {
            activePage: "profile",
            data: results[0],
            fieldFocus: "email",
            showMessageFieldFocus: true,
          });
        });
      } else if (hasDuplicatePhone) {
        // El número de teléfono ya está registrado por otro usuario, muestra un mensaje de error en el campo correspondiente.
        getUserData(req.user.id, (results) => {
          results[0].phone = phone;
          res.render("profile", {
            activePage: "profile",
            data: results[0],
            fieldFocus: "phone",
            showMessageFieldFocus: true,
          });
        });
      } else {
        // Actualiza los campos de correo electrónico y número de teléfono del usuario en la base de datos.
        connection.query(
          "UPDATE paciente SET ? WHERE uuid=?",
          [fields, req.user.id],
          (err, _) => {
            if (err) {
              console.error(err.stack);
              return;
            }
            globals.editEnabled = false;
            globals.dataUpdateSuccessfullyMessage = true;
            res.redirect("/profile");
          }
        );
      }
    }
  );
});

router.post("/cancelUpdate", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  globals.editEnabled = false;
  globals.dataUpdateSuccessfullyMessage = false;
  res.status(200).send({ proceedWithCancellation: true });
});

/**
 * Manejador de ruta para obtener la vista del administrador de citas del doctor.
 * @name GET /manager
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.get("/manager", (req, res) => {
  // Verifica si el usuario está autenticado y si su tipo de usuario es "doctor". Si no cumple con estas condiciones, redirige a la página de inicio de sesión.
  if (!req.isAuthenticated() || req.user.type !== "doctor") {
    return res.redirect("/login");
  }

  // Realiza la consulta para obtener los datos relacionados con las citas del doctor.
  connection.query(
    `
    SELECT 
      cita.fecha AS "date", 
      cita.estado AS "status", 
      cita.uuid, 
      servicio.id_servicio AS "idService", 
      servicio.tipo AS "serviceType", 
      servicio.precio AS "servicePrice", 
      doctor.id_doctor AS "idDoctor",
      IFNULL(CONCAT(paciente.nombre, ' ', paciente.apellido), 'Sin paciente') AS "patientName",
      IFNULL(paciente.edad, 0) AS "patientAge",
      IFNULL(paciente.genero, '') AS "patientGender",
      IFNULL(paciente.telefono, '') AS "patientPhone",
      IFNULL(paciente.foto_ruta, '/public/user/picture/default/default.png') AS "patientPhoto"
    FROM 
      doctor
    LEFT JOIN servicio ON doctor.id_doctor = servicio.id_doctor
    LEFT JOIN cita ON servicio.id_servicio = cita.id_servicio
    LEFT JOIN citas_agendadas ON cita.id_cita = citas_agendadas.id_cita
    LEFT JOIN paciente ON citas_agendadas.id_paciente = paciente.id_paciente
    WHERE 
      doctor.uuid = ?;
  `,
    req.user.id,
    (err, results) => {
      if (err) {
        console.error(err.stack);
        return;
      }

      let data = results;

      // Si no se encontraron datos, renderiza la vista "manager" con una lista de datos vacía.
      if (!data.length) {
        return res.render("manager", {
          activePage: "manager",
          data: [],
          services: [],
          message: "",
          showSuccessfullyMessage: false,
        });
      }

      // Obtiene los servicios del doctor para mostrarlos en la vista.
      connection.query(
        `SELECT id_servicio AS id, tipo AS "serviceType", precio AS "servicePrice" FROM servicio WHERE id_doctor = ?`,
        [data[0].idDoctor],
        (err, results) => {
          if (err) {
            console.error(err.stack);
            return;
          }
          data = data.map((d) => {
            const currentDate = moment();
            if (moment(d.date).isBefore(currentDate)) {
              d.status = 4;
            }
            d.formatDate = moment(d.date).format("DD MMM YYYY");
            d.formatTime = moment(d.date).format("LT");
            d.inputFormatDate = moment(d.date).format("yyyy-MM-DD");
            d.inputFormatTime = moment(d.date).format("HH:mm");
            d.isNull = d.date === null;
            return d;
          });

          // Ordena los datos por fecha.
          data.sort(
            (a, b) => moment(a.date).valueOf() - moment(b.date).valueOf()
          );

          // Renderiza la vista "manager" y pasa los datos y servicios como argumentos.
          res.render("manager", {
            activePage: "manager",
            data,
            services: results,
            message: privateGlobals.message,
            showSuccessfullyMessage: globals.dataUpdateSuccessfullyMessage,
          });
          privateGlobals.message = "";
          globals.dataUpdateSuccessfullyMessage = false;
        }
      );
    }
  );
});

/**
 * Manejador de ruta para obtener los servicios de un doctor específico.
 * @name GET /manager/services
 * @function
 * @memberof module:rutas
 * @param {Object} req - Objeto de solicitud express.
 * @param {Object} res - Objeto de respuesta express.
 * @returns {undefined}
 */
router.get("/manager/services", (req, res) => {
  // Verifica si el usuario está autenticado y si su tipo de usuario es "doctor". Si no cumple con estas condiciones, redirige a la página anterior.
  if (!req.isAuthenticated() || req.user.type !== "doctor") {
    res.redirect("back");
    return;
  }

  // Obtiene el ID del doctor utilizando el UUID del usuario autenticado.
  connection.query(
    'SELECT id_doctor AS "idDoctor" FROM doctor WHERE uuid=?',
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error(err.stack);
        return;
      }

      // Obtiene los servicios del doctor específico utilizando su ID de doctor.
      connection.query(
        `SELECT id_servicio AS id, tipo AS "serviceType", precio AS "servicePrice" FROM servicio, doctor WHERE servicio.id_doctor=doctor.id_doctor AND doctor.id_doctor = ?`,
        [results[0].idDoctor],
        (err, results) => {
          if (err) {
            console.error(err.stack);
            return;
          }

          // Renderiza la vista "services" y pasa los datos de los servicios como argumento.
          res.render("services", {
            activePage: "services",
            services: results,
            typeMessage: privateGlobals.typeMessage,
            message: privateGlobals.message,
            showFieldMessage: globals.dataUpdateSuccessfullyMessage,
          });
          globals.dataUpdateSuccessfullyMessage = false;
          privateGlobals.message = "";
          privateGlobals.typeMessage = "";
        }
      );
    }
  );
});

export default router;
