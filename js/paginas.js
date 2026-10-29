/* =========================================================
   Casa em Dia — lógica das telas internas
   Detecta a página por <body data-page="...">
   ========================================================= */
"use strict";

(function () {
  const page = document.body.dataset.page;
  if (!page) return;

  /* ---------------- utilidades ---------------- */
  const K = {
    bookings: "cea.bookings",
    shopping: "cea.shopping",
    bills: "cea.bills",
    appts: "cea.appts",
    tasks: "cea.tasks"
  };

  const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch (e) { return fb; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const todayStr = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const fmtDate = (s) => {
    if (!s) return "—";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  };
  const longDate = (s) => {
    if (!s) return "";
    const d = new Date(s + "T12:00:00");
    if (isNaN(d)) return fmtDate(s);
    const txt = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  };
  const brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  /* parâmetros da URL (usados nas telas 1 e 3) */
  const params = new URLSearchParams(window.location.search);

  /* ---------------- toast ---------------- */
  let toastTimer;
  function toast(title, detail) {
    let t = document.getElementById("cd-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "cd-toast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.innerHTML = `<span>✅</span><span><strong>${esc(title)}</strong><span class="cd-tt">${esc(detail || "")}</span></span>`;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 4200);
  }

  /* ==========================================================
     TELA 1 — AGENDAMENTO
     ========================================================== */
  if (page === "agendamento") {
    const SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
    const form = $("#agForm");
    const agDate = $("#agDate");
    const agTime = $("#agTime");
    let bookings = load(K.bookings, []);
    let pendingCancel = null;

    agDate.min = todayStr();

    const takenSlots = (date) => bookings.filter((b) => b.date === date).map((b) => b.time);

    function fillSlots() {
      const date = agDate.value;
      const taken = takenSlots(date);
      const current = agTime.value;
      agTime.innerHTML = '<option value="">Selecione</option>' + SLOTS.map((s) => {
        const busy = taken.includes(s);
        return `<option value="${s}" ${busy ? "disabled" : ""}>${s}${busy ? " — ocupado" : ""}</option>`;
      }).join("");
      if (current && !taken.includes(current)) agTime.value = current;
    }
    agDate.addEventListener("change", fillSlots);
    fillSlots();

    function setErr(id, msg, field) {
      const el = $("#err" + id);
      if (el) el.textContent = msg || "";
      if (field) field.classList.toggle("bad", !!msg);
      return !msg;
    }

    function validate() {
      let ok = true;

      const name = $("#agName");
      if (name.value.trim().length < 3) ok = setErr("Name", "Informe seu nome completo.", name) && ok;
      else setErr("Name", "", name);

      const email = $("#agEmail");
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.value.trim())) ok = setErr("Email", "E-mail inválido.", email) && ok;
      else setErr("Email", "", email);

      const phone = $("#agPhone");
      if (phone.value.replace(/\D/g, "").length < 10) ok = setErr("Phone", "Informe DDD + número.", phone) && ok;
      else setErr("Phone", "", phone);

      if (!agDate.value) ok = setErr("Date", "Escolha uma data.", agDate) && ok;
      else if (agDate.value < todayStr()) ok = setErr("Date", "A data não pode ser no passado.", agDate) && ok;
      else setErr("Date", "", agDate);

      if (!agTime.value) ok = setErr("Time", "Escolha um horário.", agTime) && ok;
      else if (takenSlots(agDate.value).includes(agTime.value)) ok = setErr("Time", "Esse horário já está ocupado.", agTime) && ok;
      else setErr("Time", "", agTime);

      return ok;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate()) return;

      const b = {
        id: uid(),
        protocol: "AG-" + Math.floor(1000 + Math.random() * 9000),
        name: $("#agName").value.trim(),
        email: $("#agEmail").value.trim(),
        phone: $("#agPhone").value.trim(),
        type: $("#agType").value,
        date: agDate.value,
        time: agTime.value,
        people: $("#agPeople").value || "—",
        notes: $("#agNotes").value.trim(),
        createdAt: Date.now()
      };

      bookings.unshift(b);
      save(K.bookings, bookings);

      form.reset();
      $("#agPeople").value = 2;
      fillSlots();
      ["Name", "Email", "Phone", "Date", "Time"].forEach((k) => setErr(k, ""));

      render();
      toast("Agendamento confirmado", `${b.protocol} · ${longDate(b.date)} às ${b.time}`);
      $("#agList").scrollIntoView({ behavior: "smooth", block: "center" });
    });

    function render() {
      const wrap = $("#agList");
      $("#agTotal").textContent = bookings.length;

      const now = todayStr();
      const next = bookings
        .filter((b) => b.date >= now)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

      $("#agNext").textContent = next ? next.time : "—";
      $("#agNextInfo").textContent = next ? `${fmtDate(next.date)} · ${next.type}` : "nenhum agendamento";

      if (!bookings.length) {
        wrap.innerHTML = '<div class="cd-empty">📭 Nenhum agendamento por aqui ainda.<br>Escolha um horário ao lado para começar.</div>';
        return;
      }

      wrap.innerHTML = bookings.map((b) => `
        <div class="cd-ag">
          <div class="cd-ag-top">
            <span class="cd-pill ok">${esc(b.type)}</span>
            <span class="cd-ag-when">${fmtDate(b.date)} · ${esc(b.time)}</span>
          </div>
          <div class="cd-ag-who">${esc(b.name)} · ${esc(b.phone)}</div>
          <div class="cd-ag-foot">
            <span class="cd-proto">${esc(b.protocol)}</span>
            ${pendingCancel === b.id
              ? `<span class="cd-confirm">Cancelar?
                   <button type="button" class="cd-link" data-confirm="${b.id}" style="color:#c62828">Sim</button>
                   <button type="button" class="cd-link" data-abort="${b.id}">Não</button></span>`
              : `<button type="button" class="cd-link" data-cancel="${b.id}">Cancelar</button>`}
          </div>
        </div>
      `).join("");
    }

    $("#agList").addEventListener("click", (e) => {
      const cancel = e.target.closest("[data-cancel]");
      if (cancel) { pendingCancel = cancel.dataset.cancel; render(); return; }

      const abort = e.target.closest("[data-abort]");
      if (abort) { pendingCancel = null; render(); return; }

      const conf = e.target.closest("[data-confirm]");
      if (conf) {
        bookings = bookings.filter((b) => b.id !== conf.dataset.confirm);
        save(K.bookings, bookings);
        pendingCancel = null;
        fillSlots();
        render();
        toast("Agendamento cancelado", "O horário voltou a ficar disponível.");
      }
    });

    /* pré-seleciona o tipo e/ou a data quando vem de um link direto */
    const TIPOS = {
      agendamento: "Demonstração guiada",
      documentos: "Ajuda para configurar a casa",
      atendimento: "Suporte técnico"
    };

    const origem = (params.get("servico") || params.get("tipo") || "").toLowerCase();
    if (origem && TIPOS[origem]) $("#agType").value = TIPOS[origem];

    const dataPre = params.get("data");
    if (dataPre && /^\d{4}-\d{2}-\d{2}$/.test(dataPre) && dataPre >= todayStr()) {
      agDate.value = dataPre;
      fillSlots();
    }

    const horaPre = params.get("hora");
    if (horaPre && SLOTS.includes(horaPre) && !takenSlots(agDate.value).includes(horaPre)) {
      if (!agDate.value) agDate.value = todayStr();
      fillSlots();
      agTime.value = horaPre;
    }

    render();
  }

  /* ==========================================================
     TELA 2 — DOCUMENTOS
     ========================================================== */
  if (page === "documentos") {
    const state = {
      shopping: load(K.shopping, []),
      bills: load(K.bills, []),
      appts: load(K.appts, []),
      tasks: load(K.tasks, [])
    };

    const stores = {
      shopping: { key: K.shopping, get arr() { return state.shopping; }, set arr(v) { state.shopping = v; } },
      bills:    { key: K.bills,    get arr() { return state.bills; },    set arr(v) { state.bills = v; } },
      appts:    { key: K.appts,    get arr() { return state.appts; },    set arr(v) { state.appts = v; } },
      tasks:    { key: K.tasks,    get arr() { return state.tasks; },    set arr(v) { state.tasks = v; } }
    };

    const persist = (name) => save(stores[name].key, stores[name].arr);
    const isDone = (name, x) => (name === "bills" ? !!x.paid : !!x.done);

    function setProgress(barId, cntId, done, total, label) {
      const pct = total ? Math.round((done / total) * 100) : 0;
      const bar = document.getElementById(barId);
      if (bar) bar.style.width = pct + "%";
      const cnt = document.getElementById(cntId);
      if (cnt) cnt.textContent = `${done} de ${total} ${label}`;
    }

    const emptyRow = (msg) => `<li class="cd-empty">${msg}</li>`;

    function rowHTML(name, id, done, title, meta, pill) {
      return `<li class="cd-item ${done ? "done" : ""}">
        <label class="cd-chk">
          <input type="checkbox" data-toggle="${name}" data-id="${id}" ${done ? "checked" : ""} aria-label="Concluir ${esc(title)}">
          <span></span>
        </label>
        <div class="cd-item-main">
          <span class="cd-item-title">${esc(title)}</span>
          ${meta ? `<span class="cd-item-meta">${meta}</span>` : ""}
        </div>
        ${pill || ""}
        <button type="button" class="cd-del" data-del="${name}" data-id="${id}" aria-label="Excluir ${esc(title)}">✕</button>
      </li>`;
    }

    function renderShopping() {
      const arr = state.shopping;
      const done = arr.filter((x) => x.done).length;
      $("#listShopping").innerHTML = arr.length
        ? arr.map((x) => rowHTML("shopping", x.id, x.done, x.name, `${x.qty} un`)).join("")
        : emptyRow("Sua lista está vazia. Adicione o primeiro item.");
      setProgress("progLista", "cntLista", done, arr.length, "comprados");
    }

    function billStatus(b) {
      if (b.paid) return { label: "Paga", cls: "ok" };
      const now = todayStr();
      if (b.due && b.due < now) return { label: "Atrasada", cls: "late" };
      if (b.due === now) return { label: "Vence hoje", cls: "today" };
      return { label: "Em dia", cls: "" };
    }

    function renderBills() {
      const arr = [...state.bills].sort((a, b) => (a.due || "").localeCompare(b.due || ""));
      const done = arr.filter((x) => x.paid).length;
      $("#listBills").innerHTML = arr.length
        ? arr.map((x) => {
            const st = billStatus(x);
            return rowHTML("bills", x.id, x.paid, x.desc,
              `${brl(x.amount)} · vence ${fmtDate(x.due)}`,
              `<span class="cd-pill ${st.cls}">${st.label}</span>`);
          }).join("")
        : emptyRow("Nenhuma conta cadastrada. Comece pela próxima a vencer.");
      setProgress("progBills", "cntBills", done, arr.length, "pagas");
    }

    function renderAppts() {
      const arr = [...state.appts].sort((a, b) =>
        (a.date + " " + (a.time || "")).localeCompare(b.date + " " + (b.time || "")));
      const done = arr.filter((x) => x.done).length;
      $("#listAppts").innerHTML = arr.length
        ? arr.map((x) => rowHTML("appts", x.id, x.done, x.title,
            `${fmtDate(x.date)}${x.time ? " às " + x.time : ""}`)).join("")
        : emptyRow("Sem compromissos marcados por enquanto.");
      setProgress("progAppts", "cntAppts", done, arr.length, "concluídos");
    }

    function renderTasks() {
      const arr = state.tasks;
      const done = arr.filter((x) => x.done).length;
      const ul = $("#listTasks");

      if (!arr.length) {
        ul.innerHTML = emptyRow("Nenhuma tarefa na semana. Comece dividindo o que precisa ser feito.");
      } else {
        let html = "";
        [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
          const items = arr.filter((x) => Number(x.day) === d);
          if (!items.length) return;
          html += `<li class="cd-day-label">${DAYS[d]}</li>`;
          items.forEach((x) => { html += rowHTML("tasks", x.id, x.done, x.title, ""); });
        });
        ul.innerHTML = html;
      }
      setProgress("progTasks", "cntTasks", done, arr.length, "feitas");
    }

    function renderSummary() {
      const shopPend = state.shopping.filter((x) => !x.done).length;
      const openBills = state.bills.filter((x) => !x.paid);
      const openTotal = openBills.reduce((s, x) => s + Number(x.amount || 0), 0);
      const now = todayStr();
      const nextAppts = state.appts.filter((x) => !x.done && x.date >= now).length;
      const tasksPend = state.tasks.filter((x) => !x.done).length;

      $("#docSummary").innerHTML = `
        <div class="cd-mini">
          <div class="cd-mini-k">🛒 A comprar</div>
          <div class="cd-mini-v">${shopPend}</div>
          <div class="cd-mini-d">${shopPend === 1 ? "item pendente" : "itens pendentes"}</div>
        </div>
        <div class="cd-mini">
          <div class="cd-mini-k">💸 Contas em aberto</div>
          <div class="cd-mini-v">${brl(openTotal)}</div>
          <div class="cd-mini-d">${openBills.length} ${openBills.length === 1 ? "conta" : "contas"}</div>
        </div>
        <div class="cd-mini">
          <div class="cd-mini-k">📌 Próximos compromissos</div>
          <div class="cd-mini-v">${nextAppts}</div>
          <div class="cd-mini-d">a partir de hoje</div>
        </div>
        <div class="cd-mini">
          <div class="cd-mini-k">✅ Tarefas pendentes</div>
          <div class="cd-mini-v">${tasksPend}</div>
          <div class="cd-mini-d">nesta semana</div>
        </div>`;
    }

    function renderAll() {
      renderShopping();
      renderBills();
      renderAppts();
      renderTasks();
      renderSummary();
    }

    /* adicionar */
    $("#formLista").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#inputLista").value.trim();
      if (!name) return;
      state.shopping.unshift({ id: uid(), name, qty: Math.max(1, Number($("#inputQtd").value) || 1), done: false });
      persist("shopping"); renderShopping(); renderSummary();
      $("#inputLista").value = ""; $("#inputQtd").value = 1; $("#inputLista").focus();
    });

    $("#formBills").addEventListener("submit", (e) => {
      e.preventDefault();
      const desc = $("#inputBill").value.trim();
      const amount = Number($("#inputAmount").value);
      const due = $("#inputDue").value;
      if (!desc || !(amount > 0) || !due) {
        toast("Faltam dados", "Preencha descrição, valor e vencimento.");
        return;
      }
      state.bills.unshift({ id: uid(), desc, amount, due, paid: false });
      persist("bills"); renderBills(); renderSummary();
      $("#inputBill").value = ""; $("#inputAmount").value = ""; $("#inputDue").value = "";
      $("#inputBill").focus();
    });

    $("#formAppts").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#inputAppt").value.trim();
      const date = $("#inputApptDate").value;
      const time = $("#inputApptTime").value;
      if (!title || !date) {
        toast("Faltam dados", "Informe o título e a data do compromisso.");
        return;
      }
      state.appts.push({ id: uid(), title, date, time, done: false });
      persist("appts"); renderAppts(); renderSummary();
      $("#inputAppt").value = ""; $("#inputApptDate").value = ""; $("#inputApptTime").value = "";
      $("#inputAppt").focus();
    });

    $("#formTasks").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#inputTask").value.trim();
      if (!title) return;
      state.tasks.push({ id: uid(), title, day: Number($("#inputDay").value), done: false });
      persist("tasks"); renderTasks(); renderSummary();
      $("#inputTask").value = ""; $("#inputTask").focus();
    });

    /* marcar e excluir */
    document.addEventListener("change", (e) => {
      const chk = e.target.closest("[data-toggle]");
      if (!chk) return;
      const name = chk.dataset.toggle;
      const item = stores[name].arr.find((x) => x.id === chk.dataset.id);
      if (!item) return;
      if (name === "bills") item.paid = chk.checked;
      else item.done = chk.checked;
      persist(name);
      renderAll();
    });

    document.addEventListener("click", (e) => {
      const del = e.target.closest("[data-del]");
      if (del) {
        const name = del.dataset.del;
        stores[name].arr = stores[name].arr.filter((x) => x.id !== del.dataset.id);
        persist(name);
        renderAll();
        return;
      }

      const clear = e.target.closest("[data-clear]");
      if (clear) {
        const name = clear.dataset.clear;
        stores[name].arr = stores[name].arr.filter((x) => !isDone(name, x));
        persist(name);
        renderAll();
        toast("Lista organizada", "Os itens concluídos foram removidos.");
      }
    });

    renderAll();
  }

  /* ==========================================================
     TELA 3 — FAQ
     ========================================================== */
  if (page === "faq") {
    const FAQ = [
      { q: "Como funciona o agendamento para usar o sistema?",
        a: "Você escolhe o tipo de atendimento, a data e um horário livre. Assim que confirmar, recebe um protocolo e o horário fica bloqueado para outra pessoa. O retorno chega pelo WhatsApp informado." },
      { q: "Preciso pagar para testar?",
        a: "Não. A demonstração guiada é gratuita e serve justamente para você conhecer o sistema antes de decidir qualquer coisa. Nenhum dado de cartão é pedido nessa etapa." },
      { q: "Quais informações ficam salvas na minha conta?",
        a: "Apenas o que você digita: nome, e-mail, WhatsApp e os itens das listas, contas, compromissos e tarefas. Nesta versão os dados ficam salvos no seu próprio navegador." },
      { q: "Os dados dos documentos ficam seguros?",
        a: "Sim. O conteúdo é guardado localmente no seu dispositivo e não é enviado para terceiros. Se você limpar os dados do navegador, as listas também são apagadas — vale exportar o que for importante." },
      { q: "Posso compartilhar a lista de compras com minha família?",
        a: "Sim. Você pode abrir a lista no celular de outra pessoa da casa e cadastrar os mesmos itens, ou enviar a lista por mensagem. O compartilhamento automático entre contas está previsto para as próximas versões." },
      { q: "Quantas pessoas podem usar a mesma casa no plano?",
        a: "Não há limite de moradores no cadastro da casa: você informa quantas pessoas vivem ali e organiza as tarefas entre elas. Cada pessoa pode ter seu próprio acesso." },
      { q: "Como recebo lembretes de contas a pagar?",
        a: "As contas aparecem com etiqueta \"Vence hoje\" ou \"Atrasada\" no painel. Avisos automáticos por WhatsApp ou e-mail dependem da ativação no momento do agendamento." },
      { q: "Posso editar ou excluir um agendamento?",
        a: "Excluir, sim: basta tocar em \"Cancelar\" no card do agendamento e o horário volta a ficar disponível. Para remarcar, cancele e crie um novo — assim a agenda nunca fica com horários duplicados." },
      { q: "O sistema funciona no celular?",
        a: "Funciona. A tela se adapta a celulares e tablets, com as mesmas funções do computador, incluindo as listas e o agendamento." },
      { q: "Como cancelo a assinatura?",
        a: "Não existe fidelidade. Você pode cancelar pelo próprio painel ou falando com o atendimento, e o acesso continua até o fim do período já pago. Seus dados podem ser exportados antes do encerramento." }
    ];

    function renderFaq(filter) {
      const term = (filter || "").toLowerCase().trim();
      const list = FAQ.filter((f) =>
        !term || f.q.toLowerCase().includes(term) || f.a.toLowerCase().includes(term));
      const wrap = $("#faqList");

      if (!list.length) {
        wrap.innerHTML = `<div class="cd-empty">🔍 Nenhuma pergunta encontrada para "${esc(filter)}".<br>Tente outra palavra ou fale com o atendimento.</div>`;
        return;
      }

      wrap.innerHTML = list.map((f) => `
        <div class="cd-faq">
          <button type="button" class="cd-faq-q" aria-expanded="false">
            <span>${esc(f.q)}</span>
            <span class="cd-faq-plus" aria-hidden="true">+</span>
          </button>
          <div class="cd-faq-a"><p>${esc(f.a)}</p></div>
        </div>
      `).join("");
    }

    $("#faqList").addEventListener("click", (e) => {
      const btn = e.target.closest(".cd-faq-q");
      if (!btn) return;

      const item = btn.parentElement;
      const body = item.querySelector(".cd-faq-a");
      const isOpen = item.classList.contains("open");

      document.querySelectorAll(".cd-faq.open").forEach((o) => {
        o.classList.remove("open");
        o.querySelector(".cd-faq-a").style.maxHeight = "0px";
        o.querySelector(".cd-faq-q").setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        item.classList.add("open");
        body.style.maxHeight = body.scrollHeight + "px";
        btn.setAttribute("aria-expanded", "true");
      }
    });

    $("#faqSearch").addEventListener("input", (e) => renderFaq(e.target.value));

    /* abre já filtrado quando vem de um link com ?q= */
    const termo = params.get("q");
    if (termo) {
      $("#faqSearch").value = termo;
      renderFaq(termo);
    } else {
      renderFaq("");
    }
  }
})();