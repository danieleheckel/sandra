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

const btnConsultar = document.getElementById("btnConsultar");
const servico = document.getElementById("servico");
const resultado = document.getElementById("resultado");

btnConsultar.addEventListener("click", () => {
  if (servico.value === "") {
    resultado.textContent = "Selecione um serviço antes de consultar.";
    return;
  }
  resultado.textContent = "Orientação para: " + servico.options[servico.selectedIndex].text;
});

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    menu.classList.toggle("open");
  });
}

btnConsultar.addEventListener("click", () => {
  const escolha = campoServico.value;

  if (escolha === "") {
    resultado.textContent = "Escolha um serviço antes de consultar.";
  } else if (escolha === "agendamento") {
    resultado.textContent = "O agendamento pode ser solicitado pelo portal.";
  } else if (escolha === "documentos") {
    resultado.textContent = "Confira os documentos necessários antes de solicitar.";
  } else if (escolha === "atendimento") {
    resultado.textContent = "Consulte os horários disponíveis para atendimento.";
  } else {
    resultado.textContent = "Serviço não identificado.";
  }
});