// Obtén los elementos del formulario
// const imageInput = document.getElementById("load-photo");

// imageInput.addEventListener("click", () => {
//   showLoaderModal();
// });

// Agrega un evento change al campo de entrada de la imagen
$("#load-photo").on("click", () => {
  showLoaderModal();
});

$("#update-data").on("click", () => {
  showUpdateModalConfirm();
});

function showLoaderModal() {
  const src = $("#main-photo").attr("src");
  $(document.body).append(`
    <div class="loader-overlay" id="loader-overlay">
      <form class="loader-modal" action="/upload" method="post" enctype="multipart/form-data">
        <div class="loader-modal-preview">
          <div class="pg-main-profile-photo">
            <img src="${src}" alt="Profile" id="preview-img"/>
            <label class="select-images" for="loader">✚</label>
            <input id="loader" type="file" name="image" accept="image/*"></input>
          </div>
        </div>
        <div class="modal-display-controls">
          <button id="close-modal">Cancelar</button>
          <button class="pg-primary-btn" id="load-to-server" type="submit" disabled>Subir foto</button>
        </div>
      </form>
    </div>
  `);

  $("#close-modal").on("click", () => {
    $("#loader-overlay").remove();
  });

  $("#loader").on("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        // Archivo no válido
        alert("Solo se permiten imágenes.");
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        $("#preview-img").attr("src", e.target.result);
      };

      $("#load-to-server").removeAttr("disabled");

      reader.readAsDataURL(file);
    }
  });
}

function showUpdateModalConfirm() {
  $(document.body).append(`
    <div class="loader-overlay" id="loader-overlay">
      <div class="loader-modal">
        <div class="confirm-modal-container" >
          <div class="confirm-password-message">Confirma tu contraseña para continuar:</div>
          <input type="password" class="form-control" id="confirm-password-input" placeholder="Digita tu contraseña" autofocus required>
          <div class="label-error">La contraseña que ingresaste es incorrecta.</div>
        </div>
        <div class="modal-display-controls">
            <button id="close-modal">Cancelar</button>
            <button class="pg-primary-btn" id="confirm-password" type="submit" disabled>Confirmar</button>
          </div>
      </div>
    </div>
  `);

  $("#confirm-password-input").focus();

  $("#close-modal").on("click", () => {
    $("#loader-overlay").remove();
  });

  $("#confirm-password-input").on("input", ({ target }) => {
    if (target.value.length) {
      $("#confirm-password").removeAttr("disabled");
    } else {
      $("#confirm-password").attr("disabled", "");
    }
  });

  $("#confirm-password").on("click", async (e) => {
    try {
      const response = await fetch("http://localhost:3000/confirmPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: $("#confirm-password-input").val() }),
      });

      const data = await response.json();
      const { allowEdit } = data;

      if (allowEdit) {
        window.location.reload();
      } else {
        $("#confirm-password-input").focus().select();
        $(".confirm-modal-container .label-error").addClass("show");
      }
    } catch (err) {
      console.error(err);
    }
  });
}

$("#cancel-edit").on("click", async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:3000/cancelUpdate", {
      method: "POST",
    });

    const data = await response.json();
    const { proceedWithCancellation } = data;

    if (proceedWithCancellation) {
      window.location.href = "http://localhost:3000/profile";
    }
  } catch (err) {
    console.error(err);
  }
});
