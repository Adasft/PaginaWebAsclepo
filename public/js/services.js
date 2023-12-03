let mode = "CREATOR";
let id;

$("#service, #price").on("input", (e) => {
  if ($("#service").val() && $("#price").val()) {
    if (/^0+/.test($("#price").val())) {
      $("#save-service").attr("disabled", "");
    } else {
      $("#save-service").removeAttr("disabled");
    }
  } else {
    $("#save-service").attr("disabled", "");
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

$("button[data-ser-action='edit']").on("click", ({ target }) => {
  const { service } = $(target).data();

  $("#service").val(service.type);
  $("#service").attr("disabled", "");

  $("#price").val(service.price);
  $("#save-service").text("Cambiar precio");
  $("#save-service").removeAttr("disabled");
  $("#cancel").addClass("show");
  mode = "EDITING";
  id = service.id;
});

$("#cancel").on("click", (e) => {
  e.preventDefault();

  $("#service").val("");
  $("#service").removeAttr("disabled");

  $("#price").val("");
  $("#save-service").text("Agregar servicio");
  $("#save-service").attr("disabled", "");
  $("#cancel").removeClass("show");
  mode = "CREATOR";
  id = null;
});

$("#save-service").on("click", async (e) => {
  if (mode === "EDITING") {
    e.preventDefault();
  }
  if (id !== null) {
    const response = await fetch(
      `http://localhost:3000/manager/api/edit/service/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price: Number($("#price").val()),
        }),
      }
    );

    const data = await response.json();

    if (data.code === 4) {
      $(`span[data-ref-id=${id}]`).text($("#price").val());
      $(`li[data-parent-ref-id=${id}]`).addClass("li-focused");
      setTimeout(() => {
        $(`li[data-parent-ref-id=${id}]`).removeClass("li-focused");
      }, 6000);
      $(document.body).append(`
          <div class="field-message successfull">
            Precio del servicio actualizado correctamente.
          </div>
        `);
      removeFieldMesssage(5000);
      $("#service").val("");
      $("#service").removeAttr("disabled");
      $("#price").val("");
      $("#save-service").text("Agregar servicio");
      $("#save-service").attr("disabled", "");
      $("#cancel").removeClass("show");
      mode = "CREATOR";
      id = null;
    }
  }
});

$("button[data-ser-action='delete']").on("click", async ({ target }) => {
  const { service } = $(target).data();
  const queryString = new URLSearchParams({ id: service.id }).toString();
  const response1 = await fetch(
    `http://localhost:3000/manager/api/service/appointment?${queryString}`,
    {
      method: "GET",
    }
  );

  const appointments = await response1.json();
  const showWarning = appointments.count > 0;
  const message = `¿Deseas eliminar este servicio?${
    showWarning
      ? `<br><p>Si eliminas el servicio, se eliminará la/s <b>${appointments.count}</b> cita/s asociada/s a él.</p>`
      : ""
  }`;

  showModalConfirm(
    undefined,
    undefined,
    false,
    async () => {
      const response = await fetch(
        `http://localhost:3000/manager/api/delete/service/${service.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();

      if (data.code === 4) {
        $(`li[data-parent-ref-id=${service.id}]`).remove();
        $(document.body).append(`
          <div class="field-message successfull">
            Servicio eliminado correctamente.
          </div>
        `);
        removeFieldMesssage(5000);
      }
    },
    message,
    "Si, eliminar"
  );
});
