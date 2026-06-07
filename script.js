/* ============================================================
   Beeky Run Club — paylaşılan script
   Tüm sayfalar bu dosyayı kullanır; her blok ilgili öğe
   sayfada yoksa sessizce atlanır.
   ============================================================ */

/* ===== Supabase bağlantısı (tüm sayfalarda ortak) ===== */
const SUPABASE_URL = "https://oyuiyacaujwfhqsocjca.supabase.co";
const SUPABASE_KEY = "sb_publishable_qERySPbgx77AbkBgcKE9mA_TZme00aW";
const sb = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

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

/* ===== Navigasyonu giriş durumuna göre güncelle =====
   Giriş yoksa: "Giriş" linki eklenir.
   Giriş varsa: "Kayıt" gizlenir, "Profilim" + "Çıkış" eklenir. */
async function updateAuthUI() {
  const nav = document.getElementById("navLinks");
  if (!nav || !sb) return;

  const { data: { session } } = await sb.auth.getSession();

  // önceki auth öğelerini temizle
  nav.querySelectorAll(".auth-item").forEach((el) => el.remove());

  const kayitLink = nav.querySelector('a[href="index.html#kayit"]');
  const kayitLi = kayitLink ? kayitLink.closest("li") : null;

  if (session) {
    if (kayitLi) kayitLi.style.display = "none";

    const liProfil = document.createElement("li");
    liProfil.className = "auth-item";
    liProfil.innerHTML = '<a href="profil.html">Profilim</a>';

    const liCikis = document.createElement("li");
    liCikis.className = "auth-item";
    const aCikis = document.createElement("a");
    aCikis.href = "#";
    aCikis.textContent = "Çıkış";
    aCikis.addEventListener("click", async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
      window.location.href = "index.html";
    });
    liCikis.appendChild(aCikis);

    nav.appendChild(liProfil);
    nav.appendChild(liCikis);
  } else {
    if (kayitLi) kayitLi.style.display = "";

    const liGiris = document.createElement("li");
    liGiris.className = "auth-item";
    liGiris.innerHTML = '<a href="giris.html">Giriş</a>';
    nav.appendChild(liGiris);
  }
}
updateAuthUI();

// ===== Form gönderimi — Google Apps Script'e (iletişim formu) =====
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

// ===== Kayıt sihirbazı (modal, 3 adım) — artık GERÇEK HESAP açar =====
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

  modal.addEventListener("mousedown", function (ev) {
    if (ev.target === modal) closeModal();
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  nextBtn.addEventListener("click", function () {
    if (validateStep(current)) showStep(current + 1);
  });

  backBtn.addEventListener("click", function () {
    if (current > 1) showStep(current - 1);
  });

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    if (!validateStep(current)) return;

    const kvkk = form.querySelector('input[name="kvkk_onay"]');
    if (kvkk && !kvkk.checked) {
      status.textContent = "Kaydını tamamlamak için KVKK Aydınlatma Metni'ni onaylaman gerekiyor.";
      status.className = "form-status err show";
      kvkk.focus();
      return;
    }

    if (!sb) {
      status.textContent = "Bağlantı kurulamadı. Sayfayı yenileyip tekrar dene.";
      status.className = "form-status err show";
      return;
    }

    // Form alanlarını oku
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value;
    const ad = form.querySelector('input[name="ad_soyad"]').value.trim();
    const tel = form.querySelector('input[name="telefon"]').value.trim();
    const yasEl = form.querySelector('[name="yas_araligi"]');
    const tempoEl = form.querySelector('[name="tempo_seviyesi"]');
    const bultenEl = form.querySelector('input[name="bulten_izni"]');
    const yas = yasEl ? yasEl.value : "";
    const tempo = tempoEl ? tempoEl.value : "";
    const bulten = bultenEl ? bultenEl.checked : false;

    sendBtn.disabled = true;
    backBtn.disabled = true;
    sendBtn.textContent = "GÖNDERİLİYOR...";
    status.className = "form-status";

    function resetBtns() {
      sendBtn.disabled = false;
      backBtn.disabled = false;
      sendBtn.textContent = "KAYIT OL →";
    }

    // 1) Auth hesabı oluştur
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
      resetBtns();
      status.textContent = /already|registered/i.test(error.message)
        ? "Bu e-posta zaten kayıtlı. 'Giriş' sayfasından giriş yapabilirsin."
        : "Kayıt hatası: " + error.message;
      status.className = "form-status err show";
      return;
    }

    // E-posta onayı açıksa session gelmez
    if (!data.session) {
      resetBtns();
      status.textContent = "Hesabın oluşturuldu. Girişini tamamlamak için e-postana gelen onay bağlantısına tıkla.";
      status.className = "form-status ok show";
      return;
    }

    // 2) Profil satırını kaydet
    const { error: pErr } = await sb.from("profiles").insert({
      id: data.user.id,
      ad_soyad: ad,
      telefon: tel || null,
      yas_araligi: yas || null,
      tempo_seviyesi: tempo || null,
      bulten_izni: bulten
    });
    if (pErr) {
      resetBtns();
      status.textContent = "Profil kaydedilemedi: " + pErr.message;
      status.className = "form-status err show";
      return;
    }

    // 3) Eski bildirim akışını da besle (şifre HARİÇ) — beklemeden, en iyi çaba
    try {
      const fd = new FormData(form);
      fd.delete("password");
      fetch(SCRIPT_URL, { method: "POST", body: fd });
    } catch (e) { /* sessizce geç */ }

    // 4) Başarı
    form.hidden = true;
    successMsg.textContent =
      "Aramıza hoş geldin! Hesabın oluşturuldu ve giriş yaptın. İyi ki Beeky.";
    successBox.hidden = false;
    resetBtns();
    updateAuthUI();
  });
})();

// ===== Giriş sayfası (giris.html) =====
(function () {
  const form = document.getElementById("loginForm");
  if (!form || !sb) return;
  const status = document.getElementById("loginStatus");
  const btn = form.querySelector("button[type=submit]");

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    const email = document.getElementById("liMail").value.trim();
    const pass = document.getElementById("liPass").value;
    if (!email || !pass) {
      status.textContent = "E-posta ve şifre gerekli.";
      status.className = "form-status err show";
      return;
    }
    const t = btn.textContent;
    btn.disabled = true;
    btn.textContent = "GİRİŞ YAPILIYOR...";
    status.className = "form-status";

    const { error } = await sb.auth.signInWithPassword({ email, password: pass });

    btn.disabled = false;
    btn.textContent = t;
    if (error) {
      status.textContent = /invalid|credentials/i.test(error.message)
        ? "E-posta veya şifre hatalı."
        : "Giriş hatası: " + error.message;
      status.className = "form-status err show";
      return;
    }
    window.location.href = "profil.html";
  });
})();

// ===== Profil sayfası (profil.html) — giriş yoksa yönlendir =====
(async function () {
  const page = document.getElementById("profilPage");
  if (!page || !sb) return;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = "giris.html";
    return;
  }

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText("pEmail", session.user.email || "—");

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!error && data) {
    setText("pAd", data.ad_soyad || "—");
    setText("pTel", data.telefon || "—");
    setText("pYas", data.yas_araligi || "—");
    setText("pTempo", data.tempo_seviyesi || "—");
  }
})();
