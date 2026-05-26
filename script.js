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
  "kayitForm",
  "kayitStatus",
  "Başvurun bize ulaştı, aramıza hoş geldin! En kısa sürede WhatsApp grubuna eklenmen için seninle iletişime geçeceğiz. İyi ki Beeky."
);
setupForm(
  "iletisimForm",
  "iletisimStatus",
  "Mesajın bize ulaştı. En kısa sürede dönüş yapacağız. Teşekkürler!"
);
