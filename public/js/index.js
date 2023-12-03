const appointmentStatus = {
  AVAILABLE: 1,
  SCHEDULED: 2,
  BUSY: 3,
  EXPIRED: 4,
};

function getStatusEvent(statusCode) {
  switch (statusCode) {
    case appointmentStatus.AVAILABLE:
      return "available";
    case appointmentStatus.SCHEDULED:
      return "scheduled";
    case appointmentStatus.BUSY:
      return "busy";
    case appointmentStatus.EXPIRED:
      return "expired";
  }
}

function showModalConfirm(
  id,
  cb = () => {},
  reload = false,
  cbFetch,
  message = "¿Deseas cancelar esta cita?",
  confirmMessage = "Si, cancelar"
) {
  $(document.body).append(
    ` 
      <div class="modal show" id="confirm-modal">
        <div class="modal-confirm-container">
          <div class="modal-confirm-title">${message}</div>
          <div class="modal-display-controls">
            <button id="close-confirm-modal">No</button>
            <button class="pg-primary-btn" id="confirm">${confirmMessage}</button>
          </div>
        </div>
      </div>
    `
  );

  $("#close-confirm-modal").on("click", () => {
    $("#confirm-modal").remove();
    $("#confirm").off("click");
    $("#close-confirm-modal").off("click");
  });

  $("#confirm").on("click", async () => {
    $("#confirm-modal").remove();
    $("#confirm").off("click");
    $("#close-confirm-modal").off("click");

    if (cb) cb();

    if (cbFetch) {
      cbFetch();
    } else {
      await fetch(
        `http://localhost:3000/calendar/api/appointments/${id}/?status=${appointmentStatus.AVAILABLE}`,
        {
          method: "PUT",
        }
      );

      await fetch(`http://localhost:3000/calendar/api/scheduled/cancel/${id}`, {
        method: "DELETE",
      });
    }

    if (reload) window.location.reload();
  });
}

// const userCountAction = document.getElementById("user-count");
// const userCountOptions = document.getElementById("user-options");

// userCountAction.addEventListener("click", () => {
//   userCountOptions.classList.toggle("show");
// });

$("#user-count").on("click", () => {
  $("#user-options").toggleClass("show");
});

$(".pg-schedule-details").on("click", function (e) {
  if ($(e.target).attr("data-action") === "schedule-cancel") {
    showModalConfirm($(this).attr("data-appointment-id"), null, true);
    // location.reload();
  }
});

function removeFieldMesssage(time) {
  setTimeout(() => {
    $(".field-message")?.remove();
  }, time);
}

removeFieldMesssage(5000);
