$(document).ready(function () {
  let mode = "CREATOR";
  let uuid = "";

  $("#accordion").accordion({
    collapsible: true,
    active: false,
  });
  $("#header-accordion").accordion({
    collapsible: true,
    active: true,
  });

  $("#date, #time").on("change", (e) => {
    const val = e.target.value;
    const date = $("#date").val();
    const time = $("#time").val();

    console.log(val);
    if (!val) {
      $("#save").attr("disabled", "");
    } else if (
      /^(\d{4})-(\d{2})-(\d{2})$/.test(date) &&
      /^([01]\d|2[0-3]):([0-5]\d)$/.test(time)
    ) {
      $("#save").removeAttr("disabled");
    }
  });

  $("#save").on("click", async () => {
    const date = $("#date").val();
    const time = $("#time").val();

    if (
      !/^(\d{4})-(\d{2})-(\d{2})$/.test(date) ||
      !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)
    ) {
      $(document.body).append(`
        <div class="field-message error">
          La fecha o la hora no puedan estar vacios.
        </div>
      `);
      removeFieldMesssage(5000);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/manager/api/${
          mode === "CREATOR" ? "new" : "edit"
        }`,
        {
          method: mode === "CREATOR" ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: $("#date").val(),
            time: $("#time").val(),
            serviceId: $("#service").val(),
            servicePrice: $("#price").val(),
            uuid: uuid,
          }),
        }
      );

      const data = await response.json();

      if (data.code === 4) {
        window.location.reload();
      } else if (data.code === 2) {
        $(document.body).append(`
          <div class="field-message warning">
            Ya existe una cita programada para la fecha y hora especificadas. Por favor, elija otra fecha u hora para la cita.
          </div>
        `);
        removeFieldMesssage(5000);
      } else if (data.code === 3) {
        $(document.body).append(`
          <div class="field-message warning">
            La fecha de la cita es anterior a la fecha actual. Por favor, elija una fecha válida para la cita.
          </div>
        `);
        removeFieldMesssage(9000);
      } else if (data.code === 5) {
        $(document.body).append(`
          <div class="field-message warning">
          La fecha ${data.dateAdded} se acopla con la fecha ${data.existingDate}. Recuerda que las fechas deben tener al menos 30 minutos de diferencia.
          </div>
        `);
        removeFieldMesssage(9000);
      }
    } catch (err) {
      console.error(err);
    }
  });

  $(".show-options-card").on("click", ({ target }) => {
    const options = $(target).nextAll().first();
    const showOptions = $(".pg-manager-card-options.show");

    if (options[0] !== showOptions[0]) {
      showOptions.removeClass("show");
    }
    options.toggleClass("show");
  });

  $("li[data-option-action]").on("click", ({ target }) => {
    // $(".show-options-card").off("blur");
    const actions = $(target).data().optionAction;

    switch (actions.action) {
      case "EDIT":
        const appointmentData = $(
          `button[data-appointment-id="${actions.uuid}"]`
        ).data().appointment;

        if (!$("#ui-id-6").hasClass("ui-accordion-content-active")) {
          $("#ui-id-5").click();
        }
        $("#date").val(appointmentData.date);
        $("#time").val(appointmentData.time);
        $("#service").val(appointmentData.serviceId);
        mode = "EDITION";
        uuid = actions.uuid;
        $("#date").attr("disabled", "");
        $("#save").removeAttr("disabled");
        $("#save").text("Editar cita");
        $("#label").removeClass("show");
        $("#edit-label").addClass("show");
        $("#price").val(appointmentData.price);
        $("html, body").animate({ scrollTop: 0 }, "fast");
        break;
      case "DELETE":
        showModalConfirm(
          "",
          undefined,
          false,
          async () => {
            const response = await fetch(
              `http://localhost:3000/manager/api/delete/${actions.uuid}`,
              {
                method: "POST",
              }
            );

            const data = await response.json();
            if (data.code === 4) {
              window.location.href = "http://localhost:3000/manager";
            }
          },
          "¿Deseas eliminar esta cita?",
          "Si, eliminar"
        );
        break;
      case "MARK":
        break;
    }

    $(".pg-manager-card-options.show").removeClass("show");
  });

  $("#service").on("change", function () {
    const selectedOption = $("#service option:selected");

    // Obtener el dataset de la opción seleccionada
    const dataset = selectedOption.data();

    if ($("#label").hasClass("show")) {
      $("#display-price").text(dataset.servicePrice);
    } else {
      $("#price").val(dataset.servicePrice);
    }
    console.log(dataset);
  });

  $("#service").on("click", (e) => {
    const selectedOption = $("#service option:selected");

    // Obtener el dataset de la opción seleccionada
    const dataset = selectedOption.data();

    if (
      e.originalEvent.button === -1 &&
      dataset.hasOwnProperty("optionAction")
    ) {
      window.location.href = "http://localhost:3000/manager/services";
    }
  });

  $("#ui-id-5").on("click", () => {
    if ($("#ui-id-5").hasClass("ui-state-active")) {
      $("#date").val("");
      $("#data").removeAttr("disabled");
      $("#time").val("");
      $("#service").prop("selectedIndex", 0);
      $("#display-price").text($("#service option:first").data().servicePrice);
      $("#save").attr("disabled", "");
      $("#save").text("Guardar cita");
      $("#label").addClass("show");
      $("#edit-label").removeClass("show");
      mode = "CREATOR";
    }
  });

  $("#price").on("input", function () {
    var numero = parseInt($(this).val());

    if (numero < 0) {
      $(this).val("0");
      $("#save-service").attr("disabled", "");
      alert("No se permiten números negativos");
    }
  });

  $("#price").on("input", (e) => {
    if ($("#price").val() && !/^0+/.test($("#price").val())) {
      $("#save").removeAttr("disabled");
    } else {
      $("#save").attr("disabled", "");
    }
  });
});
