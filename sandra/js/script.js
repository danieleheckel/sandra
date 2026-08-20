const menuToggle = document.getElementById("menuToggle");
const menu = document.getElementById("menu");

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    menu.classList.toggle("show");
  });
}

const reveals = document.querySelectorAll(".reveal");

const revealOnScroll = () => {
  reveals.forEach((item) => {
    const windowHeight = window.innerHeight;
    const itemTop = item.getBoundingClientRect().top;
    const revealPoint = 80;

    if (itemTop < windowHeight - revealPoint) {
      item.classList.add("show");
    }
  });
};

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

const simulateBtn = document.getElementById("simulateBtn");

if (simulateBtn) {
  simulateBtn.addEventListener("click", () => {
    const contasValor = document.getElementById("contasValor");
    const tarefasValor = document.getElementById("tarefasValor");
    const gastoValor = document.getElementById("gastoValor");
    const manutencaoValor = document.getElementById("manutencaoValor");

    if (contasValor) contasValor.textContent = "4";
    if (tarefasValor) tarefasValor.textContent = "9";
    if (gastoValor) gastoValor.textContent = "R$ 2.130";
    if (manutencaoValor) manutencaoValor.textContent = "2";

    simulateBtn.textContent = "Painel atualizado";
    simulateBtn.disabled = true;
  });
}