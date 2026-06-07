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

/* Supabase auth state değişikliklerini reaktif izle.
   SIGNED_IN: direkt giriş veya e-posta onayı sonrası otomatik oturum.
   Her iki durumda da bekleyen profil varsa oluştur. */
if (sb) {
  sb.auth.onAuthStateChange(async function (event, session) {
    if (event === "SIGNED_IN" && session) {
      const raw = localStorage.getItem("beeky_pending_profile");
      if (raw) {
        try {
          const profileData = JSON.parse(raw);
          const { data: existing } = await sb
            .from("profiles")
            .select("id")
            .eq("id", session.user.id)
            .single();
          if (!existing) {
            await sb.from("profiles").insert({ id: session.user.id, ...profileData });
          }
        } catch (_e) { /* sessizce geç */ }
        localStorage.removeItem("beeky_pending_profile");
      }
      updateAuthUI();
    } else if (event === "PASSWORD_RECOVERY") {
      // E-posta sıfırlama linki tıklandı; sifre-sifirla.html'deyse formu aç, değilse oraya yönlendir
      if (typeof window._beekyPasswordRecovery === "function") {
        window._beekyPasswordRecovery();
      } else if (!window.location.pathname.includes("sifre-sifirla")) {
        window.location.href = "sifre-sifirla.html";
      }
    } else if (event === "SIGNED_OUT") {
      updateAuthUI();
    }
  });
}

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
    const yasEl     = form.querySelector('[name="yas_araligi"]');
    const tempoEl   = form.querySelector('[name="tempo_seviyesi"]');
    const bultenEl  = form.querySelector('input[name="bulten_izni"]');
    const katilimEl = form.querySelector('input[name="katilim"]:checked');
    const yas     = yasEl     ? yasEl.value     : "";
    const tempo   = tempoEl   ? tempoEl.value   : "";
    const bulten  = bultenEl  ? bultenEl.checked : false;
    const katilim = katilimEl ? katilimEl.value  : "";

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

    // E-posta onayı açıksa session gelmez — profil verisini sonrası için sakla
    if (!data.session) {
      localStorage.setItem("beeky_pending_profile", JSON.stringify({
        ad_soyad:        ad,
        telefon:         tel || null,
        yas_araligi:     yas || null,
        tempo_seviyesi:  tempo || null,
        katilim_tercihi: katilim || null,
        bulten_izni:     bulten
      }));
      resetBtns();
      status.textContent = "Hesabın oluşturuldu. Girişini tamamlamak için e-postana gelen onay bağlantısına tıkla.";
      status.className = "form-status ok show";
      return;
    }

    // 2) Profil satırını kaydet
    const { error: pErr } = await sb.from("profiles").insert({
      id:              data.user.id,
      ad_soyad:        ad,
      telefon:         tel || null,
      yas_araligi:     yas || null,
      tempo_seviyesi:  tempo || null,
      katilim_tercihi: katilim || null,
      bulten_izni:     bulten
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

// ===== Profil sayfası (profil.html) =====
(async function () {
  const page = document.getElementById("profilPage");
  if (!page || !sb) return;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = "giris.html"; return; }

  const userId = session.user.id;
  let profile = null;

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setVal  = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };

  // --- Profil yükle & ekrana yaz ---
  async function loadProfile() {
    setText("pEmail", session.user.email || "—");
    const { data, error } = await sb.from("profiles").select("*").eq("id", userId).single();
    if (!error && data) {
      profile = data;
      setText("pAd",      data.ad_soyad        || "—");
      setText("pTel",     data.telefon          || "—");
      setText("pYas",     data.yas_araligi      || "—");
      setText("pTempo",   data.tempo_seviyesi   || "—");
      setText("pKatilim", data.katilim_tercihi  || "—");
      setText("pBulten",  data.bulten_izni ? "Evet" : "Hayır");

    }
  }
  await loadProfile();

  // --- Düzenleme toggle ---
  const editBtn      = document.getElementById("editBtn");
  const editCancel   = document.getElementById("editCancel");
  const profilView   = document.getElementById("profilView");
  const editWrap     = document.getElementById("profilEditWrap");
  const editStatus   = document.getElementById("editStatus");

  function openEdit() {
    if (profile) {
      setVal("eAd",      profile.ad_soyad);
      setVal("eTel",     profile.telefon);
      setVal("eYas",     profile.yas_araligi);
      setVal("eTempo",   profile.tempo_seviyesi);
      setVal("eKatilim", profile.katilim_tercihi);
      const bultenEl = document.getElementById("eBulten");
      if (bultenEl) bultenEl.checked = !!profile.bulten_izni;
    }
    profilView.hidden = true;
    editWrap.hidden   = false;
    const first = editWrap.querySelector("input, select");
    if (first) first.focus();
  }

  function closeEdit() {
    profilView.hidden = false;
    editWrap.hidden   = true;
    if (editStatus) { editStatus.className = "form-status"; editStatus.textContent = ""; }
  }

  if (editBtn)    editBtn.addEventListener("click", openEdit);
  if (editCancel) editCancel.addEventListener("click", closeEdit);

  // --- Profil güncelleme ---
  const editForm = document.getElementById("profilEditForm");
  if (editForm && editStatus) {
    editForm.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const btn = editForm.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "KAYDEDİLİYOR...";
      editStatus.className = "form-status";

      const updates = {
        ad_soyad:         document.getElementById("eAd").value.trim(),
        telefon:          document.getElementById("eTel").value.trim() || null,
        yas_araligi:      document.getElementById("eYas").value || null,
        tempo_seviyesi:   document.getElementById("eTempo").value || null,
        katilim_tercihi:  document.getElementById("eKatilim").value || null,
        bulten_izni:      document.getElementById("eBulten").checked
      };

      if (!updates.ad_soyad) {
        editStatus.textContent = "Ad Soyad boş bırakılamaz.";
        editStatus.className = "form-status err show";
        btn.disabled = false; btn.textContent = "KAYDET →";
        return;
      }

      const { error } = await sb.from("profiles").update(updates).eq("id", userId);
      btn.disabled = false; btn.textContent = "KAYDET →";

      if (error) {
        editStatus.textContent = "Hata: " + error.message;
        editStatus.className = "form-status err show";
        return;
      }

      profile = { ...profile, ...updates };
      await loadProfile();
      closeEdit();
    });
  }

  // --- Yarış Takvimi ---
  const MONTHS = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

  async function loadRaces() {
    const listEl = document.getElementById("racesList");
    if (!listEl) return;

    const today = new Date().toISOString().slice(0, 10);
    const [racesRes, entriesRes] = await Promise.all([
      sb.from("races").select("*").order("tarih"),
      sb.from("race_entries").select("race_id, mesafe_secimi").eq("user_id", userId)
    ]);

    if (racesRes.error || !racesRes.data || racesRes.data.length === 0) {
      listEl.innerHTML = `
        <div class="race-empty">
          <div class="race-empty-icon">🏁</div>
          <h3>Yakında yarış takvimi</h3>
          <p>Kulüp olarak katılacağımız yarışlar burada görünecek.</p>
        </div>`;
      return;
    }

    const races = racesRes.data;

    // { raceId: { mesafe: "21K" | null } }
    const joined = {};
    (entriesRes.data || []).forEach(e => { joined[e.race_id] = { mesafe: e.mesafe_secimi }; });

    // Mesafe seçici açık yarış id'leri
    const pickerOpen = new Set();

    function renderRaces() {
      listEl.innerHTML = races.map(race => {
        const past        = race.tarih < today;
        const isJoined    = !!joined[race.id];
        const myDist      = isJoined ? joined[race.id].mesafe : null;
        const hasDists    = Array.isArray(race.mesafeler) && race.mesafeler.length > 0;
        const showPicker  = !past && !isJoined && pickerOpen.has(race.id);

        const d = new Date(race.tarih + "T00:00:00");
        const metaParts = [race.konum, hasDists ? race.mesafeler.join(" / ") : null].filter(Boolean);

        const pickerHtml = showPicker ? `
          <div class="race-dist-picker">
            <span class="race-pick-label">Mesafe:</span>
            <div class="race-dist-opts">
              ${race.mesafeler.map(m =>
                `<button class="race-dist-opt" data-action="pick" data-race-id="${race.id}" data-dist="${m}">${m}</button>`
              ).join("")}
            </div>
            <button class="race-cancel-dist" data-action="cancel" data-race-id="${race.id}">İptal</button>
          </div>` : "";

        let ctrlHtml = "";
        if (!past) {
          if (isJoined) {
            ctrlHtml = `
              <div class="race-joined-info">✓ Katılıyorum${myDist ? ` · ${myDist}` : ""}</div>
              <button class="race-join-btn leave" data-action="leave" data-race-id="${race.id}">Vazgeç</button>`;
          } else if (!showPicker) {
            ctrlHtml = `<button class="race-join-btn" data-action="join" data-race-id="${race.id}">Katılacağım →</button>`;
          }
        }

        return `
          <div class="race-card ${isJoined ? "joined" : ""} ${past ? "race-past" : ""}" data-race-id="${race.id}">
            <div class="race-date"><span class="d">${d.getDate()}</span><span class="m">${MONTHS[d.getMonth()]}</span></div>
            <div class="race-body">
              <div class="race-name">${race.isim}</div>
              ${metaParts.length ? `<div class="race-meta">${metaParts.join(" · ")}</div>` : ""}
              ${pickerHtml}
            </div>
            <div class="race-ctrl">${ctrlHtml}</div>
          </div>`;
      }).join("");
    }

    renderRaces();

    listEl.addEventListener("click", async function (ev) {
      const target = ev.target.closest("[data-action]");
      if (!target || target.disabled) return;

      const action  = target.dataset.action;
      const raceId  = target.dataset.raceId;
      const race    = races.find(r => r.id === raceId);
      if (!race) return;

      const hasDists = Array.isArray(race.mesafeler) && race.mesafeler.length > 0;
      target.disabled = true;

      if (action === "join") {
        if (hasDists) {
          pickerOpen.add(raceId);
          renderRaces();
        } else {
          const { error } = await sb.from("race_entries")
            .upsert({ user_id: userId, race_id: raceId, mesafe_secimi: null }, { onConflict: "user_id,race_id" });
          if (!error) joined[raceId] = { mesafe: null };
          renderRaces();
        }
      } else if (action === "pick") {
        const dist = target.dataset.dist;
        const { error } = await sb.from("race_entries")
          .upsert({ user_id: userId, race_id: raceId, mesafe_secimi: dist }, { onConflict: "user_id,race_id" });
        if (!error) { joined[raceId] = { mesafe: dist }; pickerOpen.delete(raceId); }
        renderRaces();
      } else if (action === "cancel") {
        pickerOpen.delete(raceId);
        renderRaces();
      } else if (action === "leave") {
        const { error } = await sb.from("race_entries")
          .delete().eq("user_id", userId).eq("race_id", raceId);
        if (!error) delete joined[raceId];
        renderRaces();
      }
    });
  }

  await loadRaces();

  // --- Admin paneli (yalnızca is_admin kullanıcılar için) ---
  async function setupAdminPanel() {
    const panel = document.getElementById("adminPanel");
    if (!panel) return;
    panel.hidden = false;

    const MONTHS_A = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
    const apForm       = document.getElementById("apForm");
    const apFormTitle  = document.getElementById("apFormTitle");
    const apFormStatus = document.getElementById("apFormStatus");
    const apSubmitBtn  = document.getElementById("apSubmitBtn");
    const apCancelBtn  = document.getElementById("apCancelBtn");
    const apListEl     = document.getElementById("apRaceList");

    let apAllRaces  = [];
    let apEditingId = null;

    function apGetFormData() {
      return {
        isim:      document.getElementById("apIsim").value.trim(),
        tarih:     document.getElementById("apTarih").value,
        konum:     document.getElementById("apKonum").value.trim() || null,
        url:       document.getElementById("apUrl").value.trim() || null,
        mesafeler: document.getElementById("apMesafeler").value
          .split(",").map(s => s.trim()).filter(Boolean)
      };
    }

    function apFillForm(race) {
      document.getElementById("apIsim").value      = race.isim  || "";
      document.getElementById("apTarih").value     = race.tarih || "";
      document.getElementById("apKonum").value     = race.konum || "";
      document.getElementById("apUrl").value       = race.url   || "";
      document.getElementById("apMesafeler").value = (race.mesafeler || []).join(", ");
      apEditingId = race.id;
      apFormTitle.innerHTML = `Yarışı <em>düzenle.</em>`;
      apSubmitBtn.textContent = "GÜNCELLE →";
      apCancelBtn.hidden = false;
      apFormStatus.className = "form-status";
      document.getElementById("apIsim").focus();
    }

    function apResetForm() {
      apForm.reset();
      apEditingId = null;
      apFormTitle.innerHTML = `Yeni Yarış <em>ekle.</em>`;
      apSubmitBtn.textContent = "EKLE →";
      apCancelBtn.hidden = true;
      apFormStatus.className = "form-status";
      apFormStatus.textContent = "";
    }

    if (apCancelBtn) apCancelBtn.addEventListener("click", apResetForm);

    async function apLoadRaces() {
      apListEl.innerHTML = '<p style="opacity:.6;font-size:.9rem;">Yükleniyor...</p>';
      const { data, error } = await sb.from("races").select("*").order("tarih");

      if (error || !data) {
        apListEl.innerHTML = `<p style="color:#bf3b3b;">Yüklenemedi: ${error?.message || ""}</p>`;
        return;
      }

      apAllRaces = data;
      const today = new Date().toISOString().slice(0, 10);

      if (data.length === 0) {
        apListEl.innerHTML = '<div class="admin-empty">Henüz yarış eklenmedi.</div>';
        return;
      }

      apListEl.innerHTML = data.map(race => {
        const d       = new Date(race.tarih + "T00:00:00");
        const dateStr = `${d.getDate()} ${MONTHS_A[d.getMonth()]} ${d.getFullYear()}`;
        const past    = race.tarih < today;
        const dists   = (race.mesafeler || []).map(m => `<span class="dist-tag">${m}</span>`).join("");

        return `
          <div class="race-admin-card ${past ? "past" : ""}">
            <div class="race-admin-info">
              <div class="race-admin-name">${race.isim}</div>
              <div class="race-admin-meta">${dateStr}${race.konum ? " · " + race.konum : ""}</div>
              ${dists ? `<div class="race-admin-dists">${dists}</div>` : ""}
            </div>
            <div class="race-admin-actions">
              <button class="btn-ghost sm" data-ap-edit="${race.id}">Düzenle</button>
              <button class="btn-del" data-ap-del="${race.id}">Sil</button>
            </div>
          </div>`;
      }).join("");
    }

    await apLoadRaces();

    apListEl.addEventListener("click", async function (ev) {
      const editBtn = ev.target.closest("[data-ap-edit]");
      const delBtn  = ev.target.closest("[data-ap-del]");

      if (editBtn) {
        const race = apAllRaces.find(r => r.id === editBtn.dataset.apEdit);
        if (race) { apFillForm(race); apForm.scrollIntoView({ behavior: "smooth" }); }
        return;
      }

      if (delBtn && !delBtn.disabled) {
        const id   = delBtn.dataset.apDel;
        const race = apAllRaces.find(r => r.id === id);
        if (!confirm(`"${race?.isim}" yarışını silmek istediğine emin misin?\nBu işlem geri alınamaz.`)) return;

        delBtn.disabled = true;
        delBtn.textContent = "Siliniyor...";

        const { error } = await sb.from("races").delete().eq("id", id);
        if (error) {
          alert("Silinemedi: " + error.message);
          delBtn.disabled = false;
          delBtn.textContent = "Sil";
        } else {
          if (apEditingId === id) apResetForm();
          await apLoadRaces();
          await loadRaces();
        }
      }
    });

    if (apForm) {
      apForm.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        const payload = apGetFormData();

        if (!payload.isim || !payload.tarih) {
          apFormStatus.textContent = "Yarış adı ve tarih zorunlu.";
          apFormStatus.className = "form-status err show";
          return;
        }

        apSubmitBtn.disabled = true;
        apSubmitBtn.textContent = "KAYDEDİLİYOR...";
        apFormStatus.className = "form-status";

        const { error } = apEditingId
          ? await sb.from("races").update(payload).eq("id", apEditingId)
          : await sb.from("races").insert(payload);

        apSubmitBtn.disabled = false;
        apSubmitBtn.textContent = apEditingId ? "GÜNCELLE →" : "EKLE →";

        if (error) {
          apFormStatus.textContent = "Hata: " + error.message;
          apFormStatus.className = "form-status err show";
          return;
        }

        apResetForm();
        await apLoadRaces();
        await loadRaces();
      });
    }
  }

  if (profile?.is_admin) await setupAdminPanel();
})();

// ===== Şifremi unuttum sayfası (sifremi-unuttum.html) =====
(function () {
  const form = document.getElementById("forgotForm");
  if (!form || !sb) return;

  const status = document.getElementById("forgotStatus");
  const btn = form.querySelector("button[type=submit]");
  const btnText = btn.textContent;

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    const email = document.getElementById("forgotMail").value.trim();
    if (!email) return;

    btn.disabled = true;
    btn.textContent = "GÖNDERİLİYOR...";
    status.className = "form-status";

    const redirectTo = new URL("sifre-sifirla.html", window.location.href).href;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });

    btn.disabled = false;
    btn.textContent = btnText;

    if (error) {
      status.textContent = "Hata: " + error.message;
      status.className = "form-status err show";
      return;
    }

    status.textContent = "Bağlantı gönderildi. E-posta kutunu kontrol et.";
    status.className = "form-status ok show";
    form.reset();
  });
})();

// ===== Şifre sıfırlama sayfası (sifre-sifirla.html) =====
(function () {
  const page = document.getElementById("sifreSifirlaPage");
  if (!page || !sb) return;

  const waiting = document.getElementById("resetWaiting");
  const formWrap = document.getElementById("resetFormWrap");
  const form = document.getElementById("passwordResetForm");
  const status = document.getElementById("resetStatus");
  const btn = form ? form.querySelector("button[type=submit]") : null;

  // onAuthStateChange'den çağrılır; PASSWORD_RECOVERY event'i gelince formu aç
  window._beekyPasswordRecovery = function () {
    if (waiting) waiting.hidden = true;
    if (formWrap) formWrap.hidden = false;
    const firstInput = formWrap && formWrap.querySelector("input");
    if (firstInput) firstInput.focus();
  };

  // Belirli süre içinde event gelmezse doğrudan link açılmış demektir — giriş sayfasına yönlendir
  const fallback = setTimeout(function () {
    window.location.href = "giris.html";
  }, 4000);

  // Eğer onAuthStateChange daha önce çalıştıysa (race condition önlemi)
  sb.auth.getSession().then(function ({ data: { session } }) {
    if (session) {
      clearTimeout(fallback);
      window._beekyPasswordRecovery();
    }
  });

  if (!form || !btn) return;

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    const pass = document.getElementById("newPass").value;
    const confirm = document.getElementById("newPassConfirm").value;

    if (pass !== confirm) {
      status.textContent = "Şifreler eşleşmiyor.";
      status.className = "form-status err show";
      return;
    }

    btn.disabled = true;
    btn.textContent = "GÜNCELLENİYOR...";
    status.className = "form-status";

    const { error } = await sb.auth.updateUser({ password: pass });

    btn.disabled = false;
    btn.textContent = "ŞİFREYİ GÜNCELLE →";

    if (error) {
      status.textContent = "Hata: " + error.message;
      status.className = "form-status err show";
      return;
    }

    status.textContent = "Şifren güncellendi! Yönlendiriliyorsun...";
    status.className = "form-status ok show";
    setTimeout(function () { window.location.href = "profil.html"; }, 2000);
  });
})();

// ===== Admin sayfası (admin.html) — yarış yönetimi =====
(async function () {
  const page = document.getElementById("adminPage");
  if (!page || !sb) return;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = "giris.html"; return; }

  // profiles.is_admin kontrolü — e-posta hardcode değil
  const { data: adminProfile } = await sb
    .from("profiles").select("is_admin").eq("id", session.user.id).single();
  if (!adminProfile?.is_admin) { window.location.href = "index.html"; return; }

  const MONTHS_A = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  const form         = document.getElementById("raceForm");
  const formTitleEl  = document.getElementById("raceFormTitle");
  const formStatus   = document.getElementById("raceFormStatus");
  const submitBtn    = document.getElementById("raceSubmitBtn");
  const cancelBtn    = document.getElementById("raceCancelEdit");
  const listEl       = document.getElementById("adminRaceList");

  let allRaces  = [];
  let editingId = null;

  function getFormData() {
    return {
      isim:      document.getElementById("rIsim").value.trim(),
      tarih:     document.getElementById("rTarih").value,
      konum:     document.getElementById("rKonum").value.trim() || null,
      url:       document.getElementById("rUrl").value.trim() || null,
      mesafeler: document.getElementById("rMesafeler").value
        .split(",").map(s => s.trim()).filter(Boolean)
    };
  }

  function fillForm(race) {
    document.getElementById("rIsim").value      = race.isim  || "";
    document.getElementById("rTarih").value     = race.tarih || "";
    document.getElementById("rKonum").value     = race.konum || "";
    document.getElementById("rUrl").value       = race.url   || "";
    document.getElementById("rMesafeler").value = (race.mesafeler || []).join(", ");
    editingId = race.id;
    formTitleEl.innerHTML = `Yarışı <em>düzenle.</em>`;
    submitBtn.textContent = "GÜNCELLE →";
    cancelBtn.hidden = false;
    formStatus.className = "form-status";
    document.getElementById("rIsim").focus();
  }

  function resetForm() {
    form.reset();
    editingId = null;
    formTitleEl.innerHTML = `Yeni Yarış <em>ekle.</em>`;
    submitBtn.textContent = "EKLE →";
    cancelBtn.hidden = true;
    formStatus.className = "form-status";
    formStatus.textContent = "";
  }

  if (cancelBtn) cancelBtn.addEventListener("click", resetForm);

  // Yarışları listele
  async function loadAdminRaces() {
    listEl.innerHTML = '<p style="opacity:.6;font-size:.9rem;">Yükleniyor...</p>';
    const { data, error } = await sb.from("races").select("*").order("tarih");

    if (error || !data) {
      listEl.innerHTML = `<p style="color:#bf3b3b;">Yüklenemedi: ${error?.message || ""}</p>`;
      return;
    }

    allRaces = data;
    const today = new Date().toISOString().slice(0, 10);

    if (data.length === 0) {
      listEl.innerHTML = '<div class="admin-empty">Henüz yarış eklenmedi.</div>';
      return;
    }

    listEl.innerHTML = data.map(race => {
      const d       = new Date(race.tarih + "T00:00:00");
      const dateStr = `${d.getDate()} ${MONTHS_A[d.getMonth()]} ${d.getFullYear()}`;
      const past    = race.tarih < today;
      const dists   = (race.mesafeler || []).map(m => `<span class="dist-tag">${m}</span>`).join("");

      return `
        <div class="race-admin-card ${past ? "past" : ""}">
          <div class="race-admin-info">
            <div class="race-admin-name">${race.isim}</div>
            <div class="race-admin-meta">${dateStr}${race.konum ? " · " + race.konum : ""}</div>
            ${dists ? `<div class="race-admin-dists">${dists}</div>` : ""}
          </div>
          <div class="race-admin-actions">
            <button class="btn-ghost sm" data-edit-id="${race.id}">Düzenle</button>
            <button class="btn-del" data-del-id="${race.id}">Sil</button>
          </div>
        </div>`;
    }).join("");
  }

  await loadAdminRaces();

  // Düzenle / Sil — event delegation
  listEl.addEventListener("click", async function (ev) {
    const editBtn = ev.target.closest("[data-edit-id]");
    const delBtn  = ev.target.closest("[data-del-id]");

    if (editBtn) {
      const race = allRaces.find(r => r.id === editBtn.dataset.editId);
      if (race) { fillForm(race); page.querySelector(".admin-form-col").scrollIntoView({ behavior: "smooth" }); }
      return;
    }

    if (delBtn && !delBtn.disabled) {
      const id   = delBtn.dataset.delId;
      const race = allRaces.find(r => r.id === id);
      if (!confirm(`"${race?.isim}" yarışını silmek istediğine emin misin?\nBu işlem geri alınamaz.`)) return;

      delBtn.disabled = true;
      delBtn.textContent = "Siliniyor...";

      const { error } = await sb.from("races").delete().eq("id", id);
      if (error) {
        alert("Silinemedi: " + error.message);
        delBtn.disabled = false;
        delBtn.textContent = "Sil";
      } else {
        if (editingId === id) resetForm();
        await loadAdminRaces();
      }
    }
  });

  // Form gönder (ekle / güncelle)
  if (form) {
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const payload = getFormData();

      if (!payload.isim || !payload.tarih) {
        formStatus.textContent = "Yarış adı ve tarih zorunlu.";
        formStatus.className = "form-status err show";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "KAYDEDİLİYOR...";
      formStatus.className = "form-status";

      const { error } = editingId
        ? await sb.from("races").update(payload).eq("id", editingId)
        : await sb.from("races").insert(payload);

      submitBtn.disabled = false;
      submitBtn.textContent = editingId ? "GÜNCELLE →" : "EKLE →";

      if (error) {
        formStatus.textContent = "Hata: " + error.message;
        formStatus.className = "form-status err show";
        return;
      }

      resetForm();
      await loadAdminRaces();
    });
  }
})();
