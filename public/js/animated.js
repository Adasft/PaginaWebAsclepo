const banner = document.getElementById("banner-container");
const { width, height, bottom, right } = banner.getBoundingClientRect();
const createImg = (src, top, left, scale) => {
  const img = document.createElement("img");
  img.src = src;
  img.style.height = "80px";
  img.style.position = "absolute";
  img.style.top = `${top * 100}%`;
  img.style.left = `${left * 100}%`;
  img.style.transform = `scale(${scale})`;
  img.style.opacity = "0.8";
  return img;
};

const positions = [
  { top: 0.1, left: -0.01, scale: 0.5 },
  { top: 0.8, left: 0.1, scale: 0.8 },
  { top: 0.6, left: 0.9, scale: 1 },
  { top: 0.2, left: 0.85, scale: 0.4 },
  { top: 0.5, left: 0.5, scale: 0.6 },
  { top: 0.1, left: 0.7, scale: 0.6 },
];
const path = "/public/images/banner-items/";
const imagesSrc = Array(6)
  .fill()
  .map((_, i) => `${path}${i + 1}-png.png`);

let dir = 1;
const elementImagesList = imagesSrc.map((path, i) => ({
  elm: createImg(path, positions[i].top, positions[i].left, positions[i].scale),
  scale: positions[i].scale,
  dir: (dir = dir * -1),
}));

elementImagesList.forEach((item) => {
  banner.appendChild(item.elm);
});

const info = document.getElementById("info-container");
window.addEventListener("scroll", (e) => {
  const scrollTop = document.documentElement.scrollTop;

  if (scrollTop > 0) {
    info.classList.add("show");
  } else {
    info.classList.remove("show");
  }
});

const presentation = document.getElementById("presentation");
const bannerPerson = document.getElementById("banner-person");

presentation.addEventListener("mousemove", (event) => {
  const mouseX = event.clientX - presentation.offsetLeft;
  const mouseY = event.clientY - presentation.offsetTop;

  const imagenX = (mouseX / presentation.offsetWidth) * 20 - 10;
  const imagenY = (mouseY / presentation.offsetHeight) * 20 - 10;

  bannerPerson.style.transform = `translate(${imagenX}px, ${imagenY}px)`;

  elementImagesList.forEach((img) => {
    img.elm.style.transform = `scale(${img.scale}) translate(${
      img.dir * imagenX
    }px, ${img.dir * imagenY}px)`;
  });
});

$("#more").on("click", () => {
  $("html, body").animate({ scrollTop: 800 }, "slow");
});
