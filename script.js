/* ============================================================
   Beeky Run Club — paylaşılan script
   Tüm sayfalar bu dosyayı kullanır; her blok ilgili öğe
   sayfada yoksa sessizce atlanır.
   ============================================================ */

// Yıl bilgisi (footer)
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

// Bir sonraki koşu widget'ı — yalnızca ana sayfada bulunur
(function () {
  const dayEl = document.getElementById("nextDay");
  const timeEl = document.getElementById("nextTime");
  if (!dayEl || !timeEl) return;

  const now = new Date();
  const day = now.getDay(); // 0 Paz, 3 Çar
  const hour = now.getHours();

  let next = "ÇARŞAMBA";
  let time = "21:00";

  const nextWed = new Date(now);
  nextWed.setDate(now.getDate() + ((3 - day + 7) % 7 || 7));
  nextWed.setHours(21, 0, 0, 0);
  if (day === 3 && hour < 21) { nextWed.setDate(now.getDate()); nextWed.setHours(21, 0, 0, 0); }

  const nextSun = new Date(now);
  nextSun.setDate(now.getDate() + ((0 - day + 7) % 7 || 7));
  nextSun.setHours(9, 0, 0, 0);
  if (day === 0 && hour < 9) { nextSun.setDate(now.getDate()); nextSun.setHours(9, 0, 0, 0); }

  if (nextSun < nextWed) { next = "PAZAR"; time = "09:00"; }

  dayEl.textContent = next;
  timeEl.textContent = time;
})();

// Scroll ile beliren öğeler
(function () {
  const reveals = document.querySelectorAll(".reveal");
  if (!reveals.length) return;

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in-view");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach(function (r) { io.observe(r); });
})();

// Mobil menü bağlantıya tıklayınca kapansın
(function () {
  document.querySelectorAll("#navLinks a").forEach(function (a) {
    a.addEventListener("click", function () {
      const links = document.getElementById("navLinks");
      if (links) links.classList.remove("open");
    });
  });
})();

// ===== Form gönderimi — Google Apps Script'e =====
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXcrjk5g0BcFdSRzLolf0KUsEIFjc3ds4KQJO2TkeLerR0j7Q0I9_wxpyh_Ra36hyR3Q/exec";

function setupForm(formId, statusId, successMsg) {
  const form = document.getElementById(formId);
  if (!form) return;
  const status = document.getElementById(statusId);
  const btn = form.querySelector("button[type=submit]");
  const btnText = btn.textContent;

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // KVKK onayı — elle kontrol
    const kvkk = form.querySelector('input[name="kvkk_onay"]');
    if (kvkk && !kvkk.checked) {
      status.textContent = "Kaydını tamamlamak için KVKK Aydınlatma Metni'ni onaylaman gerekiyor.";
      status.className = "form-status err show";
      kvkk.focus();
      status.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    btn.disabled = true;
    btn.textContent = "GÖNDERİLİYOR...";
    status.className = "form-status";

    fetch(SCRIPT_URL, {
      method: "POST",
      body: new FormData(form)
    })
      .then(function () {
        status.textContent = successMsg;
        status.className = "form-status ok show";
        form.reset();
      })
      .catch(function () {
        status.textContent = "Bir sorun oluştu. Lütfen tekrar dene veya info@beekyrunclub.com adresine yaz.";
        status.className = "form-status err show";
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = btnText;
      });
  });
}

setupForm(
  "iletisimForm",
  "iletisimStatus",
  "Mesajın bize ulaştı. En kısa sürede dönüş yapacağız. Teşekkürler!"
);

// ===== Kayıt sihirbazı (modal, 3 adım) =====
(function () {
  const modal = document.getElementById("kayitModal");
  const form = document.getElementById("kayitForm");
  if (!modal || !form) return;

  const openBtn = document.getElementById("kayitAc");
  const closeEls = modal.querySelectorAll("[data-close-modal]");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const bar = document.getElementById("wizardBar");
  const stepLabel = document.getElementById("wizardStep");
  const backBtn = document.getElementById("wizardGeri");
  const nextBtn = document.getElementById("wizardIleri");
  const sendBtn = document.getElementById("wizardGonder");
  const status = document.getElementById("kayitStatus");
  const successBox = document.getElementById("kayitSuccess");
  const successMsg = document.getElementById("kayitSuccessMsg");
  const TOTAL = steps.length;

  let current = 1;
  let lastFocus = null;

  function showStep(n) {
    current = n;
    steps.forEach(function (s) {
      s.hidden = Number(s.dataset.step) !== n;
    });
    bar.style.width = (n / TOTAL) * 100 + "%";
    stepLabel.textContent = n;
    backBtn.disabled = n === 1;
    nextBtn.hidden = n === TOTAL;
    sendBtn.hidden = n !== TOTAL;
    status.className = "form-status";
    status.textContent = "";
    const firstField = steps[n - 1].querySelector("input, select, textarea");
    if (firstField) firstField.focus();
  }

  // sadece görünen adımdaki zorunlu alanları doğrula
  function validateStep(n) {
    const fields = steps[n - 1].querySelectorAll("input, select, textarea");
    for (const f of fields) {
      if (!f.checkValidity()) {
        f.reportValidity();
        return false;
      }
    }
    return true;
  }

  function openModal() {
    lastFocus = document.activeElement;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-lock");
    form.hidden = false;
    successBox.hidden = true;
    showStep(1);
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-lock");
    if (lastFocus) lastFocus.focus();
  }

  openBtn.addEventListener("click", openModal);
  closeEls.forEach(function (el) {
    el.addEventListener("click", closeModal);
  });

  // dışına tıklayınca kapat
  modal.addEventListener("mousedown", function (ev) {
    if (ev.target === modal) closeModal();
  });

  // ESC ile kapat
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  nextBtn.addEventListener("click", function () {
    if (validateStep(current)) showStep(current + 1);
  });

  backBtn.addEventListener("click", function () {
    if (current > 1) showStep(current - 1);
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!validateStep(current)) return;

    const kvkk = form.querySelector('input[name="kvkk_onay"]');
    if (kvkk && !kvkk.checked) {
      status.textContent = "Kaydını tamamlamak için KVKK Aydınlatma Metni'ni onaylaman gerekiyor.";
      status.className = "form-status err show";
      kvkk.focus();
      return;
    }

    sendBtn.disabled = true;
    backBtn.disabled = true;
    sendBtn.textContent = "GÖNDERİLİYOR...";
    status.className = "form-status";

    fetch(SCRIPT_URL, {
      method: "POST",
      body: new FormData(form)
    })
      .then(function () {
        form.hidden = true;
        successMsg.textContent =
          "Başvurun bize ulaştı. En kısa sürede WhatsApp grubuna eklenmen için seninle iletişime geçeceğiz. İyi ki Beeky.";
        successBox.hidden = false;
        form.reset();
      })
      .catch(function () {
        status.textContent =
          "Bir sorun oluştu. Lütfen tekrar dene veya info@beekyrunclub.com adresine yaz.";
        status.className = "form-status err show";
      })
      .finally(function () {
        sendBtn.disabled = false;
        backBtn.disabled = false;
        sendBtn.textContent = "KAYIT OL →";
      });
  });
})();
