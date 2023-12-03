$(document).ready(async function () {
  const calendar = $("#calendar-container");
  const db = [];
  const scheduleAppointment = [];
  const selectedAppointment = {
    id: "",
    appointmentElm: null,
  };

  const response = await fetch(
    "http://localhost:3000/calendar/api/appointments"
  );
  const data = await response.json();
  db.push(...data);

  db.map((item) => {
    item.date = new Date(item.start);
    return item;
  });

  calendar.fullCalendar({
    locale: "es",
    header: {
      left: "prev,next today",
      center: "title",
      right: "month",
    },
    defaultView: "month",
    editable: true,
    events: [
      ...db.map((item) => ({
        start: item.start,
        title: item.service,
        id: item.id,
      })),
    ],
    dayRender: function (date, cell) {},
    dayClick: function (date) {
      showModal(date);
    },
    eventRender: function (event, element) {},
  });

  const modal = $(".modal");
  const scheduleAction = $("#schedule-appointment");
  const closeModalAction = $("#close-modal");
  const modalYearDisplay = $("#modal-year");
  const modalDayNameDisplay = $("#modal-day-name");
  const modalDayNumberDisplay = $("#modal-day-number");
  const modalEventDisplay = $("#modal-events-view");

  function format(date, value) {
    return moment(date).format(value);
  }

  function showModal(date) {
    const eventsOfDate = getEventsDay(date);

    if (eventsOfDate.length > 0) {
      modal.addClass("show");
      $(document.body).css({ overflow: "hidden" });

      modalYearDisplay.text(format(date, "MMM YYYY"));
      modalDayNameDisplay.text(format(date, "dddd"));
      modalDayNumberDisplay.text(format(date, "D"));

      eventsOfDate.forEach((calendarEvent) => {
        const schedule = db.find((item) => calendarEvent.id === item.id);

        if (!schedule) return;

        modalEventDisplay.append(
          `
          <div class="modal-display-chip ${getStatusEvent(
            schedule.status
          )}" data-appointment-id='${schedule.id}'>
            <div class="modal-display-overflow">
              <div class="modal-display-event-status"></div>
              <div class="modal-display-event-details">
                <div class="modal-display-event-time">${format(
                  schedule.date,
                  "h:mm A"
                )}</div>
                <div class="modal-display-event-type-service">${
                  schedule.service
                } • $${schedule.price} MXN</div>
                <div class="modal-display-doctor">Dr. ${schedule.doctor}</div>
              </div>
            </div>
          </div>
          `
        );
      });

      $(".modal-display-chip").on("click", function () {
        const appointmentElm = $(this);
        const id = appointmentElm.attr("data-appointment-id");
        const appointment = db.find((item) => item.id == id);

        if (appointment.status === appointmentStatus.BUSY) {
          alert(
            "Esta cita no se encuentra disponible en este momento. Por favor, selecciona otra opción."
          );
          return;
        }
        if (appointment.status === appointmentStatus.EXPIRED) {
          alert("Esta cita ha expirado. Por favor, elige otra.");
          return;
        }

        if (appointment.status === appointmentStatus.SCHEDULED) {
          showModalConfirm(appointment.id, () => {
            appointment.status = appointmentStatus.AVAILABLE;
            appointmentElm.removeClass("scheduled");
            appointmentElm.addClass("available");

            scheduleAppointment.splice(
              scheduleAppointment.findIndex(
                (item) => item.id === appointment.id
              ),
              1
            );
          });
          return;
        }

        if (id !== selectedAppointment.id) {
          if (selectedAppointment.appointmentElm) {
            selectedAppointment.appointmentElm.removeClass("selected");
          }
          scheduleAction.removeAttr("disabled");
          appointmentElm.addClass("selected");
          selectedAppointment.id = id;
          selectedAppointment.appointmentElm = appointmentElm;
        } else if (id == selectedAppointment.id) {
          scheduleAction.attr("disabled", "");
          appointmentElm.removeClass("selected");
          selectedAppointment.id = "";
          selectedAppointment.appointmentElm = null;
        }
      });
    }
  }

  scheduleAction.on("click", async () => {
    const appointment = db.find((item) => item.id === selectedAppointment.id);
    scheduleAppointment.push(appointment);

    appointment.status = appointmentStatus.SCHEDULED;
    selectedAppointment.appointmentElm.removeClass("available");
    selectedAppointment.appointmentElm.removeClass("selected");
    selectedAppointment.appointmentElm.addClass("scheduled");

    await fetch(
      `http://localhost:3000/calendar/api/appointments/${appointment.id}/?status=${appointmentStatus.SCHEDULED}`,
      {
        method: "PUT",
      }
    );

    await fetch(
      `http://localhost:3000/calendar/api/scheduled/new/${appointment.id}`,
      {
        method: "POST",
      }
    );

    selectedAppointment.id = "";
    selectedAppointment.appointmentElm = null;
    scheduleAction.attr("disabled", "");

    modal.removeClass("show");
    $(document.body).css({ overflow: "auto" });
    modalEventDisplay.html("");
  });

  closeModalAction.on("click", () => {
    modal.removeClass("show");
    $(document.body).css({ overflow: "auto" });
    modalEventDisplay.html("");

    selectedAppointment.id = "";
    selectedAppointment.appointmentElm = null;
    scheduleAction.attr("disabled", "");
  });

  function getEventsDay(date) {
    const formatDate = moment(date).format("YYYY-MM-DD");
    const eventsOfDate = [];

    calendar.fullCalendar("clientEvents", (event) => {
      if (moment(event.start).format("YYYY-MM-DD") == formatDate) {
        eventsOfDate.push(event);
      }
    });

    return eventsOfDate;
  }
});
