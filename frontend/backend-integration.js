/* Existing FIND-ME UI to Flask integration. This deliberately augments the
   supplied screens; it does not replace their markup, navigation, or styling. */
(function () {
  const app = window.findMeApp;
  const api = window.FindMeAPI;
  if (!app || !api) return;
  const casesKey = "findme_cases_v3";
  const message = (text, type = "error") => app.showToast ? app.showToast(text, type) : alert(text);
  const error = (selector, text) => { const el = document.querySelector(selector); if (el) { el.textContent = text; el.style.display = "block"; el.classList.add("show"); } };
  const toLocalCase = (item) => ({
    id: item.complaint_id, caseId: item.complaint_id, caseNumber: item.complaint_id, caseNo: item.complaint_id,
    name: item.missing_person.full_name, missingPersonName: item.missing_person.full_name,
    age: item.missing_person.age, missingPersonAge: item.missing_person.age,
    gender: item.missing_person.gender, missingPersonGender: item.missing_person.gender,
    height: item.missing_person.height || "", weight: item.missing_person.weight || "",
    physicalDescription: item.missing_person.description || "",
    description: item.missing_person.description || "",
    clothing: item.missing_person.clothing || "",
    clothingDescription: item.missing_person.clothing || "",
    identifyingMarks: item.missing_person.identifying_marks || "",
    identifyingFeatures: item.missing_person.identifying_marks || "",
    additionalInfo: item.missing_person.medical_information || "",
    medicalInformation: item.missing_person.medical_information || "",
    photo: item.missing_person.photo_url, photoData: item.missing_person.photo_url,
    // Keep backend/SQLite status names aligned with the dashboard UI.
    // The backend source of truth uses "Verified"; the admin dashboard displays
    // that state as "Verified & Active".
    status: item.status === "Verified" ? "verified-active" : item.status,
    verificationStatus: item.status === "Verified" ? "verified-active" : item.status,
    backendStatus: item.status,
    userId: app.currentUser && app.currentUser.id,
    citizenEmail: item.complaint_giver.email, citizenName: item.complaint_giver.full_name,
    complainantName: item.complaint_giver.full_name,
    citizenPhone: item.complaint_giver.phone, complainantPhone: item.complaint_giver.phone,
    relationship: item.complaint_giver.relationship,
    lastSeenLocation: item.missing_person.last_seen_location,
    lastSeenDate: item.missing_person.last_seen_date,
    lastSeenTime: item.missing_person.last_seen_time,
    createdAt: item.created_at, submittedAt: item.created_at,
    enquiryNotes: item.enquiry_notes || item.remarks || "",
    verificationNotes: item.enquiry_notes || item.remarks || "",
    adminRemarks: item.remarks || "",
    enquiryResult: item.enquiry_result || (item.status === "Verified" ? "Verified" : item.status === "Rejected" ? "Rejected" : ""),
    verifiedBy: item.verified_by_name || item.verified_by?.username || "",
    verifiedByEmail: item.verified_by?.email || "",
    verifiedAt: item.verified_at || "",
    verificationDate: item.verified_at || "",
    backend: item
  });
  async function syncCases() {
    try {
      const result = app.currentRole === "administrator" ? await api.cases() : await api.myComplaints();
      localStorage.setItem(casesKey, JSON.stringify((result.complaints || []).map(toLocalCase)));
      app.cases = JSON.parse(localStorage.getItem(casesKey));
      return app.cases;
    } catch (e) { message(e.message); return []; }
  }
  app.handleLogin = async function () {
    const username = document.querySelector("#login-email")?.value.trim();
    const password = document.querySelector("#login-password")?.value || "";
    const admin = !!document.querySelector("#login-role-admin")?.checked;
    if (!username || !password) return this.showLoginError("Please enter your username/email and password.");
    try {
      const result = admin ? await api.adminLogin({ username, password }) : await api.citizenLogin({ username, password });
      const user = result.user;
      this.currentUser = { id: user.id, username: user.username, email: user.email, name: user.username, fullName: user.username, role: admin ? "administrator" : "citizen" };
      this.currentRole = admin ? "administrator" : "citizen";
      this.saveSession();
      await syncCases();
      if (!admin && typeof this.refreshBackendNotificationState === "function") {
        await this.refreshBackendNotificationState();
      }
      message("Login successful.", "success");
      return admin ? this.renderAdministratorDashboard() : this.renderCitizenDashboard();
    } catch (e) { this.showLoginError(e.message); }
  };
  app.createCitizenAccount = async function () {
    const root = this.getRoot(); const name = root.querySelector("#findme-register-name")?.value.trim() || "";
    const email = root.querySelector("#findme-register-email")?.value.trim() || "";
    const phone = root.querySelector("#findme-register-phone")?.value.trim() || "";
    const password = root.querySelector("#findme-register-password")?.value || "";
    const confirmation = root.querySelector("#findme-register-confirm-password")?.value || "";
    if (!name || !email || !phone || !root.querySelector("#findme-register-agreement")?.checked) return error("#findme-register-error", "Complete the required registration fields.");
    try {
      await api.register({ username: email, email, password, password_confirmation: confirmation });
      // V9: authenticate immediately so registration never requires a refresh or
      // a second manual sign-in.
      const loginResult = await api.citizenLogin({ username: email, password });
      const user = loginResult.user;
      this.currentUser = {
        id: user.id, username: user.username, email: user.email,
        name, fullName: name, role: "citizen"
      };
      this.currentRole = "citizen";
      this.saveSession();
      await syncCases();
      if (typeof this.refreshBackendNotificationState === "function") {
        await this.refreshBackendNotificationState();
      }
      message("Account created and signed in successfully.", "success");
      this.renderCitizenDashboard();
    } catch (e) { error("#findme-register-error", e.message); }
  };
  function addComplaintDetails(form) {
    if (form.querySelector("[data-backend-details]")) return;
    const block = document.createElement("div"); block.dataset.backendDetails = "true"; block.className = "findme-p4-card";
    block.innerHTML = `<div class="findme-p4-section-title"><span>📍</span><h2>Last Seen & Identity Details</h2></div><div class="findme-p4-grid">
      <div class="findme-p4-field"><label>Last-seen location *</label><input id="fm-api-last-location" required></div>
      <div class="findme-p4-field"><label>Last-seen date</label><input id="fm-api-last-date" type="date"></div>
      <div class="findme-p4-field"><label>Last-seen time</label><input id="fm-api-last-time" type="time"></div>
      <div class="findme-p4-field"><label>Address</label><input id="fm-api-address"></div>
      <div class="findme-p4-field"><label>City</label><input id="fm-api-city"></div><div class="findme-p4-field"><label>State</label><input id="fm-api-state"></div>
      <div class="findme-p4-field"><label>ID proof type</label><input id="fm-api-id-type"></div><div class="findme-p4-field"><label>ID reference</label><input id="fm-api-id-ref"></div><div class="findme-p4-field"><label>Accessories / distinctive items</label><input id="fm-api-accessories" placeholder="Backpack, cap, glasses, watch..."></div></div>`;
    const verification = form.querySelector(".findme-p4-card:last-child"); form.insertBefore(block, verification);
  }
  function enhance() { document.querySelectorAll("#findme-p4-registration-form").forEach(addComplaintDetails); }
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true }); enhance();
  document.addEventListener("submit", async (event) => {
    const form = event.target; if (form.id !== "findme-p4-registration-form") return;
    event.preventDefault(); event.stopImmediatePropagation();
    const photo = document.querySelector("#findme-p4-photo")?.files[0];
    if (!photo) return error("#findme-p4-error", "Please upload a photo of the missing person.");
    const value = id => document.querySelector(id)?.value.trim() || "";
    const data = new FormData();
    [["photo", photo], ["full_name", value("#findme-p4-name")], ["age", value("#findme-p4-age")], ["gender", value("#findme-p4-gender")], ["height", value("#findme-p4-height")], ["description", value("#findme-p4-description")], ["clothing", value("#findme-p4-clothing")], ["identifying_marks", value("#findme-p4-identifying")], ["medical_information", value("#findme-p4-additional")], ["giver_full_name", value("#findme-p4-complainant-name") || app.currentUser?.fullName || app.currentUser?.name || "Citizen"], ["giver_email", app.currentUser?.email || ""], ["giver_phone", value("#findme-p4-phone")], ["relationship", value("#findme-p4-relationship")], ["last_seen_location", value("#fm-api-last-location")], ["last_seen_date", value("#fm-api-last-date")], ["last_seen_time", value("#fm-api-last-time")], ["address", value("#fm-api-address")], ["city", value("#fm-api-city")], ["state", value("#fm-api-state")], ["id_proof_type", value("#fm-api-id-type")], ["id_reference", value("#fm-api-id-ref")], ["accessories", value("#fm-api-accessories")]].forEach(([key, val]) => data.append(key, val));
    try { const result = await api.submitComplaint(data); await syncCases(); message(`Report submitted. Complaint ${result.ids.complaint_id}; giver ${result.ids.complaint_giver_id}; person ${result.ids.missing_person_id}.`, "success"); app.renderMyReports(); }
    catch (e) { error("#findme-p4-error", e.message); }
  }, true);
  document.addEventListener("click", async (event) => {
    if (!event.target.closest("#findme-p4-submit-sighting")) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const complaintId = document.querySelector("#findme-p4-sighting-case")?.value || ""; const location = document.querySelector("#findme-p4-sighting-location")?.value.trim() || ""; const dateTime = document.querySelector("#findme-p4-sighting-time")?.value || ""; const description = document.querySelector("#findme-p4-sighting-description")?.value.trim() || "";
    if (!complaintId || !location || !description) return error("#findme-p4-sighting-error", "Select a report, location, and description.");
    const form = new FormData(); form.append("complaint_id", complaintId); form.append("location", location); form.append("description", description); form.append("date", dateTime.slice(0, 10)); form.append("time", dateTime.slice(11));
    try { await api.reportSighting(form); message("Sighting submitted for officer review.", "success"); app.renderReportSighting(); } catch (e) { error("#findme-p4-sighting-error", e.message); }
  }, true);
  // The supplied administration case controls retain their appearance; route
  // their mutations to the protected API before the legacy local handlers run.
  document.addEventListener("click", async (event) => {
    const control = event.target.closest("[data-fm3-action]");
    if (!control || !["verify-case", "reject-case", "save-status", "save-enquiry"].includes(control.dataset.fm3Action)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const action = control.dataset.fm3Action; const caseId = control.dataset.caseId;
    const notes = document.querySelector("#fm3-enquiry-notes")?.value.trim() || "";
    const enquiryControl = document.querySelector("#fm3-enquiry-result, select[data-enquiry-result]");
    const enquiryResult = enquiryControl?.value?.trim() || "";
    const statusControl = document.querySelector("#fm3-case-status, #fm3-status, select[data-case-status]");
    const selectedValue = statusControl?.value || "under-verification";
    const statusMap = {
      "pending": "Reported",
      "under-verification": "Under Verification",
      "verified-active": "Verified",
      "rejected": "Rejected",
      "resolved": "Case Closed"
    };
    const status = action === "verify-case"
      ? "Verified"
      : action === "reject-case"
        ? "Rejected"
        : (statusMap[selectedValue] || selectedValue || "Under Verification");
    try {
      await api.updateCase(caseId, {
        status,
        remarks: notes,
        enquiry_notes: notes,
        enquiry_result: enquiryResult || (status === "Verified" ? "Verified" : status === "Rejected" ? "Rejected" : "")
      });
      await syncCases();
      const label = status === "Verified" ? "Verified & Active" : status;
      message(`Case ${label.toLowerCase()} successfully.`, "success");
      if (typeof app.renderAdministratorCase === "function") app.renderAdministratorCase(caseId);
    } catch (e) { message(e.message); }
  }, true);
  ["renderAdministratorDashboard", "renderAdministratorAllCases", "renderAdministratorVerification", "renderAdministratorSearch"].forEach((name) => {
    const original = app[name]; if (typeof original !== "function") return;
    app[name] = async function (...args) { await syncCases(); return original.apply(this, args); };
  });
  window.FindMeBackend = { syncCases };
}());


  /* ============================================================
     V10 — PASSWORD RECOVERY (ROBUST EVENT-DELEGATED FLOW)
     ============================================================ */
  let recoveryOpen = false;

  function openPasswordRecovery() {
    if (recoveryOpen) return;
    recoveryOpen = true;
    document.querySelector("#findme-v10-reset-modal")?.remove();
    const modal = document.createElement("div");
    modal.id = "findme-v10-reset-modal";
    modal.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:20px;";
    modal.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="fm-v10-reset-title" style="width:min(500px,100%);background:#fff;border-radius:20px;padding:26px;box-shadow:0 25px 80px rgba(0,0,0,.28);">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase;">Account Recovery</div>
        <h2 id="fm-v10-reset-title" style="margin:7px 0;color:#172033;">Reset your password</h2>
        <p style="color:#64748b;line-height:1.5;margin-bottom:12px;">Enter your registered citizen email or username. In this offline expo build, the one-time reset code is displayed here after generation.</p>
        <label style="display:block;font-weight:700;color:#334155;margin:8px 0 4px;">Email or username</label>
        <input id="fm-v10-reset-account" class="findme-p5-input" style="width:100%;box-sizing:border-box;margin:0 0 8px;" placeholder="Registered email or username" autocomplete="username">
        <div id="fm-v10-reset-code-wrap" style="display:none;">
          <label style="display:block;font-weight:700;color:#334155;margin:8px 0 4px;">6-digit reset code</label>
          <input id="fm-v10-reset-code" class="findme-p5-input" style="width:100%;box-sizing:border-box;margin:0 0 8px;" placeholder="6-digit reset code" inputmode="numeric" maxlength="6" autocomplete="one-time-code">
          <label style="display:block;font-weight:700;color:#334155;margin:8px 0 4px;">New password</label>
          <input id="fm-v10-reset-new" class="findme-p5-input" style="width:100%;box-sizing:border-box;margin:0 0 8px;" placeholder="New password (8+ characters)" type="password" autocomplete="new-password">
          <label style="display:block;font-weight:700;color:#334155;margin:8px 0 4px;">Confirm new password</label>
          <input id="fm-v10-reset-confirm" class="findme-p5-input" style="width:100%;box-sizing:border-box;margin:0 0 8px;" placeholder="Confirm new password" type="password" autocomplete="new-password">
        </div>
        <div id="fm-v10-reset-message" role="status" style="min-height:24px;margin:10px 0;color:#475569;line-height:1.45;"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" id="fm-v10-reset-close" class="findme-secondary-button">Cancel</button>
          <button type="button" id="fm-v10-reset-action" class="findme-primary-button">Generate Reset Code</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const msg = modal.querySelector("#fm-v10-reset-message");
    const wrap = modal.querySelector("#fm-v10-reset-code-wrap");
    const accountInput = modal.querySelector("#fm-v10-reset-account");
    const action = modal.querySelector("#fm-v10-reset-action");
    let codeIssued = false;

    const close = () => { modal.remove(); recoveryOpen = false; };
    modal.querySelector("#fm-v10-reset-close").onclick = close;
    modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
    setTimeout(() => accountInput?.focus(), 30);

    action.onclick = async () => {
      const account = accountInput.value.trim();
      if (!codeIssued) {
        if (!account) { msg.textContent = "Enter your registered email or username."; msg.style.color = "#b91c1c"; return; }
        action.disabled = true;
        try {
          const result = await api.forgotPassword(account);
          wrap.style.display = "block";
          codeIssued = true;
          action.textContent = "Reset Password";
          msg.style.color = "#166534";
          msg.textContent = result.demo_code
            ? `Demo reset code: ${result.demo_code} (valid for 10 minutes).`
            : result.message;
        } catch (e) {
          msg.textContent = e.message || "Unable to generate a reset code.";
          msg.style.color = "#b91c1c";
        } finally { action.disabled = false; }
        return;
      }

      const code = modal.querySelector("#fm-v10-reset-code").value.trim();
      const password = modal.querySelector("#fm-v10-reset-new").value;
      const confirmation = modal.querySelector("#fm-v10-reset-confirm").value;
      if (!code || !/^\d{6}$/.test(code)) { msg.textContent = "Enter the 6-digit reset code."; msg.style.color = "#b91c1c"; return; }
      if (password.length < 8) { msg.textContent = "New password must contain at least 8 characters."; msg.style.color = "#b91c1c"; return; }
      if (password !== confirmation) { msg.textContent = "Passwords do not match."; msg.style.color = "#b91c1c"; return; }
      action.disabled = true;
      try {
        const result = await api.resetPassword({ email: account, code, password, password_confirmation: confirmation });
        msg.textContent = result.message || "Password reset successfully. You can sign in now.";
        msg.style.color = "#166534";
        setTimeout(() => {
          close();
          app.renderLogin();
          setTimeout(() => {
            const input = app.getRoot?.()?.querySelector("#login-email");
            if (input) input.value = account;
          }, 30);
        }, 700);
      } catch (e) {
        msg.textContent = e.message || "Unable to reset password.";
        msg.style.color = "#b91c1c";
      } finally { action.disabled = false; }
    };
  }

  function ensureForgotPasswordButton() {
    const root = app.getRoot?.();
    if (!root) return;
    const button = root.querySelector("#findme-forgot-password");
    if (!button) return;
    button.style.display = "block";
    button.disabled = false;
    button.dataset.v10Ready = "1";
  }

  // Capture-phase delegation makes the recovery action work even if the
  // original application's document-level click handling changes later.
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("#findme-forgot-password");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openPasswordRecovery();
  }, true);

  const originalRenderLoginV10 = app.renderLogin;
  if (typeof originalRenderLoginV10 === "function" && !originalRenderLoginV10.__v10Wrapped) {
    const wrappedRenderLoginV10 = function (...args) {
      const result = originalRenderLoginV10.apply(this, args);
      setTimeout(ensureForgotPasswordButton, 0);
      setTimeout(ensureForgotPasswordButton, 150);
      return result;
    };
    wrappedRenderLoginV10.__v10Wrapped = true;
    app.renderLogin = wrappedRenderLoginV10;
  }

  /* FINAL BUILD — citizen notification badge monitor */
  let finalCitizenPollTimer = null;
  async function updateCitizenNotificationBadge(){
    if(!app.currentUser || app.currentRole !== 'citizen'){ if(finalCitizenPollTimer){clearInterval(finalCitizenPollTimer); finalCitizenPollTimer=null;} return; }
    try{ const r=await api.notificationSummary(); app.backendNotificationTotal=Number(r?.total||0); app.backendNotificationUnread=Number(r?.unread||0); const stat=document.querySelector('#findme-citizen-notification-stat'); if(stat) stat.textContent=String(app.backendNotificationTotal); }catch(_){}
  }
  function startCitizenNotificationMonitor(){ if(finalCitizenPollTimer) clearInterval(finalCitizenPollTimer); updateCitizenNotificationBadge(); finalCitizenPollTimer=setInterval(updateCitizenNotificationBadge,4000); }
  const originalLoginFinalCitizen=app.handleLogin;
  if(typeof originalLoginFinalCitizen==='function' && !originalLoginFinalCitizen.__finalCitizenWrapped){ const wrappedFinalCitizenLogin=async function(...args){ const result=await originalLoginFinalCitizen.apply(this,args); setTimeout(()=>{if(app.currentRole==='citizen') startCitizenNotificationMonitor();},300); return result; }; wrappedFinalCitizenLogin.__finalCitizenWrapped=true; app.handleLogin=wrappedFinalCitizenLogin; }

  /* ============================================================
     V10 — GLOBAL EMERGENCY ALERT / NOTIFICATION MONITOR
     ============================================================ */
  let v9PollTimer = null;
  let v9KnownNotificationIds = null;
  let v9KnownAlertIds = null;

  function ensureGlobalAlertBell() {
    if (!app.currentUser || app.currentRole !== "administrator") return;
    let bell = document.querySelector("#findme-v9-global-alert-bell");
    if (bell) return;
    bell = document.createElement("button");
    bell.id = "findme-v9-global-alert-bell";
    bell.type = "button";
    bell.setAttribute("aria-label", "Open FIND-ME alerts and notifications");
    bell.style.cssText = "position:fixed;right:24px;bottom:24px;z-index:9998;width:58px;height:58px;border:0;border-radius:50%;background:#172033;color:#fff;font-size:25px;box-shadow:0 12px 35px rgba(15,23,42,.28);cursor:pointer;";
    bell.innerHTML = `🔔<span id="findme-v9-alert-badge" style="display:none;position:absolute;right:-2px;top:-3px;min-width:21px;height:21px;padding:0 5px;border-radius:999px;background:#dc2626;color:#fff;font:bold 11px/21px Arial;text-align:center;box-sizing:border-box;"></span>`;
    document.body.appendChild(bell);
    bell.addEventListener("click", async () => {
      if ("Notification" in window && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch (_) {}
      }
      try { await api.markNotificationsRead(); } catch (_) {}
      const target = typeof app.renderAdministratorEmergencyAlerts === "function";
      if (target) app.renderAdministratorEmergencyAlerts();
      else app.showToast?.("Open Emergency Alert Center from the Administrator Dashboard.", "info");
      updateGlobalAlertBell();
    });
  }

  async function updateGlobalAlertBell() {
    if (!app.currentUser || app.currentRole !== "administrator") {
      document.querySelector("#findme-v9-global-alert-bell")?.remove();
      return;
    }
    ensureGlobalAlertBell();
    try {
      const [notifications, alerts] = await Promise.all([
        api.notifications(),
        api.emergencyAlerts("ALL")
      ]);
      const unread = (notifications.notifications || []).filter(n => !n.read).length;
      const openAlerts = (alerts.alerts || []).filter(a => ["OPEN","ACKNOWLEDGED"].includes(String(a.status).toUpperCase())).length;
      const total = unread + openAlerts;
      const badge = document.querySelector("#findme-v9-alert-badge");
      if (badge) {
        badge.textContent = total > 99 ? "99+" : String(total);
        badge.style.display = total ? "block" : "none";
      }

      const notificationIds = (notifications.notifications || []).map(n => String(n.id));
      const alertIds = (alerts.alerts || []).map(a => String(a.alert_id));
      if (v9KnownNotificationIds === null) v9KnownNotificationIds = new Set(notificationIds);
      if (v9KnownAlertIds === null) v9KnownAlertIds = new Set(alertIds);

      for (const n of (notifications.notifications || [])) {
        if (!v9KnownNotificationIds.has(String(n.id)) && /alert|sighting|possible/i.test(`${n.title} ${n.message}`)) {
          app.showToast?.(`🚨 ${n.title}: ${n.message}`, "error");
          if ("Notification" in window && Notification.permission === "granted") {
            try { new Notification(`FIND-ME — ${n.title}`, { body: n.message }); } catch (_) {}
          }
        }
      }
      for (const a of (alerts.alerts || [])) {
        if (!v9KnownAlertIds.has(String(a.alert_id))) {
          app.showToast?.(`🚨 Emergency Alert ${a.alert_id}: ${a.person_name || "Possible sighting"} — ${Number(a.overall_score || 0).toFixed(2)}%`, "error");
          if ("Notification" in window && Notification.permission === "granted") {
            try { new Notification("FIND-ME — Emergency Alert", { body: `${a.person_name || "Possible sighting"} • ${Number(a.overall_score || 0).toFixed(2)}% candidate` }); } catch (_) {}
          }
        }
      }
      v9KnownNotificationIds = new Set(notificationIds);
      v9KnownAlertIds = new Set(alertIds);
    } catch (_) {}
  }

  function startGlobalAlertMonitor() {
    if (v9PollTimer) clearInterval(v9PollTimer);
    v9KnownNotificationIds = null;
    v9KnownAlertIds = null;
    updateGlobalAlertBell();
    v9PollTimer = setInterval(updateGlobalAlertBell, 5000);
  }

  const originalLoginV9 = app.handleLogin;
  if (typeof originalLoginV9 === "function" && !originalLoginV9.__v9LoginWrapped) {
    const wrappedLoginV9 = async function (...args) {
      const result = await originalLoginV9.apply(this, args);
      setTimeout(() => startGlobalAlertMonitor(), 250);
      return result;
    };
    wrappedLoginV9.__v9LoginWrapped = true;
    app.handleLogin = wrappedLoginV9;
  }

  const originalLogoutV9 = app.logout;
  if (typeof originalLogoutV9 === "function" && !originalLogoutV9.__v9LogoutWrapped) {
    const wrappedLogoutV9 = function (...args) {
      if (finalCitizenPollTimer) clearInterval(finalCitizenPollTimer);
      finalCitizenPollTimer = null;
      if (v9PollTimer) clearInterval(v9PollTimer);
      v9PollTimer = null;
      v9KnownNotificationIds = null;
      v9KnownAlertIds = null;
      document.querySelector("#findme-v9-global-alert-bell")?.remove();
      return originalLogoutV9.apply(this, args);
    };
    wrappedLogoutV9.__v9LogoutWrapped = true;
    app.logout = wrappedLogoutV9;
  }

  setTimeout(() => {
    ensureForgotPasswordButton();
    if (app.currentRole === "administrator") startGlobalAlertMonitor();
  }, 250);


  /* V9 — MOVEMENT TIMELINE ON CASE DETAILS */
  async function appendMovementTimeline(caseId) {
    if (!caseId || app.currentRole !== "administrator") return;
    try {
      const data = await api.case(caseId);
      const movement = data.movement_timeline || [];
      if (!movement.length) return;
      const root = app.getRoot?.();
      if (!root || root.querySelector("#findme-v9-movement-timeline")) return;
      const wrap = document.createElement("section");
      wrap.id = "findme-v9-movement-timeline";
      wrap.style.cssText = "margin:22px 0;padding:20px;border:1px solid #dbe5f0;border-radius:16px;background:#f8fbff;";
      wrap.innerHTML = `
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase;">Movement Intelligence</div>
        <h3 style="margin:6px 0;color:#173f72;">📍 Chronological Movement Timeline</h3>
        <p style="margin:0 0 14px;color:#64748b;">Last-known location and reported sightings are shown chronologically. A different city is movement context, not an automatic rejection.</p>
        <div style="display:grid;gap:10px;">
          ${movement.map((item, index) => `
            <div style="display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:start;">
              <div style="width:28px;height:28px;border-radius:50%;background:#e7eef8;display:flex;align-items:center;justify-content:center;font-size:13px;">${index === 0 ? "📍" : "👁️"}</div>
              <div style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;">
                <strong>${escapeHTML(item.location || "Unknown location")}</strong>
                <div style="font-size:12px;color:#64748b;margin-top:3px;">${escapeHTML([item.date,item.time].filter(Boolean).join(" • ") || "Time not recorded")}</div>
                <div style="font-size:13px;color:#475569;margin-top:5px;">${escapeHTML(item.description || "")}</div>
              </div>
            </div>`).join("")}
        </div>`;
      root.appendChild(wrap);
    } catch (_) {}
  }
  const originalCaseV9 = app.renderAdministratorCase;
  if (typeof originalCaseV9 === "function" && !originalCaseV9.__v9Wrapped) {
    const wrappedCaseV9 = function (caseId, ...args) {
      const result = originalCaseV9.apply(this, [caseId, ...args]);
      setTimeout(() => appendMovementTimeline(caseId), 50);
      setTimeout(() => appendMovementTimeline(caseId), 500);
      return result;
    };
    wrappedCaseV9.__v9Wrapped = true;
    app.renderAdministratorCase = wrappedCaseV9;
  }
