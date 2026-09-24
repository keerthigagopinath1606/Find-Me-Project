
/* ================================================================
   FIND-ME AI
   NEW APP.JS
   PART 1 — CORE APPLICATION + UI + SINGLE LOGIN FOUNDATION
   VERSION 3.5.0

   IMPORTANT:
   - This is Part 1 only.
   - Part 2 will add secure administrator authentication.
   - DO NOT add another login event listener in Part 2.
   - DO NOT add another application startup in Part 2.
   - DO NOT create another FindMeApp class.
   - Administrator credentials are intentionally NOT stored here.
   - No Last-Seen Information section.
   - One application root only.
   ================================================================ */

(function () {

    'use strict';

    /* ================================================================
   FIND-ME BACKEND API
================================================================ */

const FINDME_API_BASE =
  'http://127.0.0.1:5000/api';


/* ================================================================
   API REQUEST HELPER
================================================================ */

async function findMeApiRequest(
  endpoint,
  options = {}
) {

  const token =
    localStorage.getItem(
      'FINDME_AUTH_TOKEN'
    );


  const headers = {
    ...(options.headers || {})
  };


  /*
   * Do not force Content-Type for FormData.
   * The browser must create the multipart
   * boundary automatically.
   */

  if (
    !(options.body instanceof FormData) &&
    options.body !== undefined
  ) {

    headers['Content-Type'] =
      'application/json';

  }


  if (token) {

    headers['Authorization'] =
      `Bearer ${token}`;

  }


  let response;


  try {

    response =
      await fetch(
        FINDME_API_BASE + endpoint,
        {
          ...options,
          headers
        }
      );

  } catch (error) {

    console.error(
      'FIND-ME API connection error:',
      error
    );

    throw new Error(
      'Unable to connect to the FIND-ME server. Please make sure the Flask backend is running.'
    );

  }


  let data = null;


  try {

    data =
      await response.json();

  } catch {

    data = null;

  }


  if (!response.ok) {

    const message =
      data?.error ||
      data?.message ||
      `Server error (${response.status})`;

    throw new Error(
      message
    );

  }


  return data;

}

    /* ================================================================
       1. APPLICATION CONSTANTS
       ================================================================ */

    const APP_NAME = 'FIND-ME AI';
    const APP_VERSION = 'FINAL-LOCKED-2026.09.24';

    const ROOT_ID = 'findme-app-root';

    const SESSION_KEY = 'findme_secure_session_v3';
    const USERS_KEY = 'findme_citizen_accounts_v3';
    const CASES_KEY = 'findme_cases_v3';
    const NOTIFICATIONS_KEY = 'findme_notifications_v3';
    const SIGHTINGS_KEY = 'findme_sightings_v3';
    const ACTIVITY_KEY = 'findme_activity_v3';

    /* ================================================================
       2. GENERAL HELPERS
       ================================================================ */

    function safeString(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return '';
        }

        return String(value);
    }


    function normalize(value) {

        return safeString(value)
            .trim()
            .toLowerCase();

    }


    function escapeHTML(value) {

        return safeString(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    }


    function generateId(prefix) {

        const randomPart =
            Math.random()
                .toString(36)
                .substring(2, 10)
                .toUpperCase();

        const timePart =
            Date.now()
                .toString(36)
                .toUpperCase();

        return (
            safeString(prefix || 'ID') +
            '-' +
            timePart +
            '-' +
            randomPart
        );

    }


    function readJSON(key, fallback) {

        try {

            const value =
                localStorage.getItem(key);

            if (!value) {
                return fallback;
            }

            const parsed =
                JSON.parse(value);

            return parsed;

        } catch (error) {

            console.warn(
                'FIND-ME: Unable to read storage:',
                key,
                error
            );

            return fallback;
        }

    }


    function writeJSON(key, value) {

        try {

            localStorage.setItem(
                key,
                JSON.stringify(value)
            );

            return true;

        } catch (error) {

            console.error(
                'FIND-ME: Unable to save storage:',
                key,
                error
            );

            return false;
        }

    }


    function removeStorage(key) {

        try {

            localStorage.removeItem(key);

        } catch (error) {

            console.warn(
                'FIND-ME: Unable to remove storage:',
                key,
                error
            );

        }

    }


    function formatDate(value) {

        if (!value) {
            return 'Not available';
        }

        try {

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return safeString(value);
            }

            return date.toLocaleDateString(
                'en-IN',
                {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }
            );

        } catch (error) {

            return safeString(value);

        }

    }


    function formatDateTime(value) {

        if (!value) {
            return 'Not available';
        }

        try {

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return safeString(value);
            }

            return date.toLocaleString(
                'en-IN',
                {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }
            );

        } catch (error) {

            return safeString(value);

        }

    }


    /* ================================================================
       3. APPLICATION CLASS
       ================================================================ */

    class FindMeApp {

        constructor() {

            this.elements = {};

            this.currentUser = null;

            this.currentRole = null;

            this.currentPage = 'login';

            this.cameraStream = null;

            this.initialized = false;

            this.cases = [];

            this.notifications = [];

            this.backendNotificationTotal = 0;
            this.backendNotificationUnread = 0;

            this.sightings = [];

            this.activity = [];

        }


        /* ============================================================
           4. INITIALIZATION
           ============================================================ */

        init() {

            if (this.initialized) {
                return;
            }

            this.initialized = true;

            console.log(
                APP_NAME +
                ' v' +
                APP_VERSION +
                ' starting...'
            );

            this.loadLocalState();

            /*
             * IMPORTANT:
             *
             * Every browser load starts at login.
             *
             * We intentionally do not restore an old citizen/admin
             * session automatically.
             */

            this.clearSession();

            this.currentUser = null;

            this.currentRole = null;

            this.createRoot();

            this.injectStyles();

            this.renderLogin();

            this.attachLoginEvents();

            console.log(
                APP_NAME +
                ' initialized successfully.'
            );

            console.log(
                'Administrator credentials are handled only by Part 2.'
            );

        }


        /* ============================================================
           5. LOCAL STATE
           ============================================================ */

        loadLocalState() {

            this.cases =
                readJSON(
                    CASES_KEY,
                    []
                );

            this.notifications =
                readJSON(
                    NOTIFICATIONS_KEY,
                    []
                );

            this.sightings =
                readJSON(
                    SIGHTINGS_KEY,
                    []
                );

            this.activity =
                readJSON(
                    ACTIVITY_KEY,
                    []
                );

            if (!Array.isArray(this.cases)) {
                this.cases = [];
            }

            if (!Array.isArray(this.notifications)) {
                this.notifications = [];
            }

            if (!Array.isArray(this.sightings)) {
                this.sightings = [];
            }

            if (!Array.isArray(this.activity)) {
                this.activity = [];
            }

        }


        saveCases() {

            return writeJSON(
                CASES_KEY,
                this.cases
            );

        }


        saveNotifications() {

            return writeJSON(
                NOTIFICATIONS_KEY,
                this.notifications
            );

        }


        saveSightings() {

            return writeJSON(
                SIGHTINGS_KEY,
                this.sightings
            );

        }


        saveActivity() {

            return writeJSON(
                ACTIVITY_KEY,
                this.activity
            );

        }


        /* ============================================================
           6. ROOT
           ============================================================ */

        createRoot() {

            /*
             * Remove old duplicate roots if an older version of the
             * application was previously loaded.
             */

            const roots =
                document.querySelectorAll(
                    '[id="findme-app-root"]'
                );

            roots.forEach(
                (element, index) => {

                    if (index > 0) {
                        element.remove();
                    }

                }
            );


            // FINAL BUILD: use the real #app root from index.html.
            let root = document.getElementById('app');
            if (!root) {
                root = document.createElement('div');
                root.id = 'app';
                document.body.appendChild(root);
            }
            root.dataset.findmeRoot = 'true';


            /*
             * Remove everything else created by previous broken
             * application versions if those elements still exist.
             */

            document
                .querySelectorAll(
                    '.findme-old-app-root'
                )
                .forEach(
                    element => element.remove()
                );


            this.elements.root = root;

            /*
             * IMPORTANT:
             * createRoot returns the actual root element.
             */

            return root;

        }


        getRoot() {

            if (
                this.elements &&
                this.elements.root
            ) {
                return this.elements.root;
            }

            return document.getElementById('app') || document.getElementById(ROOT_ID);

        }


        /* ============================================================
           7. STYLES
           ============================================================ */

        injectStyles() {

            const oldStyle =
                document.getElementById(
                    'findme-app-style-v350'
                );

            if (oldStyle) {
                oldStyle.remove();
            }


            const style =
                document.createElement(
                    'style'
                );

            style.id =
                'findme-app-style-v350';


            style.textContent = `

                * {
                    box-sizing: border-box;
                }

                html,
                body {
                    margin: 0;
                    padding: 0;
                    min-height: 100%;
                    font-family:
                        Inter,
                        Segoe UI,
                        Arial,
                        sans-serif;
                    background:
                        #f4f7fb;
                    color:
                        #172033;
                }

                body {
                    min-height: 100vh;
                }

                button,
                input,
                select,
                textarea {
                    font: inherit;
                }

                button {
                    cursor: pointer;
                }

                #findme-app-root {
                    width: 100%;
                    min-height: 100vh;
                }

                /* =================================================
                   LOGIN
                   ================================================= */

                .findme-login-screen {
                    min-height: 100vh;
                    background:
                        linear-gradient(
                            135deg,
                            #0b5ed7 0%,
                            #1769e0 45%,
                            #063b91 100%
                        );
                    padding: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .findme-login-wrapper {
                    width: min(1180px, 100%);
                    min-height: 690px;
                    display: grid;
                    grid-template-columns:
                        minmax(0, 1.08fr)
                        minmax(380px, .92fr);
                    background: #ffffff;
                    border-radius: 30px;
                    overflow: hidden;
                    box-shadow:
                        0 30px 80px
                        rgba(0, 25, 70, .28);
                }

                .findme-login-info {
                    position: relative;
                    padding: 60px 55px;
                    color: #ffffff;
                    background:
                        linear-gradient(
                            150deg,
                            #0757c9,
                            #0a6de8
                        );
                    overflow: hidden;
                }

                .findme-login-info::before {
                    content: "";
                    position: absolute;
                    width: 360px;
                    height: 360px;
                    border-radius: 50%;
                    right: -170px;
                    top: -160px;
                    background:
                        rgba(255,255,255,.08);
                }

                .findme-login-info::after {
                    content: "";
                    position: absolute;
                    width: 300px;
                    height: 300px;
                    border-radius: 50%;
                    left: -150px;
                    bottom: -160px;
                    background:
                        rgba(255,255,255,.06);
                }

                .findme-brand-row {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    position: relative;
                    z-index: 2;
                }

                .findme-brand-icon {
                    width: 62px;
                    height: 62px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background:
                        rgba(255,255,255,.16);
                    border:
                        1px solid
                        rgba(255,255,255,.22);
                    font-size: 32px;
                }

                .findme-brand-name {
                    font-size: 27px;
                    font-weight: 800;
                    letter-spacing: .5px;
                }

                .findme-brand-subtitle {
                    margin-top: 3px;
                    opacity: .78;
                    font-size: 13px;
                }

                .findme-login-info h1 {
                    position: relative;
                    z-index: 2;
                    margin:
                        70px 0 18px;
                    max-width: 610px;
                    font-size: clamp(
                        36px,
                        4vw,
                        58px
                    );
                    line-height: 1.05;
                    letter-spacing: -1.8px;
                }

                .findme-login-description {
                    position: relative;
                    z-index: 2;
                    max-width: 590px;
                    margin: 0;
                    color:
                        rgba(255,255,255,.86);
                    font-size: 17px;
                    line-height: 1.75;
                }

                .findme-login-feature-grid {
                    position: relative;
                    z-index: 2;
                    margin-top: 38px;
                    display: grid;
                    grid-template-columns:
                        repeat(2, minmax(0,1fr));
                    gap: 14px;
                }

                .findme-login-feature {
                    min-height: 142px;
                    padding: 20px;
                    border-radius: 18px;
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                    background:
                        rgba(255,255,255,.11);
                    border:
                        1px solid
                        rgba(255,255,255,.13);
                }

                .findme-login-feature-icon {
                    width: 54px;
                    height: 54px;
                    min-width: 54px;
                    flex-shrink: 0;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background:
                        rgba(255,255,255,.15);
                    font-size: 31px;
                    line-height: 1;
                }

                .findme-login-feature-title {
                    font-size: 15px;
                    font-weight: 750;
                    margin-bottom: 7px;
                }

                .findme-login-feature-text {
                    color:
                        rgba(255,255,255,.74);
                    font-size: 12.5px;
                    line-height: 1.55;
                }

                /* =================================================
                   LOGIN PANEL
                   ================================================= */

                .findme-login-panel {
                    padding:
                        52px 48px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    background: #ffffff;
                }

                .findme-login-kicker {
                    color: #1769e0;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 1.8px;
                    text-transform: uppercase;
                    margin-bottom: 12px;
                }

                .findme-login-panel h2 {
                    margin: 0;
                    font-size: 34px;
                    letter-spacing: -.8px;
                }

                .findme-login-panel-intro {
                    color: #68748a;
                    line-height: 1.6;
                    margin:
                        10px 0 28px;
                    font-size: 14px;
                }

                .findme-field {
                    margin-bottom: 18px;
                }

                .findme-field label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 13px;
                    font-weight: 700;
                    color: #303b4e;
                }

                .findme-field input,
                .findme-field select,
                .findme-field textarea {
                    width: 100%;
                    border: 1px solid #d9e1ec;
                    background: #fbfcfe;
                    color: #172033;
                    border-radius: 12px;
                    padding:
                        13px 14px;
                    outline: none;
                    transition:
                        .2s ease;
                }

                .findme-field input:focus,
                .findme-field select:focus,
                .findme-field textarea:focus {
                    border-color: #1769e0;
                    box-shadow:
                        0 0 0 4px
                        rgba(23,105,224,.09);
                    background: #ffffff;
                }

                .findme-role-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(2, minmax(0,1fr));
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .findme-role-option {
                    position: relative;
                    border:
                        1px solid
                        #dce3ee;
                    border-radius: 14px;
                    padding: 14px;
                    background: #fbfcff;
                    transition: .2s ease;
                }

                .findme-role-option:hover {
                    border-color: #8bb6f4;
                }

                .findme-role-option input {
                    position: absolute;
                    opacity: 0;
                    pointer-events: none;
                }

                .findme-role-option-content {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                }

                .findme-role-option-icon {
                    width: 42px;
                    height: 42px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background:
                        #eaf2ff;
                    font-size: 22px;
                }

                .findme-role-option-title {
                    font-size: 13px;
                    font-weight: 800;
                }

                .findme-role-option-text {
                    margin-top: 3px;
                    color: #7b879a;
                    font-size: 11px;
                }

                .findme-role-option.selected {
                    border-color: #1769e0;
                    background: #f2f7ff;
                    box-shadow:
                        0 0 0 3px
                        rgba(23,105,224,.08);
                }

                .findme-primary-button {
                    width: 100%;
                    border: none;
                    border-radius: 13px;
                    padding: 14px 18px;
                    color: #ffffff;
                    background:
                        linear-gradient(
                            135deg,
                            #1769e0,
                            #0b55c4
                        );
                    font-weight: 800;
                    box-shadow:
                        0 9px 20px
                        rgba(23,105,224,.2);
                    transition: .2s ease;
                }

                .findme-primary-button:hover {
                    transform: translateY(-1px);
                    box-shadow:
                        0 12px 25px
                        rgba(23,105,224,.25);
                }

                .findme-secondary-button {
                    width: 100%;
                    border:
                        1px solid
                        #d8e1ee;
                    border-radius: 13px;
                    padding: 13px 18px;
                    color: #315070;
                    background: #ffffff;
                    font-weight: 750;
                }

                .findme-login-note {
                    margin-top: 18px;
                    padding: 12px 14px;
                    border-radius: 12px;
                    background: #f5f8fc;
                    color: #718096;
                    font-size: 11px;
                    line-height: 1.55;
                }

                .findme-error {
                    display: none;
                    padding: 11px 13px;
                    border-radius: 10px;
                    margin-bottom: 15px;
                    background: #fff1f1;
                    border: 1px solid #ffd0d0;
                    color: #b42318;
                    font-size: 12px;
                }

                .findme-error.show {
                    display: block;
                }

                /* =================================================
                   DASHBOARD
                   ================================================= */

                .findme-dashboard {
                    min-height: 100vh;
                    background:
                        linear-gradient(
                            180deg,
                            #f5f8fd 0%,
                            #eef3f9 100%
                        );
                }

                .findme-dashboard-header {
                    background:
                        linear-gradient(
                            135deg,
                            #0757c9,
                            #1769e0
                        );
                    color: #ffffff;
                    padding:
                        22px 5%;
                    box-shadow:
                        0 8px 25px
                        rgba(20,70,130,.12);
                }

                .findme-dashboard-header-inner {
                    max-width: 1280px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                }

                .findme-dashboard-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .findme-dashboard-brand-icon {
                    width: 46px;
                    height: 46px;
                    border-radius: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background:
                        rgba(255,255,255,.15);
                    font-size: 23px;
                }

                .findme-dashboard-brand-name {
                    font-size: 20px;
                    font-weight: 850;
                }

                .findme-dashboard-brand-role {
                    margin-top: 2px;
                    font-size: 11px;
                    opacity: .76;
                }

                .findme-logout-button {
                    border:
                        1px solid
                        rgba(255,255,255,.25);
                    background:
                        rgba(255,255,255,.10);
                    color: #ffffff;
                    padding: 10px 15px;
                    border-radius: 10px;
                    font-weight: 750;
                }

                .findme-content {
                    max-width: 1280px;
                    margin: 0 auto;
                    padding:
                        34px 5% 60px;
                }

                .findme-welcome-card {
                    padding: 30px;
                    border-radius: 22px;
                    background: #ffffff;
                    border:
                        1px solid
                        #e2e8f2;
                    box-shadow:
                        0 12px 30px
                        rgba(20,45,80,.06);
                }

                .findme-welcome-label {
                    color: #1769e0;
                    text-transform: uppercase;
                    font-size: 11px;
                    font-weight: 850;
                    letter-spacing: 1.5px;
                }

                .findme-welcome-card h1 {
                    margin:
                        8px 0 8px;
                    font-size: 30px;
                }

                .findme-welcome-card p {
                    margin: 0;
                    color: #6d788b;
                    line-height: 1.6;
                }

                .findme-stat-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(3, minmax(0,1fr));
                    gap: 18px;
                    margin-top: 22px;
                }

                .findme-stat-card {
                    padding: 22px;
                    border-radius: 18px;
                    background: #ffffff;
                    border:
                        1px solid
                        #e0e7f0;
                }

                .findme-stat-icon {
                    font-size: 27px;
                }

                .findme-stat-label {
                    color: #718096;
                    font-size: 12px;
                    margin-top: 10px;
                }

                .findme-stat-value {
                    font-size: 28px;
                    font-weight: 850;
                    margin-top: 3px;
                }

                .findme-section-title {
                    margin:
                        35px 0 16px;
                    font-size: 20px;
                    font-weight: 850;
                }

                .findme-module-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(2, minmax(0,1fr));
                    gap: 18px;
                }

                .findme-module-card {
                    border:
                        1px solid
                        #dfe7f2;
                    border-radius: 19px;
                    padding: 23px;
                    background: #ffffff;
                    transition: .2s ease;
                    cursor: pointer;
                }

                .findme-module-card:hover {
                    transform: translateY(-2px);
                    box-shadow:
                        0 14px 28px
                        rgba(20,45,80,.08);
                    border-color:
                        #a9c7f2;
                }

                .findme-module-icon {
                    width: 55px;
                    height: 55px;
                    border-radius: 15px;
                    background: #edf4ff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 28px;
                    margin-bottom: 15px;
                }

                .findme-module-card h3 {
                    margin: 0 0 7px;
                    font-size: 16px;
                }

                .findme-module-card p {
                    margin: 0;
                    color: #718096;
                    font-size: 12.5px;
                    line-height: 1.55;
                }

                /* =================================================
                   CITIZEN REGISTRATION FALLBACK
                   ================================================= */

                .findme-register-screen {
                    min-height: 100vh;
                    padding: 30px;
                    background:
                        linear-gradient(
                            135deg,
                            #f2f7ff,
                            #eaf2fc
                        );
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .findme-register-wrapper {
                    width: min(1050px,100%);
                    display: grid;
                    grid-template-columns:
                        .9fr 1.1fr;
                    background: #ffffff;
                    border-radius: 26px;
                    overflow: hidden;
                    box-shadow:
                        0 25px 70px
                        rgba(24,59,100,.14);
                }

                .findme-register-info {
                    padding: 42px;
                    color: #ffffff;
                    background:
                        linear-gradient(
                            150deg,
                            #0757c9,
                            #1769e0
                        );
                }

                .findme-register-kicker {
                    font-size: 11px;
                    font-weight: 850;
                    letter-spacing: 1.7px;
                    opacity: .78;
                    text-transform: uppercase;
                }

                .findme-register-info h2 {
                    font-size: 35px;
                    margin:
                        10px 0 12px;
                }

                .findme-register-info > p {
                    color:
                        rgba(255,255,255,.82);
                    font-size: 13px;
                    line-height: 1.65;
                }

                .findme-register-feature-grid {
                    margin-top: 28px;
                    display: grid;
                    gap: 12px;
                }

                .findme-register-feature {
                    min-height: 92px;
                    display: flex;
                    gap: 15px;
                    align-items: center;
                    padding: 14px;
                    border-radius: 16px;
                    background:
                        rgba(255,255,255,.11);
                    border:
                        1px solid
                        rgba(255,255,255,.13);
                }

                .findme-register-feature-icon {
                    width: 62px;
                    height: 62px;
                    min-width: 62px;
                    flex-shrink: 0;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background:
                        rgba(255,255,255,.16);
                    font-size: 36px;
                    line-height: 1;
                }

                .findme-register-feature h4 {
                    margin: 0 0 5px;
                    font-size: 14px;
                }

                .findme-register-feature p {
                    margin: 0;
                    color:
                        rgba(255,255,255,.72);
                    font-size: 11.5px;
                    line-height: 1.5;
                }

                .findme-register-panel {
                    padding: 42px;
                }

                .findme-register-panel h2 {
                    margin: 0;
                    font-size: 29px;
                }

                .findme-register-panel > p {
                    color: #718096;
                    font-size: 13px;
                    line-height: 1.6;
                    margin:
                        8px 0 25px;
                }

                .findme-register-two {
                    display: grid;
                    grid-template-columns:
                        repeat(2,minmax(0,1fr));
                    gap: 15px;
                }

                .findme-register-agreement {
                    display: flex;
                    gap: 9px;
                    align-items: flex-start;
                    color: #68748a;
                    font-size: 11px;
                    line-height: 1.5;
                    margin:
                        5px 0 18px;
                }

                .findme-register-agreement input {
                    margin-top: 2px;
                }

                .findme-register-actions {
                    display: flex;
                    gap: 10px;
                }

                .findme-register-actions button {
                    flex: 1;
                }

                /* =================================================
                   TOAST
                   ================================================= */

                .findme-toast-container {
                    position: fixed;
                    right: 22px;
                    bottom: 22px;
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    width: min(370px, calc(100vw - 44px));
                }

                .findme-toast {
                    background: #ffffff;
                    border:
                        1px solid
                        #dce4ef;
                    border-radius: 13px;
                    padding: 14px 16px;
                    box-shadow:
                        0 15px 35px
                        rgba(20,40,70,.16);
                    font-size: 12px;
                    line-height: 1.5;
                    animation:
                        findmeToastIn
                        .2s ease;
                }

                .findme-toast.success {
                    border-left:
                        4px solid #16803c;
                }

                .findme-toast.warning {
                    border-left:
                        4px solid #b7791f;
                }

                .findme-toast.error {
                    border-left:
                        4px solid #c53030;
                }

                .findme-toast.info {
                    border-left:
                        4px solid #1769e0;
                }

                @keyframes findmeToastIn {

                    from {
                        opacity: 0;
                        transform:
                            translateY(10px);
                    }

                    to {
                        opacity: 1;
                        transform:
                            translateY(0);
                    }

                }

                /* =================================================
                   RESPONSIVE
                   ================================================= */

                @media (
                    max-width: 900px
                ) {

                    .findme-login-wrapper {
                        grid-template-columns: 1fr;
                    }

                    .findme-login-info {
                        padding: 40px 30px;
                    }

                    .findme-login-info h1 {
                        margin-top: 42px;
                        font-size: 40px;
                    }

                    .findme-login-panel {
                        padding: 38px 30px;
                    }

                    .findme-register-wrapper {
                        grid-template-columns: 1fr;
                    }

                }


                @media (
                    max-width: 650px
                ) {

                    .findme-login-screen,
                    .findme-register-screen {
                        padding: 12px;
                    }

                    .findme-login-wrapper {
                        border-radius: 20px;
                    }

                    .findme-login-feature-grid {
                        grid-template-columns: 1fr;
                    }

                    .findme-role-grid {
                        grid-template-columns: 1fr;
                    }

                    .findme-stat-grid,
                    .findme-module-grid,
                    .findme-register-two {
                        grid-template-columns: 1fr;
                    }

                    .findme-login-panel,
                    .findme-register-panel {
                        padding: 28px 20px;
                    }

                    .findme-login-info {
                        padding: 30px 20px;
                    }

                    .findme-login-info h1 {
                        font-size: 34px;
                    }

                    .findme-content {
                        padding:
                            22px 16px 45px;
                    }

                    .findme-dashboard-header {
                        padding:
                            17px 16px;
                    }

                    .findme-dashboard-header-inner {
                        align-items: flex-start;
                    }

                    .findme-welcome-card {
                        padding: 22px;
                    }

                    .findme-register-info {
                        padding: 30px 22px;
                    }

                    .findme-register-actions {
                        flex-direction: column;
                    }

                }

            `;


            document.head.appendChild(
                style
            );

        }


        /* ============================================================
           8. LOGIN PAGE
           ============================================================ */

        renderLogin() {

            const root =
                this.getRoot();

            if (!root) {

                this.renderFatalError(
                    'Application root could not be created.'
                );

                return;
            }


            this.stopCamera();


            this.currentPage =
                'login';


            root.innerHTML = `

                <main
                    class="findme-login-screen"
                    aria-label="FIND-ME AI Login"
                >

                    <section
                        class="findme-login-wrapper"
                    >

                        <div
                            class="findme-login-info"
                        >

                            <div
                                class="findme-brand-row"
                            >

                                <div
                                    class="findme-brand-icon"
                                >
                                    🔎
                                </div>

                                <div>

                                    <div
                                        class="findme-brand-name"
                                    >
                                        FIND-ME AI
                                    </div>

                                    <div
                                        class="findme-brand-subtitle"
                                    >
                                        Intelligent Missing Person
                                        Identification System
                                    </div>

                                </div>

                            </div>


                            <h1>
                                Find faster.
                                Investigate smarter.
                                Help bring people home.
                            </h1>


                            <p
                                class="findme-login-description"
                            >
                                A secure AI-assisted platform for
                                missing-person reporting, case
                                management, evidence analysis and
                                authorized investigation.
                            </p>


                            <div
                                class="findme-login-feature-grid"
                            >

                                <article
                                    class="findme-login-feature"
                                >

                                    <div
                                        class="findme-login-feature-icon"
                                    >
                                        🤖
                                    </div>

                                    <div>

                                        <div
                                            class="findme-login-feature-title"
                                        >
                                            AI Assisted Search
                                        </div>

                                        <div
                                            class="findme-login-feature-text"
                                        >
                                            Intelligent identification
                                            and evidence analysis.
                                        </div>

                                    </div>

                                </article>


                                <article
                                    class="findme-login-feature"
                                >

                                    <div
                                        class="findme-login-feature-icon"
                                    >
                                        📹
                                    </div>

                                    <div>

                                        <div
                                            class="findme-login-feature-title"
                                        >
                                            Video Investigation
                                        </div>

                                        <div
                                            class="findme-login-feature-text"
                                        >
                                            Analyze authorized CCTV
                                            and video evidence.
                                        </div>

                                    </div>

                                </article>


                                <article
                                    class="findme-login-feature"
                                >

                                    <div
                                        class="findme-login-feature-icon"
                                    >
                                        🛡️
                                    </div>

                                    <div>

                                        <div
                                            class="findme-login-feature-title"
                                        >
                                            Secure Access
                                        </div>

                                        <div
                                            class="findme-login-feature-text"
                                        >
                                            Role-based access protects
                                            sensitive investigation tools.
                                        </div>

                                    </div>

                                </article>


                                <article
                                    class="findme-login-feature"
                                >

                                    <div
                                        class="findme-login-feature-icon"
                                    >
                                        📋
                                    </div>

                                    <div>

                                        <div
                                            class="findme-login-feature-title"
                                        >
                                            Case Management
                                        </div>

                                        <div
                                            class="findme-login-feature-text"
                                        >
                                            Track reports and verification
                                            throughout the investigation.
                                        </div>

                                    </div>

                                </article>

                            </div>

                        </div>


                        <div
                            class="findme-login-panel"
                        >

                            <div
                                class="findme-login-kicker"
                            >
                                Secure Access
                            </div>


                            <h2>
                                Sign in
                            </h2>


                            <p
                                class="findme-login-panel-intro"
                            >
                                Enter your registered account details
                                to continue to FIND-ME AI.
                            </p>


                            <div
                                id="findme-login-error"
                                class="findme-error"
                            ></div>


                            <div
                                class="findme-field"
                            >

                                <label
                                    for="login-email"
                                >
                                    Username / Email
                                </label>

                                <input
                                    id="login-email"
                                    type="text"
                                    autocomplete="username"
                                    placeholder="Enter your username or email"
                                >

                            </div>


                            <div
                                class="findme-field"
                            >

                                <label
                                    for="login-password"
                                >
                                    Password
                                </label>

                                <input
                                    id="login-password"
                                    type="password"
                                    autocomplete="current-password"
                                    placeholder="Enter your password"
                                >

                            </div>


                            <div
                                class="findme-field"
                            >

                                <label>
                                    Account Type
                                </label>


                                <div
                                    class="findme-role-grid"
                                    id="findme-role-grid"
                                >

                                    <label
                                        class="findme-role-option selected"
                                        data-role-option="citizen"
                                    >

                                        <input
                                            id="login-role-citizen"
                                            type="radio"
                                            name="findme-login-role"
                                            value="citizen"
                                            checked
                                        >

                                        <div
                                            class="findme-role-option-content"
                                        >

                                            <div
                                                class="findme-role-option-icon"
                                            >
                                                👤
                                            </div>

                                            <div>

                                                <div
                                                    class="findme-role-option-title"
                                                >
                                                    Citizen
                                                </div>

                                                <div
                                                    class="findme-role-option-text"
                                                >
                                                    Reports & cases
                                                </div>

                                            </div>

                                        </div>

                                    </label>


                                    <label
                                        class="findme-role-option"
                                        data-role-option="administrator"
                                    >

                                        <input
                                            id="login-role-admin"
                                            type="radio"
                                            name="findme-login-role"
                                            value="administrator"
                                        >

                                        <div
                                            class="findme-role-option-content"
                                        >

                                            <div
                                                class="findme-role-option-icon"
                                            >
                                                🛡️
                                            </div>

                                            <div>

                                                <div
                                                    class="findme-role-option-title"
                                                >
                                                    Administrator
                                                </div>

                                                <div
                                                    class="findme-role-option-text"
                                                >
                                                    Authorized access
                                                </div>

                                            </div>

                                        </div>

                                    </label>

                                </div>

                            </div>


                            <button
                                type="button"
                                id="findme-signin-button"
                                class="findme-primary-button"
                            >
                                Sign In
                            </button>


                            <button
                                type="button"
                                id="findme-create-account-button"
                                class="findme-secondary-button"
                                style="margin-top:10px;"
                            >
                                Create Citizen Account
                            </button>

                            <button
                                type="button"
                                id="findme-forgot-password"
                                class="findme-secondary-button"
                                style="margin-top:10px;"
                            >
                                Forgot Password?
                            </button>


                            <div
                                class="findme-login-note"
                            >
                                🔐 Administrator access is restricted
                                to authorized credentials. Selecting
                                Administrator does not by itself grant
                                administrator access.
                            </div>

                        </div>

                    </section>

                </main>

            `;


            this.updateRoleVisuals();

        }


        /* ============================================================
           9. LOGIN EVENTS
           ============================================================ */

        attachLoginEvents() {

            const root =
                this.getRoot();

            if (!root) {
                return;
            }


            /*
             * IMPORTANT:
             *
             * Part 1 owns the ONLY login button listener.
             *
             * Part 2 must NOT add another listener.
             *
             * The callback dynamically calls this.handleLogin(),
             * so Part 2 can safely replace the method later.
             */

            const signInButton =
                root.querySelector(
                    '#findme-signin-button'
                );


            if (
                signInButton &&
                !signInButton.dataset.findmeBound
            ) {

                signInButton.dataset.findmeBound =
                    'true';


                signInButton.addEventListener(
                    'click',
                    () => {

                        this.handleLogin();

                    }
                );

            }


            const passwordInput =
                root.querySelector(
                    '#login-password'
                );


            if (
                passwordInput &&
                !passwordInput.dataset.findmeBound
            ) {

                passwordInput.dataset.findmeBound =
                    'true';


                passwordInput.addEventListener(
                    'keydown',
                    event => {

                        if (
                            event.key ===
                            'Enter'
                        ) {

                            event.preventDefault();

                            this.handleLogin();

                        }

                    }
                );

            }


            const createAccountButton =
                root.querySelector(
                    '#findme-create-account-button'
                );


            if (
                createAccountButton &&
                !createAccountButton.dataset.findmeBound
            ) {

                createAccountButton.dataset.findmeBound =
                    'true';


                createAccountButton.addEventListener(
                    'click',
                    () => {

                        this.renderCitizenRegistration();

                    }
                );

            }


            const roleInputs =
                root.querySelectorAll(
                    'input[name="findme-login-role"]'
                );


            roleInputs.forEach(
                input => {

                    if (
                        input.dataset.findmeBound
                    ) {
                        return;
                    }


                    input.dataset.findmeBound =
                        'true';


                    input.addEventListener(
                        'change',
                        () => {

                            this.updateRoleVisuals();

                        }
                    );

                }
            );

        }


        updateRoleVisuals() {

            const root =
                this.getRoot();

            if (!root) {
                return;
            }


            const roleInputs =
                root.querySelectorAll(
                    'input[name="findme-login-role"]'
                );


            const roleOptions =
                root.querySelectorAll(
                    '[data-role-option]'
                );


            roleOptions.forEach(
                option => {

                    option.classList.remove(
                        'selected'
                    );

                }
            );


            roleInputs.forEach(
                input => {

                    if (input.checked) {

                        const option =
                            root.querySelector(
                                '[data-role-option="' +
                                safeString(input.value) +
                                '"]'
                            );

                        option?.classList.add(
                            'selected'
                        );

                    }

                }
            );

        }


        /* ============================================================
           10. LOGIN METHOD
           ============================================================ */

        async handleLogin() {

            const root =
                this.getRoot();

            if (!root) {
                return;
            }


            const usernameInput =
                root.querySelector(
                    '#login-email'
                );

            const passwordInput =
                root.querySelector(
                    '#login-password'
                );

            const citizenRole =
                root.querySelector(
                    '#login-role-citizen'
                );

            const adminRole =
                root.querySelector(
                    '#login-role-admin'
                );


            const username =
                usernameInput?.value?.trim() || '';

            const password =
                passwordInput?.value || '';


            let role =
                'citizen';


            if (
                adminRole &&
                adminRole.checked
            ) {
                role = 'administrator';
            }


            if (!username || !password) {

                this.showLoginError(
                    'Please enter your username/email and password.'
                );

                return;
            }


            /*
             * IMPORTANT:
             *
             * Part 1 does NOT authenticate administrators.
             *
             * Part 2 replaces this method with the complete secure
             * authentication method.
             *
             * This branch prevents Part 1 from incorrectly treating
             * administrator credentials as citizen credentials.
             */

            if (
                role ===
                'administrator'
            ) {

                this.showLoginError(
                    'Administrator authentication is handled by the secure administrator module.'
                );

                return;

            }


            const result =
                this.authenticateCitizen(
                    username,
                    password
                );


            if (!result.success) {

                this.showLoginError(
                    result.message ||
                    'Invalid citizen username/email or password.'
                );

                return;

            }


            this.currentUser =
                result.user;

            this.currentRole =
                'citizen';


            this.saveSession();


            /*
             * Only ONE success notification is generated here.
             *
             * Part 2 must not add another citizen login listener.
             */

            this.showToast(
                'Login successful.',
                'success'
            );


            this.renderCitizenDashboard();

        }


        showLoginError(message) {

            const root =
                this.getRoot();

            const errorBox =
                root?.querySelector(
                    '#findme-login-error'
                );


            if (!errorBox) {
                return;
            }


            errorBox.textContent =
                safeString(message);


            errorBox.classList.add(
                'show'
            );

        }


        clearLoginError() {

            const root =
                this.getRoot();

            const errorBox =
                root?.querySelector(
                    '#findme-login-error'
                );


            if (!errorBox) {
                return;
            }


            errorBox.textContent =
                '';

            errorBox.classList.remove(
                'show'
            );

        }


        /* ============================================================
           11. CITIZEN AUTHENTICATION FOUNDATION
           ============================================================ */

        authenticateCitizen(
            username,
            password
        ) {

            const users =
                readJSON(
                    USERS_KEY,
                    []
                );


            if (!Array.isArray(users)) {

                return {
                    success: false,
                    message:
                        'No citizen accounts are available. Please create an account first.'
                };

            }


            const normalizedUsername =
                normalize(username);


            const user =
                users.find(
                    candidate => {

                        const email =
                            normalize(
                                candidate.email
                            );

                        const userName =
                            normalize(
                                candidate.username
                            );

                        const status =
                            normalize(
                                candidate.status
                            );


                        const matchesUser =
                            email ===
                            normalizedUsername ||
                            userName ===
                            normalizedUsername;


                        const matchesPassword =
                            safeString(
                                candidate.password
                            ) ===
                            safeString(
                                password
                            );


                        const active =
                            !status ||
                            status ===
                                'active';


                        const citizen =
                            !candidate.role ||
                            normalize(
                                candidate.role
                            ) ===
                                'citizen';


                        return (
                            matchesUser &&
                            matchesPassword &&
                            active &&
                            citizen
                        );

                    }
                );


            if (!user) {

                return {
                    success: false,
                    message:
                        'Invalid citizen username/email or password.'
                };

            }


            return {
                success: true,
                user: {
                    id:
                        user.id ||
                        generateId('USR'),
                    username:
                        user.username ||
                        user.email,
                    name:
                        user.name ||
                        user.fullName ||
                        'Citizen',
                    email:
                        user.email ||
                        '',
                    phone:
                        user.phone ||
                        '',
                    role:
                        'citizen',
                    status:
                        user.status ||
                        'active'
                }
            };

        }


        /* ============================================================
           12. CITIZEN ACCOUNT CREATION
           ============================================================ */

        renderCitizenRegistration() {

            const root =
                this.getRoot();

            if (!root) {
                return;
            }


            this.stopCamera();


            this.currentPage =
                'citizen-registration';


            root.innerHTML = `

                <main
                    class="findme-register-screen"
                >

                    <section
                        class="findme-register-wrapper"
                    >

                        <div
                            class="findme-register-info"
                        >

                            <div
                                class="findme-register-kicker"
                            >
                                Citizen Portal
                            </div>


                            <h2>
                                Create your account.
                            </h2>


                            <p>
                                Register securely to submit missing
                                person reports, track your cases and
                                receive important updates.
                            </p>


                            <div
                                class="findme-register-feature-grid"
                            >

                                <article
                                    class="findme-register-feature"
                                >

                                    <div
                                        class="findme-register-feature-icon"
                                    >
                                        📝
                                    </div>

                                    <div>

                                        <h4>
                                            Register Reports
                                        </h4>

                                        <p>
                                            Submit missing-person
                                            information securely.
                                        </p>

                                    </div>

                                </article>


                                <article
                                    class="findme-register-feature"
                                >

                                    <div
                                        class="findme-register-feature-icon"
                                    >
                                        📊
                                    </div>

                                    <div>

                                        <h4>
                                            Track Your Cases
                                        </h4>

                                        <p>
                                            Monitor your submitted
                                            reports and status.
                                        </p>

                                    </div>

                                </article>


                                <article
                                    class="findme-register-feature"
                                >

                                    <div
                                        class="findme-register-feature-icon"
                                    >
                                        🔔
                                    </div>

                                    <div>

                                        <h4>
                                            Receive Updates
                                        </h4>

                                        <p>
                                            Get important case
                                            notifications.
                                        </p>

                                    </div>

                                </article>

                            </div>

                        </div>


                        <div
                            class="findme-register-panel"
                        >

                            <div
                                class="findme-login-kicker"
                            >
                                Citizen Account
                            </div>


                            <h2>
                                Create your account
                            </h2>


                            <p>
                                Use a valid email address and create a
                                password that you will use to sign in.
                            </p>


                            <div
                                id="findme-register-error"
                                class="findme-error"
                            ></div>


                            <div
                                class="findme-register-two"
                            >

                                <div
                                    class="findme-field"
                                >

                                    <label
                                        for="findme-register-name"
                                    >
                                        Full Name
                                    </label>

                                    <input
                                        id="findme-register-name"
                                        type="text"
                                        placeholder="Enter your full name"
                                    >

                                </div>


                                <div
                                    class="findme-field"
                                >

                                    <label
                                        for="findme-register-phone"
                                    >
                                        Phone Number
                                    </label>

                                    <input
                                        id="findme-register-phone"
                                        type="tel"
                                        placeholder="Enter your phone number"
                                    >

                                </div>

                            </div>


                            <div
                                class="findme-field"
                            >

                                <label
                                    for="findme-register-email"
                                >
                                    Email Address
                                </label>

                                <input
                                    id="findme-register-email"
                                    type="email"
                                    autocomplete="email"
                                    placeholder="Enter your email address"
                                >

                            </div>


                            <div
                                class="findme-register-two"
                            >

                                <div
                                    class="findme-field"
                                >

                                    <label
                                        for="findme-register-password"
                                    >
                                        Password
                                    </label>

                                    <input
                                        id="findme-register-password"
                                        type="password"
                                        autocomplete="new-password"
                                        placeholder="Create a password"
                                    >

                                </div>


                                <div
                                    class="findme-field"
                                >

                                    <label
                                        for="findme-register-confirm-password"
                                    >
                                        Confirm Password
                                    </label>

                                    <input
                                        id="findme-register-confirm-password"
                                        type="password"
                                        autocomplete="new-password"
                                        placeholder="Confirm password"
                                    >

                                </div>

                            </div>


                            <label
                                class="findme-register-agreement"
                            >

                                <input
                                    id="findme-register-agreement"
                                    type="checkbox"
                                >

                                <span>
                                    I confirm that the information
                                    provided is accurate and I will use
                                    FIND-ME AI only for legitimate
                                    missing-person reporting purposes.
                                </span>

                            </label>


                            <div
                                class="findme-register-actions"
                            >

                                <button
                                    type="button"
                                    id="findme-register-back"
                                    class="findme-secondary-button"
                                >
                                    Back to Login
                                </button>


                                <button
                                    type="button"
                                    id="findme-register-submit"
                                    class="findme-primary-button"
                                >
                                    Create Account
                                </button>

                            </div>

                        </div>

                    </section>

                </main>

            `;


            this.attachCitizenRegistrationEvents();

        }


        attachCitizenRegistrationEvents() {

            const root =
                this.getRoot();

            if (!root) {
                return;
            }


            const backButton =
                root.querySelector(
                    '#findme-register-back'
                );


            const submitButton =
                root.querySelector(
                    '#findme-register-submit'
                );


            if (backButton) {

                backButton.addEventListener(
                    'click',
                    () => {

                        this.renderLogin();

                        this.attachLoginEvents();

                    }
                );

            }


            if (submitButton) {

                submitButton.addEventListener(
                    'click',
                    () => {

                        this.createCitizenAccount();

                    }
                );

            }

        }


        createCitizenAccount() {

            const root =
                this.getRoot();

            if (!root) {
                return;
            }


            const name =
                root.querySelector(
                    '#findme-register-name'
                )?.value?.trim() ||
                '';


            const email =
                root.querySelector(
                    '#findme-register-email'
                )?.value?.trim() ||
                '';


            const phone =
                root.querySelector(
                    '#findme-register-phone'
                )?.value?.trim() ||
                '';


            const password =
                root.querySelector(
                    '#findme-register-password'
                )?.value ||
                '';


            const confirmPassword =
                root.querySelector(
                    '#findme-register-confirm-password'
                )?.value ||
                '';


            const agreement =
                root.querySelector(
                    '#findme-register-agreement'
                )?.checked ||
                false;


            const errorBox =
                root.querySelector(
                    '#findme-register-error'
                );


            const showError =
                message => {

                    if (!errorBox) {
                        return;
                    }

                    errorBox.textContent =
                        safeString(message);

                    errorBox.classList.add(
                        'show'
                    );

                };


            if (!name) {

                showError(
                    'Please enter your full name.'
                );

                return;

            }


            if (!email) {

                showError(
                    'Please enter your email address.'
                );

                return;

            }


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    email
                )
            ) {

                showError(
                    'Please enter a valid email address.'
                );

                return;

            }


            if (
                password.length <
                6
            ) {

                showError(
                    'Password must contain at least 6 characters.'
                );

                return;

            }


            if (
                password !==
                confirmPassword
            ) {

                showError(
                    'Passwords do not match.'
                );

                return;

            }


            if (!agreement) {

                showError(
                    'Please confirm the declaration before creating your account.'
                );

                return;

            }


            const users =
                readJSON(
                    USERS_KEY,
                    []
                );


            const existingUser =
                Array.isArray(users)
                    ? users.find(
                        user =>
                            normalize(
                                user.email
                            ) ===
                            normalize(email)
                    )
                    : null;


            if (existingUser) {

                showError(
                    'An account with this email address already exists.'
                );

                return;

            }


            const newUser = {

                id:
                    generateId('USR'),

                username:
                    email,

                name:
                    name,

                fullName:
                    name,

                email:
                    email,

                phone:
                    phone,

                password:
                    password,

                role:
                    'citizen',

                status:
                    'active',

                accountStatus:
                    'active',

                createdAt:
                    new Date().toISOString()

            };


            if (!Array.isArray(users)) {
                return;
            }


            users.push(
                newUser
            );


            const saved =
                writeJSON(
                    USERS_KEY,
                    users
                );


            if (!saved) {

                showError(
                    'Unable to save your account. Please try again.'
                );

                return;

            }


            this.showToast(
                'Citizen account created successfully. Please sign in.',
                'success'
            );


            this.renderLogin();

            this.attachLoginEvents();

            const emailInput =
                this.getRoot()?.querySelector(
                    '#login-email'
                );


            if (emailInput) {

                emailInput.value =
                    email;

                emailInput.focus();

            }

        }


        /* ============================================================
           13. SESSION FOUNDATION
           ============================================================ */

        saveSession() {

            if (
                !this.currentUser ||
                !this.currentRole
            ) {
                return false;
            }


            const session = {

                user:
                    this.currentUser,

                role:
                    this.currentRole,

                loginTime:
                    new Date().toISOString()

            };


            return writeJSON(
                SESSION_KEY,
                session
            );

        }


        getSession() {

            return readJSON(
                SESSION_KEY,
                null
            );

        }


        clearSession() {

            removeStorage(
                SESSION_KEY
            );

        }


        /* ============================================================
           14. CITIZEN DASHBOARD
           ============================================================ */

        renderCitizenDashboard() {

            const root =
                this.getRoot();

            if (!root) {
                return;
            }


            this.stopCamera();


            this.currentPage =
                'citizen-dashboard';


            const user =
                this.currentUser ||
                {};


            const userCases =
                this.getCasesForCurrentUser();


            const notifications =
                this.getMyNotifications();

            const backendNotificationTotal =
                Number(this.backendNotificationUnread || 0);


            const pendingCases =
                userCases.filter(
                    caseItem =>
                        ![
                            'resolved',
                            'rejected'
                        ].includes(
                            normalize(
                                caseItem.status
                            )
                        )
                );


            root.innerHTML = `

                <main
                    class="findme-dashboard findme-citizen-surface"
                >

                    <header
                        class="findme-dashboard-header"
                    >

                        <div
                            class="findme-dashboard-header-inner"
                        >

                            <div
                                class="findme-dashboard-brand"
                            >

                                <div
                                    class="findme-dashboard-brand-icon"
                                >
                                    🔎
                                </div>

                                <div>

                                    <div
                                        class="findme-dashboard-brand-name"
                                    >
                                        FIND-ME AI
                                    </div>

                                    <div
                                        class="findme-dashboard-brand-role"
                                    >
                                        Citizen Portal
                                    </div>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="findme-logout-button"
                                data-findme-dashboard-action="logout"
                            >
                                Logout
                            </button>

                        </div>

                    </header>


                    <section
                        class="findme-content"
                    >

                        <div
                            class="findme-welcome-card"
                        >

                            <div
                                class="findme-welcome-label"
                            >
                                Citizen Dashboard
                            </div>


                            <h1>
                                Welcome,
                                ${escapeHTML(
                                    user.name ||
                                    'Citizen'
                                )}
                                👋
                            </h1>


                            <p>
                                Manage your missing-person reports,
                                follow case progress and receive
                                important updates from authorized
                                personnel.
                            </p>

                        </div>


                        <div
                            class="findme-stat-grid"
                        >

                            <div
                                class="findme-stat-card"
                            >

                                <div
                                    class="findme-stat-icon"
                                >
                                    📋
                                </div>

                                <div
                                    class="findme-stat-label"
                                >
                                    My Reports
                                </div>

                                <div
                                    class="findme-stat-value"
                                >
                                    ${userCases.length}
                                </div>

                            </div>


                            <div
                                class="findme-stat-card"
                            >

                                <div
                                    class="findme-stat-icon"
                                >
                                    🔄
                                </div>

                                <div
                                    class="findme-stat-label"
                                >
                                    Active Cases
                                </div>

                                <div
                                    class="findme-stat-value"
                                >
                                    ${pendingCases.length}
                                </div>

                            </div>


                            <div
                                class="findme-stat-card"
                            >

                                <div
                                    class="findme-stat-icon"
                                >
                                    🔔
                                </div>

                                <div
                                    class="findme-stat-label"
                                >
                                    Notifications
                                </div>

                                <div
                                    class="findme-stat-value"
                                    id="findme-citizen-notification-stat"
                                >
                                    ${backendNotificationTotal}
                                </div>

                            </div>

                        </div>


                        <h2
                            class="findme-section-title"
                        >
                            Citizen Services
                        </h2>


                        <div
                            class="findme-module-grid"
                        >

                            <article
                                class="findme-module-card"
                                data-findme-action="register"
                            >

                                <div
                                    class="findme-module-icon"
                                >
                                    📝
                                </div>

                                <h3>
                                    Register Missing Person
                                </h3>

                                <p>
                                    Submit complete missing-person
                                    information and supporting details.
                                </p>

                            </article>


                            <article
                                class="findme-module-card"
                                data-findme-action="reports"
                            >

                                <div
                                    class="findme-module-icon"
                                >
                                    📊
                                </div>

                                <h3>
                                    My Reports
                                </h3>

                                <p>
                                    View your submitted cases,
                                    verification status and updates.
                                </p>

                            </article>


                            <article
                                class="findme-module-card"
                                data-findme-action="sighting"
                            >

                                <div
                                    class="findme-module-icon"
                                >
                                    👁️
                                </div>

                                <h3>
                                    Report a Sighting
                                </h3>

                                <p>
                                    Submit information about a possible
                                    sighting to support an existing case.
                                </p>

                            </article>


                            <article
                                class="findme-module-card"
                                data-findme-action="notifications"
                            >

                                <div
                                    class="findme-module-icon"
                                >
                                    🔔
                                </div>

                                <h3>
                                    Notifications
                                </h3>

                                <p>
                                    Review important updates related
                                    to your reports.
                                </p>

                            </article>


                            <article
                                class="findme-module-card"
                                data-findme-action="secure"
                            >

                                <div
                                    class="findme-module-icon"
                                >
                                    🛡️
                                </div>

                                <h3>
                                    Secure Access
                                </h3>

                                <p>
                                    Review your account and secure
                                    access information.
                                </p>

                            </article>

                        </div>

                    </section>

                </main>

            `;


            this.attachCitizenDashboardEvents();
            this.startNotificationPolling();
            this.refreshBackendNotificationState();

        }


        attachCitizenDashboardEvents() {

            const root =
                this.getRoot();

            if (!root) {
                return;
            }


            root
                .querySelectorAll(
                    '[data-findme-action]'
                )
                .forEach(
                    card => {

                        card.addEventListener(
                            'click',
                            () => {

                                const action =
                                    card.dataset.findmeAction;

                                this.handleCitizenAction(
                                    action
                                );

                            }
                        );

                    }
                );


            root
                .querySelectorAll(
                    '[data-findme-dashboard-action="logout"]'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            'click',
                            () => {

                                this.logout();

                            }
                        );

                    }
                );

        }


        /* ============================================================
           15. CASE OWNERSHIP
           ============================================================ */

        getCasesForCurrentUser() {

            if (!this.currentUser) {
                return [];
            }


            const userId =
                safeString(
                    this.currentUser.id
                );


            const email =
                normalize(
                    this.currentUser.email
                );


            return this.cases.filter(
                caseItem => {

                    /*
                     * Deleted cases remain in storage for audit
                     * purposes but should not appear in the normal
                     * citizen report list.
                     */

                    if (
                        caseItem.deleted === true ||
                        normalize(
                            caseItem.status
                        ) ===
                            'deleted'
                    ) {
                        return false;
                    }


                    const caseUserId =
                        safeString(
                            caseItem.userId ||
                            caseItem.citizenId ||
                            caseItem.complainantId
                        );


                    const caseEmail =
                        normalize(
                            caseItem.citizenEmail ||
                            caseItem.complainantEmail ||
                            caseItem.email
                        );


                    return (
                        (
                            userId &&
                            caseUserId &&
                            userId ===
                                caseUserId
                        ) ||
                        (
                            email &&
                            caseEmail &&
                            email ===
                                caseEmail
                        )
                    );

                }
            );

        }


        async refreshBackendNotificationState() {
            if (!this.currentUser || !this.currentRole) return;
            try {
                const response = await findMeApiRequest('/notifications/summary');
                this.backendNotificationTotal = Number(response?.total || 0);
                this.backendNotificationUnread = Number(response?.unread || 0);
                const stat = document.querySelector('#findme-citizen-notification-stat');
                if (stat) stat.textContent = String(this.backendNotificationUnread);
            } catch (error) {
                console.warn('Unable to refresh backend notification count:', error);
            }
        }

        startNotificationPolling() {
            if (this._notificationPollTimer) {
                clearInterval(this._notificationPollTimer);
            }
            if (!this.currentUser || this.currentRole !== 'citizen') {
                return;
            }
            this.refreshBackendNotificationState();
            this._notificationPollTimer = setInterval(() => {
                if (this.currentRole === 'citizen' && this.currentUser) {
                    this.refreshBackendNotificationState();
                } else {
                    clearInterval(this._notificationPollTimer);
                    this._notificationPollTimer = null;
                }
            }, 4000);
        }

        stopNotificationPolling() {
            if (this._notificationPollTimer) {
                clearInterval(this._notificationPollTimer);
                this._notificationPollTimer = null;
            }
        }

        getMyNotifications() {

            if (!this.currentUser) {
                return [];
            }


            const userId =
                safeString(
                    this.currentUser.id
                );


            const email =
                normalize(
                    this.currentUser.email
                );


            return this.notifications.filter(
                notification => {

                    const notificationUserId =
                        safeString(
                            notification.userId ||
                            notification.citizenId
                        );


                    const notificationEmail =
                        normalize(
                            notification.email ||
                            notification.citizenEmail
                        );


                    return (
                        (
                            userId &&
                            notificationUserId &&
                            userId ===
                                notificationUserId
                        ) ||
                        (
                            email &&
                            notificationEmail &&
                            email ===
                                notificationEmail
                        )
                    );

                }
            );

        }


        /* ============================================================
           16. CITIZEN ACTION ROUTER
           ============================================================ */

        handleCitizenAction(action) {

            const normalizedAction =
                normalize(action);


            switch (
                normalizedAction
            ) {

                case 'register':

                    if (
                        typeof this.renderRegisterMissingPerson ===
                        'function'
                    ) {

                        this.renderRegisterMissingPerson();

                    } else {

                        this.showToast(
                            'Missing-person registration module is loading.',
                            'info'
                        );

                    }

                    break;


                case 'reports':

                    if (
                        typeof this.renderMyReports ===
                        'function'
                    ) {

                        this.renderMyReports();

                    } else {

                        this.showToast(
                            'My Reports module is loading.',
                            'info'
                        );

                    }

                    break;


                case 'sighting':

                    if (
                        typeof this.renderCitizenSighting ===
                        'function'
                    ) {

                        this.renderCitizenSighting();

                    } else {

                        this.showToast(
                            'Sighting reporting module is loading.',
                            'info'
                        );

                    }

                    break;


                case 'notifications':

                    if (
                        typeof this.renderCitizenNotifications ===
                        'function'
                    ) {

                        this.renderCitizenNotifications();

                    } else {

                        this.showToast(
                            'Notifications module is loading.',
                            'info'
                        );

                    }

                    break;


                case 'secure':

                    this.renderSecureAccess();

                    break;


                default:

                    this.showToast(
                        'This service is not available yet.',
                        'info'
                    );

                    break;

            }

        }


        /* ============================================================
           17. SECURE ACCESS
           ============================================================ */

        renderSecureAccess() {

            const root =
                this.getRoot();

            if (!root) {
                return;
            }


            this.currentPage =
                'secure-access';


            root.innerHTML = `

                <main
                    class="findme-dashboard"
                >

                    <header
                        class="findme-dashboard-header"
                    >

                        <div
                            class="findme-dashboard-header-inner"
                        >

                            <div
                                class="findme-dashboard-brand"
                            >

                                <div
                                    class="findme-dashboard-brand-icon"
                                >
                                    🛡️
                                </div>

                                <div>

                                    <div
                                        class="findme-dashboard-brand-name"
                                    >
                                        FIND-ME AI
                                    </div>

                                    <div
                                        class="findme-dashboard-brand-role"
                                    >
                                        Secure Citizen Access
                                    </div>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="findme-logout-button"
                                id="findme-secure-back"
                            >
                                Back
                            </button>

                        </div>

                    </header>


                    <section
                        class="findme-content"
                    >

                        <div
                            class="findme-welcome-card"
                        >

                            <div
                                class="findme-welcome-label"
                            >
                                Secure Access
                            </div>

                            <h1>
                                Your account is protected. 🛡️
                            </h1>

                            <p>
                                Citizen accounts can submit reports,
                                monitor their own cases and receive
                                notifications. Sensitive investigation
                                functions are reserved for authorized
                                administrators.
                            </p>

                        </div>

                    </section>

                </main>

            `;


            root
                .querySelector(
                    '#findme-secure-back'
                )
                ?.addEventListener(
                    'click',
                    () => {

                        this.renderCitizenDashboard();

                    }
                );

        }


        /* ============================================================
           18. LOGOUT
           ============================================================ */

        logout() {

            this.stopCamera();

            this.currentUser =
                null;

            this.currentRole =
                null;

            this.currentPage =
                'login';


            this.clearSession();


            this.renderLogin();

            this.attachLoginEvents();


            this.showToast(
                'You have been logged out.',
                'info'
            );

        }


        /* ============================================================
           19. ADMIN FOUNDATION
           ============================================================ */

        isAdministrator() {

            return (
                this.currentRole ===
                'administrator'
            );

        }


        requireAdministrator() {

            if (
                !this.isAdministrator()
            ) {

                this.showToast(
                    'Administrator authorization is required.',
                    'error'
                );

                this.renderLogin();

                this.attachLoginEvents();

                return false;

            }


            return true;

        }


        /* ============================================================
           20. CAMERA FOUNDATION
           ============================================================ */

        stopCamera() {

            if (
                this.cameraStream
            ) {

                try {

                    this.cameraStream
                        .getTracks()
                        .forEach(
                            track => {

                                try {
                                    track.stop();
                                } catch (
                                    stopError
                                ) {
                                    console.warn(
                                        stopError
                                    );
                                }

                            }
                        );

                } catch (error) {

                    console.warn(
                        'FIND-ME: camera cleanup failed.',
                        error
                    );

                }

            }


            this.cameraStream =
                null;


            const videoElements =
                document.querySelectorAll(
                    'video[data-findme-camera]'
                );


            videoElements.forEach(
                video => {

                    try {

                        video.pause();

                        video.srcObject =
                            null;

                    } catch (error) {

                        console.warn(
                            error
                        );

                    }

                }
            );

        }


        /* ============================================================
           21. TOAST
           ============================================================ */

        showToast(
            message,
            type
        ) {

            const toastType =
                [
                    'success',
                    'warning',
                    'error',
                    'info'
                ].includes(
                    type
                )
                    ? type
                    : 'info';


            let container =
                document.querySelector(
                    '.findme-toast-container'
                );


            if (!container) {

                container =
                    document.createElement(
                        'div'
                    );

                container.className =
                    'findme-toast-container';

                document.body.appendChild(
                    container
                );

            }


            const toast =
                document.createElement(
                    'div'
                );


            toast.className =
                'findme-toast ' +
                toastType;


            toast.textContent =
                safeString(message);


            container.appendChild(
                toast
            );


            window.setTimeout(
                () => {

                    toast.remove();

                    if (
                        container.children.length ===
                        0
                    ) {

                        container.remove();

                    }

                },
                3500
            );

        }


        /* ============================================================
           22. FATAL ERROR
           ============================================================ */

        renderFatalError(message) {

            let root =
                document.getElementById(
                    ROOT_ID
                );


            if (!root) {

                root =
                    document.createElement(
                        'div'
                    );

                root.id =
                    ROOT_ID;

                document.body.appendChild(
                    root
                );

            }


            root.innerHTML = `

                <div
                    style="
                        min-height:100vh;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        padding:25px;
                        background:#f5f7fb;
                    "
                >

                    <div
                        style="
                            max-width:650px;
                            width:100%;
                            background:#ffffff;
                            border:1px solid #e0e6ef;
                            border-radius:20px;
                            padding:35px;
                            box-shadow:
                                0 20px 50px
                                rgba(20,40,70,.10);
                        "
                    >

                        <div
                            style="
                                font-size:42px;
                                margin-bottom:15px;
                            "
                        >
                            ⚠️
                        </div>

                        <h2
                            style="
                                margin:0 0 10px;
                            "
                        >
                            FIND-ME AI could not start
                        </h2>

                        <p
                            style="
                                color:#68748a;
                                line-height:1.6;
                                margin-bottom:20px;
                            "
                        >
                            ${escapeHTML(
                                message
                            )}
                        </p>

                        <button
                            type="button"
                            onclick="window.location.reload()"
                            style="
                                border:none;
                                border-radius:10px;
                                padding:12px 18px;
                                background:#1769e0;
                                color:#ffffff;
                                font-weight:700;
                            "
                        >
                            Reload Application
                        </button>

                    </div>

                </div>

            `;

        }

    }


    /* ================================================================
       23. PUBLIC REFERENCES
       ================================================================ */

    window.FindMeApp =
        FindMeApp;


    window.findMeHelpers = {

        safeString:
            safeString,

        normalize:
            normalize,

        escapeHTML:
            escapeHTML,

        generateId:
            generateId,

        readJSON:
            readJSON,

        writeJSON:
            writeJSON,

        removeStorage:
            removeStorage,

        formatDate:
            formatDate,

        formatDateTime:
            formatDateTime

    };


    /* ================================================================
       24. SINGLE APPLICATION INSTANCE
       ================================================================ */

    const findMeApp =
        new FindMeApp();


    window.findMeApp =
        findMeApp;


    /* ================================================================
       25. SINGLE STARTUP SECTION
       ================================================================ */

    function startFindMeApplication() {

        try {

            findMeApp.init();

        } catch (error) {

            console.error(
                'FIND-ME AI startup error:',
                error
            );


            try {

                findMeApp.renderFatalError(
                    error.message ||
                    'Unknown startup error.'
                );

            } catch (
                fatalError
            ) {

                console.error(
                    'FIND-ME AI fatal rendering error:',
                    fatalError
                );

            }

        }

    }


    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            startFindMeApplication,
            {
                once: true
            }
        );

    } else {

        startFindMeApplication();

    }


})();



/* ================================================================
   FIND-ME AI
   PART 2 — SECURE ADMINISTRATOR AUTHENTICATION
   + ADMINISTRATOR ROUTING
   Connected to Part 1 v3.5.0
   ================================================================ */

(function () {

    'use strict';


    /* ================================================================
       GET APPLICATION
       ================================================================ */

    const app =
        window.findMeApp;


    if (!app) {

        console.error(
            'FIND-ME AI Part 2: FindMeApp was not found.'
        );

        return;

    }


    /* ================================================================
       ADMINISTRATOR CREDENTIALS
       ================================================================ */

    const ADMIN_USERNAME =
        'keerthigagopinath1606@gmail.com';

    const ADMIN_PASSWORD =
        'keerthi999';

    const ADMIN_ROLE =
        'administrator';


    /* ================================================================
       SAFE ROOT
       ================================================================ */

    function getRoot() {

        if (
            app.elements &&
            app.elements.root
        ) {

            return app.elements.root;

        }


        return document.getElementById(
            'findme-app-root'
        );

    }


    /* ================================================================
       NORMALIZE
       ================================================================ */

    function normalize(value) {

        return String(
            value == null
                ? ''
                : value
        )
        .trim()
        .toLowerCase();

    }


    /* ================================================================
       LOGIN USERNAME
       ================================================================ */

    function getLoginUsername() {

        const input =
            document.getElementById(
                'login-email'
            );


        return String(
            input?.value || ''
        ).trim();

    }


    /* ================================================================
       LOGIN PASSWORD
       ================================================================ */

    function getLoginPassword() {

        const input =
            document.getElementById(
                'login-password'
            );


        return String(
            input?.value || ''
        );

    }


    /* ================================================================
       IMPORTANT:
       PART 1 USES RADIO BUTTONS FOR ROLE.
       
       We MUST check the actual administrator
       radio button.
       ================================================================ */

    function getSelectedRole() {

        const administratorRadio =
            document.getElementById(
                'login-role-admin'
            );


        const citizenRadio =
            document.getElementById(
                'login-role-citizen'
            );


        if (
            administratorRadio &&
            administratorRadio.checked
        ) {

            return ADMIN_ROLE;

        }


        if (
            citizenRadio &&
            citizenRadio.checked
        ) {

            return 'citizen';

        }


        /*
         * Safety fallback.
         *
         * Never assume administrator when
         * no role is selected.
         */

        return 'citizen';

    }


    /* ================================================================
       LOGIN ERROR
       ================================================================ */

    function clearLoginError() {

        if (
            typeof app.clearLoginError ===
            'function'
        ) {

            app.clearLoginError();

            return;

        }


        const error =
            document.getElementById(
                'findme-login-error'
            );


        if (error) {

            error.textContent =
                '';

            error.style.display =
                'none';

        }

    }


    function showLoginError(
        message
    ) {

        if (
            typeof app.showLoginError ===
            'function'
        ) {

            app.showLoginError(
                message
            );

            return;

        }


        const error =
            document.getElementById(
                'findme-login-error'
            );


        if (error) {

            error.textContent =
                String(
                    message || ''
                );

            error.style.display =
                'block';

            return;

        }


        if (
            typeof app.showToast ===
            'function'
        ) {

            app.showToast(
                message,
                'error'
            );

        }

    }


    /* ================================================================
       ADMINISTRATOR USER OBJECT
       ================================================================ */

    function createAdministratorUser() {

        return {

            id:
                'ADMIN-001',

            name:
                'Administrator',

            email:
                ADMIN_USERNAME,

            phone:
                '',

            role:
                ADMIN_ROLE,

            status:
                'active',

            accountStatus:
                'active',

            isAdmin:
                true,

            isAdministrator:
                true

        };

    }


    /* ================================================================
       ADMINISTRATOR AUTHENTICATION
       ================================================================ */

    function authenticateAdministrator(
        username,
        password
    ) {

        const suppliedUsername =
            normalize(
                username
            );


        const suppliedPassword =
            String(
                password || ''
            );


        const correctUsername =
            normalize(
                ADMIN_USERNAME
            );


        /*
         * Username check
         */

        if (
            suppliedUsername !==
            correctUsername
        ) {

            return {

                success:
                    false,

                message:
                    'Invalid administrator username or password.'

            };

        }


        /*
         * Password check
         */

        if (
            suppliedPassword !==
            ADMIN_PASSWORD
        ) {

            return {

                success:
                    false,

                message:
                    'Invalid administrator username or password.'

            };

        }


        return {

            success:
                true,

            user:
                createAdministratorUser()

        };

    }


    /* ================================================================
       CITIZEN AUTHENTICATION
       
       This is kept separate from administrator
       authentication.
       ================================================================ */

    function authenticateCitizen(
        username,
        password
    ) {

        const suppliedUsername =
            normalize(
                username
            );


        const suppliedPassword =
            String(
                password || ''
            );


        let users =
            [];


        try {

            const raw =
                localStorage.getItem(
                    'findme_citizen_accounts_v3'
                );


            if (raw) {

                const parsed =
                    JSON.parse(
                        raw
                    );


                if (
                    Array.isArray(
                        parsed
                    )
                ) {

                    users =
                        parsed;

                }

            }

        } catch (error) {

            console.error(
                'FIND-ME AI: unable to read citizen accounts.',
                error
            );


            return {

                success:
                    false,

                message:
                    'Unable to access citizen accounts.'

            };

        }


        const user =
            users.find(
                account => {

                    return (
                        normalize(
                            account?.email
                        ) ===
                        suppliedUsername
                    );

                }
            );


        if (!user) {

            return {

                success:
                    false,

                message:
                    'Invalid citizen email ID or password.'

            };

        }


        if (
            String(
                user.password || ''
            ) !==
            suppliedPassword
        ) {

            return {

                success:
                    false,

                message:
                    'Invalid citizen email ID or password.'

            };

        }


        /*
         * A citizen login must remain
         * a citizen login.
         */

        if (
            user.role &&
            normalize(
                user.role
            ) !==
            'citizen'
        ) {

            return {

                success:
                    false,

                message:
                    'This account is not a citizen account.'

            };

        }


        if (
            user.status &&
            normalize(
                user.status
            ) ===
            'inactive'
        ) {

            return {

                success:
                    false,

                message:
                    'This citizen account is inactive.'

            };

        }


        return {

            success:
                true,

            user: {

                ...user,

                role:
                    'citizen'

            }

        };

    }


    /* ================================================================
       ADMINISTRATOR SESSION
       ================================================================ */

    function setAdministratorSession() {

        const administrator =
            createAdministratorUser();


        app.currentUser =
            administrator;


        app.currentRole =
            ADMIN_ROLE;


        if (
            typeof app.saveSession ===
            'function'
        ) {

            app.saveSession();

        } else {

            localStorage.setItem(

                'findme_secure_session_v3',

                JSON.stringify({

                    user:
                        administrator,

                    role:
                        ADMIN_ROLE,

                    loginTime:
                        new Date().toISOString()

                })

            );

        }


        return administrator;

    }


    /* ================================================================
       CITIZEN SESSION
       ================================================================ */

    function setCitizenSession(
        user
    ) {

        app.currentUser =
            user;


        app.currentRole =
            'citizen';


        if (
            typeof app.saveSession ===
            'function'
        ) {

            app.saveSession();

        }


        return user;

    }


    /* ================================================================
       ADMINISTRATOR ACCESS CHECK
       ================================================================ */

    app.isAdministrator =
        function () {

            /*
             * First check the live application
             * role.
             */

            if (
                normalize(
                    this.currentRole
                ) ===
                ADMIN_ROLE
            ) {

                return true;

            }


            /*
             * Then check the current user.
             */

            if (
                this.currentUser &&
                (
                    this.currentUser.isAdmin ===
                        true ||

                    this.currentUser.isAdministrator ===
                        true ||

                    normalize(
                        this.currentUser.role
                    ) ===
                    ADMIN_ROLE
                )
            ) {

                return true;

            }


            /*
             * Finally check the stored session.
             */

            try {

                const raw =
                    localStorage.getItem(
                        'findme_secure_session_v3'
                    );


                if (!raw) {

                    return false;

                }


                const session =
                    JSON.parse(
                        raw
                    );


                if (
                    session &&
                    normalize(
                        session.role
                    ) ===
                    ADMIN_ROLE
                ) {

                    return true;

                }

            } catch (error) {

                console.error(
                    'FIND-ME AI: administrator session check failed.',
                    error
                );

            }


            return false;

        };


    /* ================================================================
       ADMINISTRATOR PROTECTION
       ================================================================ */

    app.requireAdministrator =
        function (
            callback
        ) {

            if (
                !this.isAdministrator()
            ) {

                this.showToast(
                    'Administrator access is required.',
                    'error'
                );


                this.currentUser =
                    null;


                this.currentRole =
                    null;


                if (
                    typeof this.clearSession ===
                    'function'
                ) {

                    this.clearSession();

                } else {

                    localStorage.removeItem(
                        'findme_secure_session_v3'
                    );

                }


                this.renderLogin();


                return false;

            }


            if (
                typeof callback ===
                'function'
            ) {

                callback.call(
                    this
                );

            }


            return true;

        };


    /* ================================================================
       ADMINISTRATOR ACTION ROUTER
       ================================================================ */

    app.handleAdministratorAction =
        function (
            action
        ) {

            /*
             * Every administrator action is
             * protected.
             */

            if (
                !this.isAdministrator()
            ) {

                this.showToast(
                    'Administrator access is required.',
                    'error'
                );


                this.renderLogin();

                return;

            }


            const selectedAction =
                normalize(
                    action
                );


            console.log(
                'FIND-ME AI administrator action:',
                selectedAction
            );


            switch (
                selectedAction
            ) {


                /* ====================================================
                   ALL CASES
                   ==================================================== */

                case 'all-cases':

                    if (
                        typeof this.renderAdministratorAllCases ===
                        'function'
                    ) {

                        this.renderAdministratorAllCases();

                    } else {

                        this.showToast(
                            'All Missing Persons is loading.',
                            'info'
                        );

                    }

                    break;


                /* ====================================================
                   SEARCH
                   ==================================================== */

                case 'search':

                    if (
                        typeof this.renderAdministratorSearch ===
                        'function'
                    ) {

                        this.renderAdministratorSearch();

                    } else {

                        this.showToast(
                            'Administrator Search is loading.',
                            'info'
                        );

                    }

                    break;


                /* ====================================================
                   VERIFICATION
                   ==================================================== */

                case 'verification':

                    if (
                        typeof this.renderAdministratorVerification ===
                        'function'
                    ) {

                        this.renderAdministratorVerification();

                    } else {

                        this.showToast(
                            'Verification is loading.',
                            'info'
                        );

                    }

                    break;


                /* ====================================================
                   ACTIVITY
                   ==================================================== */

                case 'activity':

                    if (
                        typeof this.renderAdministratorActivity ===
                        'function'
                    ) {

                        this.renderAdministratorActivity();

                    } else {

                        this.showToast(
                            'Administrator Activity is loading.',
                            'info'
                        );

                    }

                    break;


                /* ====================================================
                   DELETED CASES
                   ==================================================== */

                case 'deleted':

                    if (
                        typeof this.renderAdministratorDeletedCases ===
                        'function'
                    ) {

                        this.renderAdministratorDeletedCases();

                    } else if (
                        typeof this.renderAdministratorAllCases ===
                        'function'
                    ) {

                        this.renderAdministratorAllCases(
                            'deleted'
                        );

                    } else {

                        this.showToast(
                            'Deleted Cases is loading.',
                            'info'
                        );

                    }

                    break;


                /* ====================================================
                   LIVE CAMERA
                   ==================================================== */

                case 'live-camera':

                    if (
                        typeof this.renderAdministratorLiveCamera ===
                        'function'
                    ) {

                        this.renderAdministratorLiveCamera();

                    } else if (
                        typeof this.renderLiveCamera ===
                        'function'
                    ) {

                        this.renderLiveCamera();

                    } else {

                        this.showToast(
                            'Live Camera is loading.',
                            'info'
                        );

                    }

                    break;


                /* ====================================================
                   PHONE CAMERA
                   ==================================================== */

                case 'phone-camera':

                    if (
                        typeof this.renderAdministratorPhoneCamera ===
                        'function'
                    ) {

                        this.renderAdministratorPhoneCamera();

                    } else if (
                        typeof this.renderPhoneCamera ===
                        'function'
                    ) {

                        this.renderPhoneCamera();

                    } else {

                        this.showToast(
                            'Phone Camera Video is loading.',
                            'info'
                        );

                    }

                    break;


                /* ====================================================
                   CCTV
                   ==================================================== */

                case 'cctv':

                    if (
                        typeof this.renderAdministratorCCTV ===
                        'function'
                    ) {

                        this.renderAdministratorCCTV();

                    } else if (
                        typeof this.renderCCTVUpload ===
                        'function'
                    ) {

                        this.renderCCTVUpload();

                    } else {

                        this.showToast(
                            'CCTV Video is loading.',
                            'info'
                        );

                    }

                    break;


                /* ====================================================
                   AI IDENTIFICATION
                   ==================================================== */

                case 'ai-identification':

                    if (
                        typeof this.renderAdministratorAIIdentification ===
                        'function'
                    ) {

                        this.renderAdministratorAIIdentification();

                    } else if (
                        typeof this.renderAIIdentification ===
                        'function'
                    ) {

                        this.renderAIIdentification();

                    } else {

                        this.showToast(
                            'AI Identification is loading.',
                            'info'
                        );

                    }

                    break;


                /* ====================================================
                   DASHBOARD
                   ==================================================== */

                case 'dashboard':

                    this.openAdministratorDashboard();

                    break;


                /* ====================================================
                   LOGOUT
                   ==================================================== */

                case 'logout':

                    this.logoutAdministrator();

                    break;


                /* ====================================================
                   DEFAULT
                   ==================================================== */

                default:

                    this.showToast(
                        'Administrator module not found.',
                        'warning'
                    );

                    break;

            }

        };


    /* ================================================================
       ADMINISTRATOR DASHBOARD
       
       Part 3 will replace this with the complete
       dashboard implementation.
       ================================================================ */

    app.renderAdministratorDashboard =
        function () {

            if (
                !this.isAdministrator()
            ) {

                this.showToast(
                    'Administrator access is required.',
                    'error'
                );


                this.renderLogin();

                return;

            }


            const root =
                getRoot();


            if (!root) {

                console.error(
                    'FIND-ME AI: application root not found.'
                );

                return;

            }


            root.innerHTML = `

                <div
                    style="
                        min-height:100vh;
                        background:
                            linear-gradient(
                                135deg,
                                #eef5ff 0%,
                                #f8fbff 50%,
                                #eef2ff 100%
                            );
                        padding:28px;
                    "
                >

                    <div
                        style="
                            max-width:1250px;
                            margin:0 auto;
                        "
                    >

                        <!-- HEADER -->

                        <div
                            style="
                                display:flex;
                                align-items:center;
                                justify-content:space-between;
                                gap:20px;
                                flex-wrap:wrap;
                                margin-bottom:28px;
                            "
                        >

                            <div>

                                <div
                                    style="
                                        display:flex;
                                        align-items:center;
                                        gap:10px;
                                        color:#2563eb;
                                        font-weight:800;
                                        letter-spacing:.08em;
                                        font-size:13px;
                                    "
                                >

                                    <span
                                        style="
                                            font-size:24px;
                                        "
                                    >
                                        🤖
                                    </span>

                                    FIND-ME AI

                                </div>


                                <h1
                                    style="
                                        margin:8px 0 5px;
                                        font-size:
                                            clamp(
                                                28px,
                                                4vw,
                                                40px
                                            );
                                        color:#172033;
                                    "
                                >
                                    Administrator Dashboard
                                </h1>


                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        font-size:15px;
                                    "
                                >
                                    Secure investigation and
                                    missing-person case management
                                    center.
                                </p>

                            </div>


                            <button
                                type="button"
                                id="findme-admin-logout"
                                style="
                                    border:none;
                                    padding:
                                        12px 20px;
                                    border-radius:12px;
                                    background:#ef4444;
                                    color:white;
                                    font-weight:800;
                                    cursor:pointer;
                                "
                            >
                                🚪 Logout
                            </button>

                        </div>


                        <!-- WELCOME CARD -->

                        <div
                            style="
                                background:
                                    linear-gradient(
                                        135deg,
                                        #1d4ed8,
                                        #2563eb,
                                        #3b82f6
                                    );
                                color:white;
                                border-radius:24px;
                                padding:28px;
                                margin-bottom:24px;
                                box-shadow:
                                    0 16px 40px
                                    rgba(
                                        37,
                                        99,
                                        235,
                                        .22
                                    );
                            "
                        >

                            <div
                                style="
                                    font-size:36px;
                                    margin-bottom:8px;
                                "
                            >
                                🛡️
                            </div>


                            <h2
                                style="
                                    margin:0 0 8px;
                                    font-size:25px;
                                "
                            >
                                Welcome, Administrator
                            </h2>


                            <p
                                style="
                                    margin:0;
                                    max-width:750px;
                                    line-height:1.6;
                                    opacity:.94;
                                "
                            >
                                You have authorized access to
                                missing-person records,
                                verification, investigation,
                                CCTV analysis and AI
                                identification tools.
                            </p>

                        </div>


                        <!-- MODULE GRID -->

                        <div
                            style="
                                display:grid;
                                grid-template-columns:
                                    repeat(
                                        auto-fit,
                                        minmax(
                                            230px,
                                            1fr
                                        )
                                    );
                                gap:18px;
                            "
                        >


                            <!-- ALL CASES -->

                            <button
                                type="button"
                                data-admin-action="all-cases"
                                style="
                                    border:none;
                                    background:white;
                                    border-radius:20px;
                                    padding:24px;
                                    text-align:left;
                                    cursor:pointer;
                                    box-shadow:
                                        0 8px 25px
                                        rgba(
                                            15,
                                            23,
                                            42,
                                            .07
                                        );
                                "
                            >

                                <div
                                    style="
                                        font-size:42px;
                                    "
                                >
                                    📋
                                </div>

                                <h3
                                    style="
                                        margin:
                                            12px 0 6px;
                                        color:#172033;
                                    "
                                >
                                    All Missing Persons
                                </h3>

                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        line-height:1.5;
                                    "
                                >
                                    View and manage all
                                    registered cases.
                                </p>

                            </button>


                            <!-- SEARCH -->

                            <button
                                type="button"
                                data-admin-action="search"
                                style="
                                    border:none;
                                    background:white;
                                    border-radius:20px;
                                    padding:24px;
                                    text-align:left;
                                    cursor:pointer;
                                    box-shadow:
                                        0 8px 25px
                                        rgba(
                                            15,
                                            23,
                                            42,
                                            .07
                                        );
                                "
                            >

                                <div
                                    style="
                                        font-size:42px;
                                    "
                                >
                                    🔎
                                </div>

                                <h3
                                    style="
                                        margin:
                                            12px 0 6px;
                                        color:#172033;
                                    "
                                >
                                    Search Cases
                                </h3>

                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        line-height:1.5;
                                    "
                                >
                                    Search missing-person
                                    records quickly.
                                </p>

                            </button>


                            <!-- VERIFICATION -->

                            <button
                                type="button"
                                data-admin-action="verification"
                                style="
                                    border:none;
                                    background:white;
                                    border-radius:20px;
                                    padding:24px;
                                    text-align:left;
                                    cursor:pointer;
                                    box-shadow:
                                        0 8px 25px
                                        rgba(
                                            15,
                                            23,
                                            42,
                                            .07
                                        );
                                "
                            >

                                <div
                                    style="
                                        font-size:42px;
                                    "
                                >
                                    ✅
                                </div>

                                <h3
                                    style="
                                        margin:
                                            12px 0 6px;
                                        color:#172033;
                                    "
                                >
                                    Verification
                                </h3>

                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        line-height:1.5;
                                    "
                                >
                                    Verify or reject
                                    citizen reports.
                                </p>

                            </button>


                            <!-- ACTIVITY -->

                            <button
                                type="button"
                                data-admin-action="activity"
                                style="
                                    border:none;
                                    background:white;
                                    border-radius:20px;
                                    padding:24px;
                                    text-align:left;
                                    cursor:pointer;
                                    box-shadow:
                                        0 8px 25px
                                        rgba(
                                            15,
                                            23,
                                            42,
                                            .07
                                        );
                                "
                            >

                                <div
                                    style="
                                        font-size:42px;
                                    "
                                >
                                    📊
                                </div>

                                <h3
                                    style="
                                        margin:
                                            12px 0 6px;
                                        color:#172033;
                                    "
                                >
                                    Activity
                                </h3>

                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        line-height:1.5;
                                    "
                                >
                                    Review investigation
                                    activity and history.
                                </p>

                            </button>


                            <!-- DELETED -->

                            <button
                                type="button"
                                data-admin-action="deleted"
                                style="
                                    border:none;
                                    background:white;
                                    border-radius:20px;
                                    padding:24px;
                                    text-align:left;
                                    cursor:pointer;
                                    box-shadow:
                                        0 8px 25px
                                        rgba(
                                            15,
                                            23,
                                            42,
                                            .07
                                        );
                                "
                            >

                                <div
                                    style="
                                        font-size:42px;
                                    "
                                >
                                    🗑️
                                </div>

                                <h3
                                    style="
                                        margin:
                                            12px 0 6px;
                                        color:#172033;
                                    "
                                >
                                    Deleted Cases
                                </h3>

                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        line-height:1.5;
                                    "
                                >
                                    Review citizen-deleted
                                    cases and audit records.
                                </p>

                            </button>


                            <!-- LIVE CAMERA -->

                            <button
                                type="button"
                                data-admin-action="live-camera"
                                style="
                                    border:none;
                                    background:white;
                                    border-radius:20px;
                                    padding:24px;
                                    text-align:left;
                                    cursor:pointer;
                                    box-shadow:
                                        0 8px 25px
                                        rgba(
                                            15,
                                            23,
                                            42,
                                            .07
                                        );
                                "
                            >

                                <div
                                    style="
                                        font-size:42px;
                                    "
                                >
                                    📹
                                </div>

                                <h3
                                    style="
                                        margin:
                                            12px 0 6px;
                                        color:#172033;
                                    "
                                >
                                    Live Camera
                                </h3>

                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        line-height:1.5;
                                    "
                                >
                                    Use live camera for
                                    investigation.
                                </p>

                            </button>


                            <!-- PHONE VIDEO -->

                            <button
                                type="button"
                                data-admin-action="phone-camera"
                                style="
                                    border:none;
                                    background:white;
                                    border-radius:20px;
                                    padding:24px;
                                    text-align:left;
                                    cursor:pointer;
                                    box-shadow:
                                        0 8px 25px
                                        rgba(
                                            15,
                                            23,
                                            42,
                                            .07
                                        );
                                "
                            >

                                <div
                                    style="
                                        font-size:42px;
                                    "
                                >
                                    📱
                                </div>

                                <h3
                                    style="
                                        margin:
                                            12px 0 6px;
                                        color:#172033;
                                    "
                                >
                                    Phone Camera Video
                                </h3>

                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        line-height:1.5;
                                    "
                                >
                                    Process videos from
                                    mobile devices.
                                </p>

                            </button>


                            <!-- CCTV -->

                            <button
                                type="button"
                                data-admin-action="cctv"
                                style="
                                    border:none;
                                    background:white;
                                    border-radius:20px;
                                    padding:24px;
                                    text-align:left;
                                    cursor:pointer;
                                    box-shadow:
                                        0 8px 25px
                                        rgba(
                                            15,
                                            23,
                                            42,
                                            .07
                                        );
                                "
                            >

                                <div
                                    style="
                                        font-size:42px;
                                    "
                                >
                                    🎥
                                </div>

                                <h3
                                    style="
                                        margin:
                                            12px 0 6px;
                                        color:#172033;
                                    "
                                >
                                    CCTV Video
                                </h3>

                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        line-height:1.5;
                                    "
                                >
                                    Upload and analyze
                                    CCTV footage.
                                </p>

                            </button>


                            <!-- AI -->

                            <button
                                type="button"
                                data-admin-action="ai-identification"
                                style="
                                    border:none;
                                    background:white;
                                    border-radius:20px;
                                    padding:24px;
                                    text-align:left;
                                    cursor:pointer;
                                    box-shadow:
                                        0 8px 25px
                                        rgba(
                                            15,
                                            23,
                                            42,
                                            .07
                                        );
                                "
                            >

                                <div
                                    style="
                                        font-size:42px;
                                    "
                                >
                                    🤖
                                </div>

                                <h3
                                    style="
                                        margin:
                                            12px 0 6px;
                                        color:#172033;
                                    "
                                >
                                    AI Identification
                                </h3>

                                <p
                                    style="
                                        margin:0;
                                        color:#64748b;
                                        line-height:1.5;
                                    "
                                >
                                    Analyze images and
                                    videos for matches.
                                </p>

                            </button>

                        </div>


                        <!-- SECURITY NOTICE -->

                        <div
                            style="
                                margin-top:24px;
                                padding:20px;
                                background:white;
                                border-radius:18px;
                                border:1px solid #dbeafe;
                                box-shadow:
                                    0 6px 20px
                                    rgba(
                                        15,
                                        23,
                                        42,
                                        .04
                                    );
                            "
                        >

                            <div
                                style="
                                    font-size:26px;
                                    margin-bottom:7px;
                                "
                            >
                                🔐
                            </div>

                            <strong
                                style="
                                    color:#172033;
                                    font-size:16px;
                                "
                            >
                                Secure Administrator Access
                            </strong>

                            <p
                                style="
                                    margin:
                                        7px 0 0;
                                    color:#64748b;
                                    line-height:1.5;
                                "
                            >
                                Administrator-only investigation
                                functions are protected by the
                                administrator authentication
                                state.
                            </p>

                        </div>

                    </div>

                </div>

            `;


            /* ========================================================
               LOGOUT
               ======================================================== */

            const logoutButton =
                root.querySelector(
                    '#findme-admin-logout'
                );


            logoutButton?.addEventListener(
                'click',
                () => {

                    this.logoutAdministrator();

                }
            );


            /* ========================================================
               ADMIN DASHBOARD BUTTONS
               ======================================================== */

            const buttons =
                root.querySelectorAll(
                    '[data-admin-action]'
                );


            buttons.forEach(
                button => {

                    button.addEventListener(
                        'click',
                        () => {

                            const action =
                                button.getAttribute(
                                    'data-admin-action'
                                );


                            this.handleAdministratorAction(
                                action
                            );

                        }
                    );

                }
            );

        };


    /* ================================================================
       ADMINISTRATOR LOGOUT
       ================================================================ */

    app.logoutAdministrator =
        function () {

            if (
                typeof this.stopCamera ===
                'function'
            ) {

                this.stopCamera();

            }


            this.currentUser =
                null;


            this.currentRole =
                null;


            if (
                typeof this.clearSession ===
                'function'
            ) {

                this.clearSession();

            } else {

                localStorage.removeItem(
                    'findme_secure_session_v3'
                );

            }


            this.renderLogin();

        };


    /* ================================================================
       OPEN ADMIN DASHBOARD
       ================================================================ */

    app.openAdministratorDashboard =
        function () {

            if (
                !this.isAdministrator()
            ) {

                this.showToast(
                    'Administrator access is required.',
                    'error'
                );


                this.renderLogin();

                return;

            }


            if (
                typeof this.renderAdministratorDashboard ===
                'function'
            ) {

                this.renderAdministratorDashboard();

            }

        };


    /* ================================================================
       THE MAIN LOGIN FUNCTION
       
       IMPORTANT:
       Part 1 already owns the login button.
       We ONLY replace handleLogin().
       
       NO addEventListener() here.
       ================================================================ */

    app.handleLogin =
        async function () {

            clearLoginError();


            const username =
                getLoginUsername();


            const password =
                getLoginPassword();


            /*
             * THIS IS THE IMPORTANT FIX.
             *
             * We read the checked radio button:
             *
             * #login-role-admin
             * #login-role-citizen
             */

            const role =
                getSelectedRole();


            console.log(
                'FIND-ME AI login attempt:',
                {
                    username:
                        username,

                    selectedRole:
                        role
                }
            );


            /* ========================================================
               EMPTY INPUT
               ======================================================== */

            if (
                !username ||
                !password
            ) {

                showLoginError(
                    'Please enter your username/email and password.'
                );


                this.showToast(
                    'Please enter your username/email and password.',
                    'warning'
                );


                return;

            }


            /* ========================================================
               ADMINISTRATOR
               ======================================================== */

            if (
                role ===
                ADMIN_ROLE
            ) {

                console.log(
                    'FIND-ME AI: administrator authentication started.'
                );


                const result =
                    authenticateAdministrator(
                        username,
                        password
                    );


                if (
                    !result.success
                ) {

                    showLoginError(
                        result.message
                    );


                    this.showToast(
                        result.message,
                        'error'
                    );


                    return;

                }


                const administrator =
                    setAdministratorSession();


                console.log(
                    'FIND-ME AI administrator authenticated:',
                    administrator
                );


                /*
                 * EXACTLY ONE SUCCESS TOAST
                 */

                this.showToast(
                    'Administrator login successful.',
                    'success'
                );


                /*
                 * Open administrator dashboard.
                 */

                this.openAdministratorDashboard();


                return;

            }


            /* ========================================================
               CITIZEN
               ======================================================== */

            if (
                role ===
                'citizen'
            ) {

                console.log(
                    'FIND-ME AI: citizen authentication started.'
                );


                const result =
                    authenticateCitizen(
                        username,
                        password
                    );


                if (
                    !result.success
                ) {

                    showLoginError(
                        result.message
                    );


                    this.showToast(
                        result.message,
                        'error'
                    );


                    return;

                }


                const citizen =
                    setCitizenSession(
                        result.user
                    );


                console.log(
                    'FIND-ME AI citizen authenticated:',
                    citizen
                );


                /*
                 * EXACTLY ONE SUCCESS TOAST
                 */

                this.showToast(
                    'Login successful.',
                    'success'
                );


                if (
                    typeof this.renderCitizenDashboard ===
                    'function'
                ) {

                    this.renderCitizenDashboard();

                }


                return;

            }


            /* ========================================================
               INVALID ROLE
               ======================================================== */

            showLoginError(
                'Please select an account type.'
            );


            this.showToast(
                'Please select an account type.',
                'warning'
            );

        };


    /* ================================================================
       ADMINISTRATOR MODULE GUARD
       ================================================================ */

    app.runAdministratorAction =
        function (
            action,
            callback
        ) {

            if (
                !this.isAdministrator()
            ) {

                this.showToast(
                    'Unauthorized administrator access.',
                    'error'
                );


                this.renderLogin();


                return false;

            }


            if (
                typeof callback ===
                'function'
            ) {

                callback.call(
                    this,
                    action
                );

            } else {

                this.handleAdministratorAction(
                    action
                );

            }


            return true;

        };


    /* ================================================================
       PART 3 COMPATIBILITY
       
       When Part 3 is pasted after this Part 2,
       it will replace the placeholder dashboard
       and administrator module methods.
       ================================================================ */

    app.adminCredentialsConfigured =
        true;


    app.adminUsername =
        ADMIN_USERNAME;


    app.adminRole =
        ADMIN_ROLE;


    /* ================================================================
       FINAL LOG
       ================================================================ */

    console.log(
        '================================================'
    );

    console.log(
        'FIND-ME AI PART 2 LOADED'
    );

    console.log(
        'Administrator authentication: READY'
    );

    console.log(
        'Role detection: RADIO BUTTON BASED'
    );

    console.log(
        'Administrator radio:',
        document.getElementById(
            'login-role-admin'
        )
    );

    console.log(
        'Citizen radio:',
        document.getElementById(
            'login-role-citizen'
        )
    );

    console.log(
        '================================================'
    );

})();


/* ================================================================
   FIND-ME AI
   PART 3 — PHOTO VISIBILITY + FULL PHOTO PREVIEW FIX
   ---------------------------------------------------------------
   PURPOSE:
   • Show the complete registered missing-person photograph.
   • Never crop the photograph with object-fit: cover.
   • Add a Preview Full Photo button.
   • Open the original photograph in a large full-screen viewer.
   • Preserve all existing Part 3 case-management functions.
   • Administrator only.
   • Does NOT modify Part 5 / Investigation Center.
   ================================================================ */

(function () {

    'use strict';


    /* ================================================================
       APPLICATION
       ================================================================ */

    const app =
        window.findMeApp;


    if (!app) {

        console.error(
            'FIND-ME PART 3 PHOTO FIX: findMeApp was not found.'
        );

        return;

    }


    /* ================================================================
       ADMINISTRATOR ACCESS
       ================================================================ */

    function isAdministrator() {

        try {

            if (
                typeof app.isAdministrator ===
                'function'
            ) {

                return Boolean(
                    app.isAdministrator()
                );

            }


            if (
                app.currentRole
            ) {

                return (
                    String(
                        app.currentRole
                    )
                        .trim()
                        .toLowerCase() ===
                    'administrator'
                );

            }


            return false;

        } catch (error) {

            console.error(
                'FIND-ME PART 3 PHOTO FIX: administrator check failed.',
                error
            );

            return false;

        }

    }


    function requireAdministrator() {

        if (
            isAdministrator()
        ) {

            return true;

        }


        try {

            if (
                typeof app.showToast ===
                'function'
            ) {

                app.showToast(
                    'Administrator access is required.',
                    'error'
                );

            }


            if (
                typeof app.renderLogin ===
                'function'
            ) {

                app.renderLogin();

            }

        } catch (error) {

            console.error(
                'FIND-ME PART 3 PHOTO FIX: access redirect failed.',
                error
            );

        }


        return false;

    }


    /* ================================================================
       SAFE HELPERS
       ================================================================ */

    function safeString(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return '';

        }

        return String(value);

    }


    function escapeHTML(value) {

        return safeString(value)
            .replace(
                /&/g,
                '&amp;'
            )
            .replace(
                /</g,
                '&lt;'
            )
            .replace(
                />/g,
                '&gt;'
            )
            .replace(
                /"/g,
                '&quot;'
            )
            .replace(
                /'/g,
                '&#039;'
            );

    }


    function getRoot() {

        if (
            app.elements &&
            app.elements.root
        ) {

            return app.elements.root;

        }


        return document.getElementById(
            'findme-app-root'
        );

    }


    function getPhoto(caseItem) {

        if (!caseItem) {

            return '';

        }


        return (
            caseItem.photo ||
            caseItem.photoData ||
            caseItem.photoDataURL ||
            caseItem.image ||
            caseItem.imageData ||
            caseItem.referencePhoto ||
            caseItem.referenceImage ||
            caseItem.missingPersonPhoto ||
            caseItem.missingPersonImage ||
            ''
        );

    }


    function getPersonName(caseItem) {

        return (
            caseItem?.name ||
            caseItem?.missingPersonName ||
            caseItem?.personName ||
            caseItem?.fullName ||
            'Missing Person'
        );

    }


    function getCaseNumber(caseItem) {

        return (
            caseItem?.caseNumber ||
            caseItem?.caseNo ||
            caseItem?.case_id ||
            caseItem?.caseId ||
            caseItem?.id ||
            'Unknown Case'
        );

    }


    /* ================================================================
       PHOTO FIX STYLES
       ================================================================ */

    function injectPhotoFixStyles() {

        if (
            document.getElementById(
                'findme-part3-photo-fix-styles'
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                'style'
            );


        style.id =
            'findme-part3-photo-fix-styles';


        style.textContent = `

            /* =========================================================
               CASE DETAIL PHOTO
               ========================================================= */

            .findme-admin-detail-photo {

                width:
                    100% !important;

                height:
                    auto !important;

                max-height:
                    none !important;

                min-height:
                    0 !important;

                object-fit:
                    contain !important;

                object-position:
                    center !important;

                display:
                    block !important;

                background:
                    #f8fafc !important;

                border-radius:
                    18px !important;

                cursor:
                    zoom-in !important;

            }


            /* =========================================================
               PHOTO WRAPPER
               ========================================================= */

            .findme-part3-photo-wrapper {

                width:
                    100%;

                display:
                    flex;

                flex-direction:
                    column;

                align-items:
                    center;

                justify-content:
                    flex-start;

                padding:
                    18px;

                background:
                    #f8fafc;

                border:
                    1px solid #e2e8f0;

                border-radius:
                    20px;

                box-sizing:
                    border-box;

            }


            .findme-part3-photo-wrapper img {

                width:
                    100% !important;

                height:
                    auto !important;

                max-height:
                    none !important;

                object-fit:
                    contain !important;

                object-position:
                    center !important;

                display:
                    block !important;

                border-radius:
                    16px !important;

                background:
                    #ffffff;

            }


            /* =========================================================
               PHOTO LABEL
               ========================================================= */

            .findme-part3-photo-label {

                width:
                    100%;

                margin-bottom:
                    12px;

                font-size:
                    14px;

                font-weight:
                    800;

                color:
                    #1e293b;

                text-align:
                    left;

            }


            /* =========================================================
               PREVIEW BUTTON
               ========================================================= */

            .findme-part3-preview-photo {

                margin-top:
                    14px;

                width:
                    100%;

                min-height:
                    46px;

                border:
                    none;

                border-radius:
                    12px;

                padding:
                    12px 18px;

                background:
                    linear-gradient(
                        135deg,
                        #2563eb,
                        #1d4ed8
                    );

                color:
                    #ffffff;

                font-size:
                    14px;

                font-weight:
                    800;

                cursor:
                    pointer;

                transition:
                    transform .18s ease,
                    box-shadow .18s ease;

            }


            .findme-part3-preview-photo:hover {

                transform:
                    translateY(-1px);

                box-shadow:
                    0 8px 20px
                    rgba(
                        37,
                        99,
                        235,
                        .25
                    );

            }


            /* =========================================================
               PHOTO INFORMATION
               ========================================================= */

            .findme-part3-photo-info {

                width:
                    100%;

                margin-top:
                    10px;

                font-size:
                    12px;

                line-height:
                    1.5;

                color:
                    #64748b;

                text-align:
                    left;

            }


            /* =========================================================
               FULL PHOTO MODAL
               ========================================================= */

            #findme-part3-photo-modal {

                position:
                    fixed;

                inset:
                    0;

                z-index:
                    999999;

                display:
                    none;

                align-items:
                    center;

                justify-content:
                    center;

                padding:
                    24px;

                background:
                    rgba(
                        15,
                        23,
                        42,
                        .88
                    );

                box-sizing:
                    border-box;

            }


            #findme-part3-photo-modal.active {

                display:
                    flex;

            }


            .findme-part3-photo-modal-panel {

                position:
                    relative;

                width:
                    min(
                        96vw,
                        1200px
                    );

                height:
                    min(
                        94vh,
                        900px
                    );

                display:
                    flex;

                flex-direction:
                    column;

                align-items:
                    center;

                justify-content:
                    center;

                padding:
                    22px;

                box-sizing:
                    border-box;

                background:
                    #ffffff;

                border-radius:
                    22px;

                box-shadow:
                    0 30px 80px
                    rgba(
                        0,
                        0,
                        0,
                        .35
                    );

            }


            .findme-part3-photo-modal-title {

                width:
                    100%;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap:
                    16px;

                padding:
                    0 42px 14px 0;

                box-sizing:
                    border-box;

            }


            .findme-part3-photo-modal-title strong {

                display:
                    block;

                font-size:
                    18px;

                color:
                    #0f172a;

            }


            .findme-part3-photo-modal-title small {

                display:
                    block;

                margin-top:
                    3px;

                font-size:
                    12px;

                color:
                    #64748b;

            }


            .findme-part3-photo-modal-image-container {

                flex:
                    1;

                width:
                    100%;

                min-height:
                    0;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                overflow:
                    auto;

                padding:
                    8px;

                box-sizing:
                    border-box;

                background:
                    #f8fafc;

                border-radius:
                    16px;

            }


            .findme-part3-photo-modal-image {

                display:
                    block;

                width:
                    auto !important;

                height:
                    auto !important;

                max-width:
                    100% !important;

                max-height:
                    100% !important;

                object-fit:
                    contain !important;

                object-position:
                    center !important;

                border-radius:
                    12px;

                background:
                    #ffffff;

            }


            /* =========================================================
               CLOSE BUTTON
               ========================================================= */

            #findme-part3-photo-modal-close {

                position:
                    absolute;

                top:
                    12px;

                right:
                    12px;

                width:
                    42px;

                height:
                    42px;

                border:
                    none;

                border-radius:
                    50%;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                background:
                    #fee2e2;

                color:
                    #991b1b;

                font-size:
                    20px;

                font-weight:
                    900;

                cursor:
                    pointer;

                z-index:
                    2;

            }


            #findme-part3-photo-modal-close:hover {

                background:
                    #fecaca;

            }


            /* =========================================================
               MOBILE
               ========================================================= */

            @media (
                max-width: 700px
            ) {

                #findme-part3-photo-modal {

                    padding:
                        10px;

                }


                .findme-part3-photo-modal-panel {

                    width:
                        100%;

                    height:
                        96vh;

                    padding:
                        14px;

                    border-radius:
                        16px;

                }


                .findme-part3-photo-wrapper {

                    padding:
                        12px;

                }


                .findme-part3-preview-photo {

                    min-height:
                        48px;

                }

            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* ================================================================
       FULL PHOTO MODAL
       ================================================================ */

    function ensurePhotoModal() {

        if (
            document.getElementById(
                'findme-part3-photo-modal'
            )
        ) {

            return;

        }


        const modal =
            document.createElement(
                'div'
            );


        modal.id =
            'findme-part3-photo-modal';


        modal.innerHTML = `

            <div
                class="
                    findme-part3-photo-modal-panel
                "
                role="dialog"
                aria-modal="true"
                aria-label="Full missing-person photograph"
            >

                <button
                    type="button"
                    id="findme-part3-photo-modal-close"
                    aria-label="Close photo preview"
                    title="Close"
                >
                    ×
                </button>


                <div
                    class="
                        findme-part3-photo-modal-title
                    "
                >

                    <div>

                        <strong
                            id="findme-part3-photo-modal-name"
                        >
                            Missing Person
                        </strong>

                        <small
                            id="findme-part3-photo-modal-case"
                        >
                            Case
                        </small>

                    </div>

                </div>


                <div
                    class="
                        findme-part3-photo-modal-image-container
                    "
                >

                    <img
                        id="findme-part3-photo-modal-image"
                        class="
                            findme-part3-photo-modal-image
                        "
                        alt="Missing person photograph"
                    >

                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        const closeButton =
            modal.querySelector(
                '#findme-part3-photo-modal-close'
            );


        closeButton?.addEventListener(
            'click',
            closePhotoModal
        );


        modal.addEventListener(
            'click',
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    closePhotoModal();

                }

            }
        );

    }


    function openPhotoModal(
        photo,
        name,
        caseNo
    ) {

        if (
            !requireAdministrator()
        ) {

            return;

        }


        if (!photo) {

            if (
                typeof app.showToast ===
                'function'
            ) {

                app.showToast(
                    'No photograph is available for this case.',
                    'warning'
                );

            }

            return;

        }


        ensurePhotoModal();


        const modal =
            document.getElementById(
                'findme-part3-photo-modal'
            );


        const image =
            document.getElementById(
                'findme-part3-photo-modal-image'
            );


        const nameElement =
            document.getElementById(
                'findme-part3-photo-modal-name'
            );


        const caseElement =
            document.getElementById(
                'findme-part3-photo-modal-case'
            );


        if (!modal || !image) {

            return;

        }


        image.src =
            photo;


        image.alt =
            safeString(name) +
            ' photograph';


        if (nameElement) {

            nameElement.textContent =
                safeString(name) ||
                'Missing Person';

        }


        if (caseElement) {

            caseElement.textContent =
                'Case ID: ' +
                (
                    safeString(caseNo) ||
                    'Unknown'
                );

        }


        modal.classList.add(
            'active'
        );


        document.body.style.overflow =
            'hidden';

    }


    function closePhotoModal() {

        const modal =
            document.getElementById(
                'findme-part3-photo-modal'
            );


        const image =
            document.getElementById(
                'findme-part3-photo-modal-image'
            );


        if (modal) {

            modal.classList.remove(
                'active'
            );

        }


        if (image) {

            image.removeAttribute(
                'src'
            );

        }


        document.body.style.overflow =
            '';

    }


    /* ================================================================
       ESC KEY
       ================================================================ */

    function attachGlobalPhotoKeyboard() {

        if (
            document.body.dataset.findmePart3PhotoKeyboard
        ) {

            return;

        }


        document.body.dataset.findmePart3PhotoKeyboard =
            'true';


        document.addEventListener(
            'keydown',
            function (event) {

                if (
                    event.key ===
                    'Escape'
                ) {

                    const modal =
                        document.getElementById(
                            'findme-part3-photo-modal'
                        );


                    if (
                        modal &&
                        modal.classList.contains(
                            'active'
                        )
                    ) {

                        closePhotoModal();

                    }

                }

            }
        );

    }


    /* ================================================================
       ADD PREVIEW BUTTON TO EXISTING CASE DETAILS
       ================================================================ */

    function enhanceCurrentCasePhoto() {

        if (
            !isAdministrator()
        ) {

            return;

        }


        const root =
            getRoot();


        if (!root) {

            return;

        }


        const photo =
            root.querySelector(
                '.findme-admin-detail-photo'
            );


        if (!photo) {

            return;

        }


        /* ------------------------------------------------------------
           Remove cropping from the existing image.
           ------------------------------------------------------------ */

        photo.style.width =
            '100%';

        photo.style.height =
            'auto';

        photo.style.maxHeight =
            'none';

        photo.style.objectFit =
            'contain';

        photo.style.objectPosition =
            'center';

        photo.style.display =
            'block';


        /* ------------------------------------------------------------
           Prevent duplicate preview buttons.
           ------------------------------------------------------------ */

        if (
            root.querySelector(
                '#findme-part3-preview-photo-button'
            )
        ) {

            return;

        }


        const originalContainer =
            photo.parentElement;


        if (!originalContainer) {

            return;

        }


        const wrapper =
            document.createElement(
                'div'
            );


        wrapper.className =
            'findme-part3-photo-wrapper';


        const label =
            document.createElement(
                'div'
            );


        label.className =
            'findme-part3-photo-label';


        label.textContent =
            '📷 Registered Missing-Person Photograph';


        const info =
            document.createElement(
                'div'
            );


        info.className =
            'findme-part3-photo-info';


        info.textContent =
            'The complete original photograph is displayed. Use Preview Full Photo for a larger view.';


        const button =
            document.createElement(
                'button'
            );


        button.type =
            'button';


        button.id =
            'findme-part3-preview-photo-button';


        button.className =
            'findme-part3-preview-photo';


        button.textContent =
            '🔍 Preview Full Photo';


        const originalParent =
            photo.parentElement;


        originalParent.replaceChild(
            wrapper,
            photo
        );


        wrapper.appendChild(
            label
        );


        wrapper.appendChild(
            photo
        );


        wrapper.appendChild(
            button
        );


        wrapper.appendChild(
            info
        );


        button.addEventListener(
            'click',
            function () {

                const caseName =
                    root.querySelector(
                        '.findme-admin-section-title'
                    )?.textContent?.trim() ||
                    photo.alt ||
                    'Missing Person';


                const caseNumberText =
                    root.querySelector(
                        '.findme-admin-brand-subtitle'
                    )?.textContent?.trim() ||
                    'Unknown';


                openPhotoModal(
                    photo.currentSrc ||
                    photo.src,
                    caseName,
                    caseNumberText
                );

            }
        );


        photo.addEventListener(
            'click',
            function () {

                const caseName =
                    root.querySelector(
                        '.findme-admin-section-title'
                    )?.textContent?.trim() ||
                    photo.alt ||
                    'Missing Person';


                const caseNumberText =
                    root.querySelector(
                        '.findme-admin-brand-subtitle'
                    )?.textContent?.trim() ||
                    'Unknown';


                openPhotoModal(
                    photo.currentSrc ||
                    photo.src,
                    caseName,
                    caseNumberText
                );

            }
        );

    }


    /* ================================================================
       OBSERVE ADMIN ROOT
       ================================================================ */

    function observeCaseDetails() {

        const root =
            getRoot();


        if (!root) {

            return;

        }


        if (
            root.dataset.findmePart3PhotoObserver
        ) {

            return;

        }


        root.dataset.findmePart3PhotoObserver =
            'true';


        const observer =
            new MutationObserver(
                function () {

                    if (
                        !isAdministrator()
                    ) {

                        return;

                    }


                    enhanceCurrentCasePhoto();

                }
            );


        observer.observe(
            root,
            {
                childList:
                    true,

                subtree:
                    true
            }
        );


        enhanceCurrentCasePhoto();

    }


    /* ================================================================
       INITIALIZE PHOTO FIX
       ================================================================ */

    injectPhotoFixStyles();

    ensurePhotoModal();

    attachGlobalPhotoKeyboard();

    observeCaseDetails();


    /* ================================================================
       PUBLIC METHODS
       ================================================================ */

    app.openAdministratorPhotoPreview =
        function (
            photo,
            name,
            caseNo
        ) {

            openPhotoModal(
                photo,
                name,
                caseNo
            );

        };


    app.closeAdministratorPhotoPreview =
        function () {

            closePhotoModal();

        };


    app.refreshAdministratorPhotoDisplay =
        function () {

            injectPhotoFixStyles();

            ensurePhotoModal();

            enhanceCurrentCasePhoto();

        };


    /* ================================================================
       FINAL STATUS
       ================================================================ */

    console.log(
        '================================================'
    );

    console.log(
        'FIND-ME AI PART 3 PHOTO FIX LOADED'
    );

    console.log(
        'Complete photograph display: ENABLED'
    );

    console.log(
        'Photo cropping prevention: ENABLED'
    );

    console.log(
        'Full photograph preview: ENABLED'
    );

    console.log(
        'Administrator-only photo preview: ENABLED'
    );

    console.log(
        'Investigation Center / Part 5: UNCHANGED'
    );

    console.log(
        '================================================'
    );


})();


/* ============================================================
   FIND-ME AI — PART 3
   Administrator Dashboard + Case Management
   Version: 3.5.0
   ============================================================ */

(function () {
  'use strict';

  const app = window.findMeApp || window.FindMeApp;
  if (!app) {
    console.error('FIND-ME Part 3: findMeApp was not found.');
    return;
  }

  const CASES_KEY = 'findme_cases_v3';
  const NOTIFICATIONS_KEY = 'findme_notifications_v3';
  const ACTIVITY_KEY = 'findme_activity_v3';

  const ADMIN_EMAIL = 'keerthigagopinath1606@gmail.com';

  /* ============================================================
     BASIC HELPERS
     ============================================================ */

  function root() {
    if (typeof app.getRoot === 'function') {
      return app.getRoot();
    }

    return document.getElementById('findme-app') ||
           document.getElementById('app') ||
           document.body;
  }

  function readArray(key) {
    try {
      const value = localStorage.getItem(key);
      if (!value) return [];
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('FIND-ME storage read error:', key, error);
      return [];
    }
  }

  function writeArray(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('FIND-ME storage write error:', key, error);
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalize(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  function getCases() {
    return readArray(CASES_KEY);
  }

  function saveCases(value) {
    return writeArray(CASES_KEY, value);
  }

  function getCaseId(item) {
    if (!item) return '';

    return String(
      item.caseId ||
      item.caseID ||
      item.id ||
      item.case_id ||
      ''
    );
  }

  function getPersonName(item) {
    if (!item) return 'Unknown';

    return String(
      item.missingPersonName ||
      item.personName ||
      item.name ||
      item.missing_person_name ||
      'Unknown'
    );
  }

  function getPhoto(item) {
    if (!item) return '';

    return String(
      item.photo ||
      item.photoData ||
      item.photoDataURL ||
      item.image ||
      item.imageData ||
      item.referencePhoto ||
      item.referenceImage ||
      item.missingPersonPhoto ||
      item.missingPersonImage ||
      ''
    );
  }

  function getStatus(item) {
    if (!item) return 'pending';

    return String(
      item.status ||
      item.verificationStatus ||
      item.caseStatus ||
      item.backendStatus ||
      'pending'
    );
  }

  function isDeleted(item) {
    return Boolean(
      item &&
      (
        item.deleted === true ||
        item.isDeleted === true ||
        normalize(item.status) === 'deleted'
      )
    );
  }

  function getAdminEmail() {
    return ADMIN_EMAIL;
  }

  function isAdmin() {
    try {
      if (typeof app.isAdministrator === 'function') {
        return app.isAdministrator() === true;
      }

      if (app.isAdministrator === true) {
        return true;
      }

      const session =
        localStorage.getItem('findme_session') ||
        localStorage.getItem('findme_current_user');

      if (!session) return false;

      const parsed = JSON.parse(session);

      return normalize(parsed.role) === 'administrator' ||
             normalize(parsed.accountType) === 'administrator' ||
             normalize(parsed.userType) === 'administrator';
    } catch (error) {
      return false;
    }
  }

  function requireAdmin() {
    if (isAdmin()) return true;

    if (typeof app.renderLogin === 'function') {
      app.renderLogin();
    }

    return false;
  }

  function addActivity(action, caseItem) {
    const activities = readArray(ACTIVITY_KEY);

    activities.unshift({
      id: 'ACT-' + Date.now(),
      action: action,
      caseId: getCaseId(caseItem),
      personName: getPersonName(caseItem),
      performedBy: ADMIN_EMAIL,
      performedAt: new Date().toISOString()
    });

    writeArray(
      ACTIVITY_KEY,
      activities.slice(0, 200)
    );
  }

  function addNotification(title, message, caseItem) {
    const notifications =
      readArray(NOTIFICATIONS_KEY);

    notifications.unshift({
      id: 'NT-' + Date.now(),
      title: title,
      message: message,
      caseId: getCaseId(caseItem),
      createdAt: new Date().toISOString(),
      read: false
    });

    writeArray(
      NOTIFICATIONS_KEY,
      notifications.slice(0, 200)
    );
  }

  function statusLabel(status) {
    const value = normalize(status);

    if (
      value === 'verified-active' ||
      value === 'verified' ||
      value === 'active'
    ) {
      return 'Verified & Active';
    }

    if (
      value === 'under verification' ||
      value === 'under-verification' ||
      value === 'verification'
    ) {
      return 'Under Verification';
    }

    if (value === 'rejected') {
      return 'Rejected';
    }

    if (value === 'resolved') {
      return 'Resolved';
    }

    if (value === 'deleted') {
      return 'Deleted';
    }

    return 'Pending';
  }

  function statusClass(status) {
    const value = normalize(status);

    if (
      value === 'verified-active' ||
      value === 'verified' ||
      value === 'active'
    ) {
      return 'fm3-status-active';
    }

    if (value === 'rejected') {
      return 'fm3-status-rejected';
    }

    if (value === 'resolved') {
      return 'fm3-status-resolved';
    }

    if (value === 'deleted') {
      return 'fm3-status-deleted';
    }

    return 'fm3-status-pending';
  }

  function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return escapeHTML(value);
    }

    return date.toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  function findCase(caseId) {
    const target = normalize(caseId);

    return getCases().find(
      item => normalize(getCaseId(item)) === target
    );
  }

  /* ============================================================
     CSS
     ============================================================ */

  if (!document.getElementById('findme-part3-style')) {

    const style = document.createElement('style');

    style.id = 'findme-part3-style';

    style.textContent = `
      .fm3-page {
        width: 100%;
        min-height: 100%;
        box-sizing: border-box;
        padding: 28px;
        font-family: Inter, Arial, sans-serif;
      }

      .fm3-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 26px;
        flex-wrap: wrap;
      }

      .fm3-title {
        margin: 0;
        font-size: 30px;
        font-weight: 800;
        color: #123b70;
      }

      .fm3-subtitle {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 14px;
      }

      .fm3-back {
        border: 0;
        border-radius: 12px;
        padding: 11px 17px;
        background: #eaf2ff;
        color: #1859a5;
        font-weight: 700;
        cursor: pointer;
      }

      .fm3-back:hover {
        background: #dceaff;
      }

      .fm3-grid {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(220px, 1fr));
        gap: 18px;
      }

      .fm3-card {
        border: 1px solid #dbe7f5;
        border-radius: 18px;
        padding: 22px;
        background: linear-gradient(
          145deg,
          #ffffff,
          #f5f9ff
        );
        box-shadow:
          0 8px 25px rgba(30, 75, 125, 0.08);
      }

      .fm3-card-icon {
        width: 52px;
        height: 52px;
        border-radius: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #eaf3ff;
        font-size: 26px;
        margin-bottom: 14px;
      }

      .fm3-card h3 {
        margin: 0 0 7px;
        color: #173f72;
        font-size: 17px;
      }

      .fm3-card p {
        margin: 0;
        color: #64748b;
        line-height: 1.5;
        font-size: 13px;
      }

      .fm3-card button {
        width: 100%;
        margin-top: 16px;
        border: 0;
        border-radius: 11px;
        padding: 11px 14px;
        background: #1769d2;
        color: white;
        font-weight: 700;
        cursor: pointer;
      }

      .fm3-card button:hover {
        background: #0d58b5;
      }

      .fm3-stat {
        font-size: 30px;
        font-weight: 800;
        color: #1769d2;
        margin: 5px 0;
      }

      .fm3-toolbar {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }

      .fm3-toolbar input,
      .fm3-toolbar select {
        flex: 1;
        min-width: 180px;
        border: 1px solid #cbd8e8;
        border-radius: 10px;
        padding: 11px 13px;
        outline: none;
        background: white;
      }

      .fm3-toolbar button {
        border: 0;
        border-radius: 10px;
        padding: 11px 16px;
        background: #1769d2;
        color: white;
        font-weight: 700;
        cursor: pointer;
      }

      .fm3-table-wrap {
        overflow-x: auto;
        background: white;
        border-radius: 16px;
        border: 1px solid #dbe5f0;
        box-shadow:
          0 8px 25px rgba(20, 50, 90, .06);
      }

      .fm3-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 850px;
      }

      .fm3-table th {
        background: #edf5ff;
        color: #214a79;
        padding: 14px;
        text-align: left;
        font-size: 13px;
      }

      .fm3-table td {
        padding: 14px;
        border-top: 1px solid #edf1f6;
        color: #334155;
        font-size: 13px;
        vertical-align: middle;
      }

      .fm3-person-cell {
        display: flex;
        align-items: center;
        gap: 11px;
      }

      .fm3-thumb {
        width: 48px;
        height: 48px;
        border-radius: 9px;
        object-fit: cover;
        border: 1px solid #d9e3ef;
        background: #f1f5f9;
      }

      .fm3-status {
        display: inline-block;
        border-radius: 20px;
        padding: 6px 10px;
        font-weight: 700;
        font-size: 11px;
      }

      .fm3-status-active {
        background: #dcfce7;
        color: #166534;
      }

      .fm3-status-pending {
        background: #fef3c7;
        color: #92400e;
      }

      .fm3-status-rejected {
        background: #fee2e2;
        color: #991b1b;
      }

      .fm3-status-resolved {
        background: #dbeafe;
        color: #1e40af;
      }

      .fm3-status-deleted {
        background: #e2e8f0;
        color: #475569;
      }

      .fm3-action {
        border: 0;
        border-radius: 9px;
        padding: 8px 11px;
        background: #eaf2ff;
        color: #1459a6;
        font-weight: 700;
        cursor: pointer;
      }

      .fm3-action:hover {
        background: #dbeaff;
      }

      .fm3-detail-grid {
        display: grid;
        grid-template-columns:
          minmax(280px, 420px) 1fr;
        gap: 25px;
        align-items: start;
      }

      .fm3-photo-card,
      .fm3-info-card {
        background: white;
        border: 1px solid #dbe5f0;
        border-radius: 18px;
        padding: 20px;
        box-shadow:
          0 8px 25px rgba(20, 50, 90, .06);
      }

      .fm3-full-photo {
        width: 100%;
        height: auto;
        max-height: 600px;
        object-fit: contain;
        object-position: center;
        display: block;
        border-radius: 13px;
        background: #f1f5f9;
        cursor: zoom-in;
      }

      .fm3-no-photo {
        min-height: 300px;
        border-radius: 13px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
      }

      .fm3-info-row {
        display: grid;
        grid-template-columns: 180px 1fr;
        gap: 15px;
        padding: 12px 0;
        border-bottom: 1px solid #edf1f6;
      }

      .fm3-info-label {
        color: #64748b;
        font-weight: 700;
      }

      .fm3-info-value {
        color: #1e293b;
        word-break: break-word;
      }

      .fm3-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 20px;
      }

      .fm3-primary {
        border: 0;
        border-radius: 10px;
        padding: 11px 16px;
        background: #1769d2;
        color: white;
        font-weight: 700;
        cursor: pointer;
      }

      .fm3-success {
        background: #16834b;
      }

      .fm3-danger {
        background: #c73535;
      }

      .fm3-preview {
        margin-top: 12px;
        width: 100%;
        border: 0;
        border-radius: 10px;
        padding: 10px;
        background: #edf5ff;
        color: #155ba8;
        font-weight: 700;
        cursor: pointer;
      }

      .fm3-note {
        width: 100%;
        min-height: 110px;
        box-sizing: border-box;
        resize: vertical;
        border: 1px solid #cbd8e8;
        border-radius: 10px;
        padding: 12px;
        margin-top: 10px;
        font-family: inherit;
      }

      .fm3-empty {
        text-align: center;
        padding: 50px 20px;
        color: #64748b;
      }

      .fm3-modal {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(3, 15, 30, .92);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 25px;
        box-sizing: border-box;
      }

      .fm3-modal-inner {
        position: relative;
        width: min(1100px, 96vw);
        max-height: 94vh;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .fm3-modal-image {
        max-width: 100%;
        max-height: 82vh;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 10px;
      }

      .fm3-modal-title {
        color: white;
        font-size: 17px;
        font-weight: 800;
        margin-top: 10px;
        text-align: center;
      }

      .fm3-modal-close {
        position: absolute;
        top: -10px;
        right: -10px;
        width: 40px;
        height: 40px;
        border: 0;
        border-radius: 50%;
        background: white;
        color: #1e293b;
        font-size: 20px;
        cursor: pointer;
        font-weight: 800;
      }

      .fm3-list {
        display: grid;
        gap: 12px;
      }

      .fm3-list-item {
        padding: 16px;
        border: 1px solid #dbe5f0;
        border-radius: 13px;
        background: white;
      }

      .fm3-list-item strong {
        color: #173f72;
      }

      @media (max-width: 800px) {
        .fm3-page {
          padding: 16px;
        }

        .fm3-detail-grid {
          grid-template-columns: 1fr;
        }

        .fm3-info-row {
          grid-template-columns: 1fr;
          gap: 4px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ============================================================
     ADMIN DASHBOARD
     ============================================================ */

  app.renderAdministratorDashboard = function () {

    if (!requireAdmin()) return;

    const cases = getCases();
    const active = cases.filter(item => !isDeleted(item));
    const verified = active.filter(item => {
      const status = normalize(item.backendStatus || getStatus(item));
      return status === 'verified-active' || status === 'verified' || status === 'active';
    });
    const pending = active.filter(item => {
      const status = normalize(getStatus(item));
      return status === 'pending' || status === 'under verification' || status === 'under-verification';
    });
    const deletedCount = cases.filter(item => isDeleted(item)).length;
    const r = root();

    r.innerHTML = `
      <div class="fm-dashboard-professional fm-dashboard-professional-admin findme-admin-surface">
        <section class="fm-dashboard-hero">
          <div>
            <div class="fm-dashboard-eyebrow">NATIONAL MISSING PERSON COMMAND</div>
            <h1>Administrator Dashboard</h1>
            <p>Secure case management, emergency response and evidence-led investigation.</p>
          </div>
          <div class="fm-dashboard-hero-badge"><span>●</span> SYSTEM OPERATIONAL</div>
        </section>

        <section class="fm-dashboard-kpis">
          <div class="fm-kpi"><span class="fm-kpi-icon">👥</span><div><strong>${active.length}</strong><small>Active Cases</small></div></div>
          <div class="fm-kpi"><span class="fm-kpi-icon">✓</span><div><strong>${verified.length}</strong><small>Verified & Active</small></div></div>
          <div class="fm-kpi"><span class="fm-kpi-icon">◷</span><div><strong>${pending.length}</strong><small>Pending Verification</small></div></div>
          <div class="fm-kpi"><span class="fm-kpi-icon">🚨</span><div><strong id="fm-emergency-open-count">—</strong><small>Open Emergency Alerts</small></div></div>
        </section>

        <section class="fm-dashboard-section">
          <div class="fm-dashboard-section-heading">
            <div><span>CASE OPERATIONS</span><h2>Command Desk</h2></div>
            <p>Core administrative actions are grouped here for faster officer workflow.</p>
          </div>
          <div class="fm-command-grid">
            <button class="fm-command-card" data-fm3-action="all-cases"><b>📋</b><strong>All Missing Persons</strong><small>View and manage active missing-person cases.</small></button>
            <button class="fm-command-card" data-fm3-action="search"><b>🔎</b><strong>Search Cases</strong><small>Find cases by name, ID, age, gender or status.</small></button>
            <button class="fm-command-card" data-fm3-action="verification"><b>🛡️</b><strong>Verification</strong><small>Review complaints and authorize active cases.</small></button>
            <button class="fm-command-card" data-fm3-action="last-seen"><b>📍</b><strong>Last-Seen Information</strong><small>Review last-known locations and chronology.</small></button>
            <button class="fm-command-card fm-command-alert" data-fm3-action="emergency-alerts"><b>🚨</b><strong>Emergency Alert Center</strong><small>Review AI-triggered possible-sighting alerts.</small><em>Officer review required</em></button>
            <button class="fm-command-card" data-fm3-action="notifications"><b>🔔</b><strong>Notifications</strong><small>Review case updates and system notifications.</small></button>
            <button class="fm-command-card" data-fm3-action="activity"><b>📜</b><strong>Activity Log</strong><small>Track administrator actions and investigation events.</small></button>
            <button class="fm-command-card" data-fm3-action="deleted"><b>🗑️</b><strong>Deleted Cases</strong><small>Inspect soft-deleted cases and audit information.</small></button>
          </div>
        </section>

        <section class="fm-emergency-strip">
          <div><span class="fm-emergency-pulse">🚨</span><div><strong>Emergency Response</strong><small>AI possible matches can create persistent alerts with location, time, score and evidence.</small></div></div>
          <button data-fm3-action="emergency-alerts">Open Alert Center →</button>
        </section>

        <section class="fm-dashboard-investigation" id="fm-dashboard-investigation">
          <div class="fm-investigation-kicker">ADVANCED INVESTIGATION • SECURE WORKSPACE</div>
          <div class="fm-investigation-layout">
            <div>
              <h2>Investigation Center</h2>
              <p>Live Camera, Phone Camera Video, CCTV Video and AI Identification are intentionally kept here as the final investigation stage — after case registration and officer verification.</p>
              <div class="fm-investigation-pills"><span>Face 40%</span><span>Clothing 20%</span><span>Age 15%</span><span>Location 15%</span><span>Time 10%</span></div>
            </div>
            <button class="fm-investigation-open" data-fm3-action="investigation"><span>🔍</span><strong>Open Investigation Center</strong><small>Start evidence-led AI investigation</small></button>
          </div>
        </section>

        <section class="fm-dashboard-footer-actions">
          <button data-fm3-action="logout">🚪 Administrator Logout</button>
          <span>FIND-ME AI • Authorized administrative access only</span>
        </section>
      </div>
    `;

    bindPart3Events();
    loadEmergencyAlertCount();
  };

  async function loadEmergencyAlertCount() {
    const node = document.getElementById('fm-emergency-open-count');
    if (!node || !window.FindMeAPI?.emergencyAlerts) return;
    try {
      const data = await window.FindMeAPI.emergencyAlerts('ALL');
      const count = (data.alerts || []).filter(item => ['OPEN','ACKNOWLEDGED'].includes(String(item.status).toUpperCase())).length;
      if (node) node.textContent = String(count);
    } catch (error) {
      if (node) node.textContent = '0';
    }
  }

  app.renderAdministratorEmergencyAlerts = async function () {
    if (!requireAdmin()) return;
    const r = root();
    r.innerHTML = `
      <div class="fm-dashboard-professional fm-alert-page">
        <section class="fm-dashboard-hero">
          <div><div class="fm-dashboard-eyebrow">EMERGENCY RESPONSE</div><h1>Emergency Alert Center</h1><p>AI-generated possible sightings requiring authorized officer review.</p></div>
          <button class="fm-dashboard-back" data-fm3-action="dashboard">← Back to Dashboard</button>
        </section>
        <div class="fm-alert-filters">
          <button class="fm-alert-filter active" data-alert-filter="ALL">All</button>
          <button class="fm-alert-filter" data-alert-filter="OPEN">Open</button>
          <button class="fm-alert-filter" data-alert-filter="ACKNOWLEDGED">Acknowledged</button>
          <button class="fm-alert-filter" data-alert-filter="RESOLVED">Resolved</button>
          <button class="fm-alert-filter" data-alert-filter="DISMISSED">Dismissed</button>
        </div>
        <div id="fm-emergency-alert-list" class="fm-alert-list"><div class="fm-alert-empty">Loading emergency alerts…</div></div>
      </div>`;
    bindPart3Events();
    await renderEmergencyAlerts('ALL');
  };

  function fmEmergencyFormatPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return 'Not provided';
    }
    return n.toFixed(2) + '%';
  }

  async function renderEmergencyAlerts(status) {
    const container = document.getElementById('fm-emergency-alert-list');
    if (!container || !window.FindMeAPI?.emergencyAlerts) return;
    try {
      const data = await window.FindMeAPI.emergencyAlerts(status);
      const alerts = data.alerts || [];
      if (!alerts.length) {
        container.innerHTML = `<div class="fm-alert-empty"><span>✓</span><strong>No alerts in this view</strong><small>Emergency alerts appear here when an AI candidate crosses the possible-match gate.</small></div>`;
        return;
      }
      container.innerHTML = alerts.map(alert => `
        <article class="fm-alert-card fm-alert-${String(alert.severity || 'MEDIUM').toLowerCase()}">
          <div class="fm-alert-card-top"><div><span class="fm-alert-severity">${escapeHTML(alert.severity || 'MEDIUM')} PRIORITY</span><h3>🚨 ${escapeHTML(alert.title || 'Possible Missing-Person Sighting')}</h3></div><span class="fm-alert-status">${escapeHTML(alert.status)}</span></div>
          <div class="fm-alert-grid">
            <div><small>Person</small><strong>${escapeHTML(alert.person_name || 'Unknown')}</strong></div>
            <div><small>Case ID</small><strong>${escapeHTML(alert.complaint_id || alert.missing_person_id || '—')}</strong></div>
            <div><small>Overall Score</small><strong>${fmEmergencyFormatPercent(alert.overall_score)}</strong></div>
            <div><small>Camera Location</small><strong>${escapeHTML(alert.camera_location || 'Not provided')}</strong></div>
            <div><small>Capture Date</small><strong>${escapeHTML(alert.capture_date || '—')}</strong></div>
            <div><small>Capture Time</small><strong>${escapeHTML(alert.capture_time || '—')}</strong></div>
          </div>
          <div class="fm-alert-breakdown"><span>Face ${fmEmergencyFormatPercent(alert.face_score)}</span><span>Clothing ${fmEmergencyFormatPercent(alert.clothing_score)}</span><span>Age ${fmEmergencyFormatPercent(alert.age_score)}</span><span>Location ${fmEmergencyFormatPercent(alert.location_score)}</span><span>Time ${fmEmergencyFormatPercent(alert.time_score)}</span></div>
          ${alert.evidence_path ? `<img class="fm-alert-evidence" src="${escapeHTML(alert.evidence_path)}" alt="AI evidence snapshot">` : ''}
          <p class="fm-alert-message"><strong>Why this alert:</strong> ${escapeHTML(alert.alert_reason || 'Configured AI evidence criteria were met; officer verification is required.')}</p>
          <p class="fm-alert-message">${escapeHTML(alert.message || '')}</p>
          <div class="fm-alert-actions">
            ${alert.status === 'OPEN' ? `<button data-alert-action="${escapeHTML(alert.alert_id)}" data-alert-status="ACKNOWLEDGED">Acknowledge</button>` : ''}
            ${['OPEN','ACKNOWLEDGED'].includes(alert.status) ? `<button data-alert-action="${escapeHTML(alert.alert_id)}" data-alert-status="RESOLVED">Resolve</button><button class="secondary" data-alert-action="${escapeHTML(alert.alert_id)}" data-alert-status="DISMISSED">Dismiss</button>` : ''}
          </div>
          <footer>Alert ID: ${escapeHTML(alert.alert_id)} • ${escapeHTML(alert.created_at || '')} • AI candidate only — identity not confirmed.</footer>
        </article>`).join('');
    } catch (error) {
      container.innerHTML = `<div class="fm-alert-empty"><strong>Unable to load alerts</strong><small>${escapeHTML(error.message || 'Please try again.')}</small></div>`;
    }
  }

  /* ============================================================
     ALL CASES
     ============================================================ */

  app.renderAdministratorAllCases = function () {

    if (!requireAdmin()) return;

    const r = root();

    r.innerHTML = `
      <div class="fm3-page">

        <div class="fm3-header">
          <div>
            <h1 class="fm3-title">
              All Missing Persons
            </h1>
            <p class="fm3-subtitle">
              Active cases registered in FIND-ME AI.
            </p>
          </div>

          <button
            class="fm3-back"
            data-fm3-action="dashboard"
          >
            ← Back to Administrator Dashboard
          </button>
        </div>

        <div class="fm3-toolbar">

          <input
            id="fm3-search-input"
            type="search"
            placeholder="Search person name or Case ID..."
          />

          <select id="fm3-status-filter">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under-verification">
              Under Verification
            </option>
            <option value="verified-active">
              Verified & Active
            </option>
            <option value="rejected">Rejected</option>
            <option value="resolved">Resolved</option>
          </select>

          <button data-fm3-action="refresh-cases">
            🔄 Refresh
          </button>

        </div>

        <div id="fm3-case-table"></div>

      </div>
    `;

    renderCaseTable();
    bindPart3Events();
  };

  function renderCaseTable() {

    const container =
      document.getElementById('fm3-case-table');

    if (!container) return;

    const search =
      normalize(
        document.getElementById(
          'fm3-search-input'
        )?.value
      );

    const filter =
      normalize(
        document.getElementById(
          'fm3-status-filter'
        )?.value || 'all'
      );

    let cases = getCases().filter(
      item => !isDeleted(item)
    );

    if (search) {
      cases = cases.filter(item => {

        const name =
          normalize(getPersonName(item));

        const id =
          normalize(getCaseId(item));

        return name.includes(search) ||
               id.includes(search);
      });
    }

    if (filter && filter !== 'all') {

      cases = cases.filter(item => {

        const status =
          normalize(getStatus(item));

        return status === filter;
      });
    }

    // V20: oldest complaint first. This is the visible investigation priority
    // order and does not depend on AI activity.
    cases.sort((a, b) => {
      const ta = new Date(a.createdAt || a.createdDate || a.dateCreated || 0).getTime();
      const tb = new Date(b.createdAt || b.createdDate || b.dateCreated || 0).getTime();
      return ta - tb;
    });

    if (!cases.length) {

      container.innerHTML = `
        <div class="fm3-empty">
          <div style="font-size:42px;">🔎</div>
          <h3>No cases found</h3>
          <p>
            No active cases match the current search.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML = `
      <div class="fm3-table-wrap">

        <table class="fm3-table">

          <thead>
            <tr>
              <th>Priority</th>
              <th>Person</th>
              <th>Case ID</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            ${cases.map(item => {

              const photo = getPhoto(item);

              return `
                <tr>

                  <td><span class="fmv20-priority">#${cases.indexOf(item) + 1}</span></td>

                  <td>
                    <div class="fm3-person-cell">

                      ${
                        photo
                          ? `
                            <img
                              class="fm3-thumb"
                              src="${escapeHTML(photo)}"
                              alt="${escapeHTML(
                                getPersonName(item)
                              )}"
                            >
                          `
                          : `
                            <div class="fm3-thumb"
                                 style="
                                   display:flex;
                                   align-items:center;
                                   justify-content:center;
                                   font-size:20px;
                                 ">
                              👤
                            </div>
                          `
                      }

                      <strong>
                        ${escapeHTML(
                          getPersonName(item)
                        )}
                      </strong>

                    </div>
                  </td>

                  <td>
                    ${escapeHTML(getCaseId(item))}
                  </td>

                  <td>
                    ${escapeHTML(
                      item.age ||
                      item.missingPersonAge ||
                      '—'
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      item.gender ||
                      item.missingPersonGender ||
                      '—'
                    )}
                  </td>

                  <td>
                    <span class="fm3-status ${
                      statusClass(
                        getStatus(item)
                      )
                    }">
                      ${statusLabel(
                        getStatus(item)
                      )}
                    </span>
                  </td>

                  <td>
                    ${formatDate(
                      item.createdAt ||
                      item.createdDate ||
                      item.dateCreated
                    )}
                  </td>

                  <td>
                    <button
                      class="fm3-action"
                      data-fm3-action="view-case"
                      data-case-id="${escapeHTML(
                        getCaseId(item)
                      )}"
                    >
                      📄 View
                    </button>
                  </td>

                </tr>
              `;

            }).join('')}

          </tbody>

        </table>

      </div>
    `;
  }

  /* ============================================================
     SEARCH
     ============================================================ */

  app.renderAdministratorSearch = function () {
    app.renderAdministratorAllCases();
  };

  /* ============================================================
     CASE DETAILS
     ============================================================ */

  app.renderAdministratorCase = function (caseId) {

    if (!requireAdmin()) return;

    const item = findCase(caseId);

    if (!item) {

      root().innerHTML = `
        <div class="fm3-page">

          <button
            class="fm3-back"
            data-fm3-action="all-cases"
          >
            ← Back
          </button>

          <div class="fm3-empty">
            <div style="font-size:50px;">❌</div>
            <h2>Case Not Found</h2>
            <p>
              The requested missing-person case
              could not be found.
            </p>
          </div>

        </div>
      `;

      bindPart3Events();
      return;
    }

    const photo = getPhoto(item);

    root().innerHTML = `
      <div class="fm3-page">

        <div class="fm3-header">

          <div>
            <h1 class="fm3-title">
              Case Details
            </h1>

            <p class="fm3-subtitle">
              Case ID:
              <strong>
                ${escapeHTML(getCaseId(item))}
              </strong>
            </p>
          </div>

          <button
            class="fm3-back"
            data-fm3-action="all-cases"
          >
            ← Back to All Cases
          </button>

        </div>

        <div class="fm3-detail-grid">

          <div class="fm3-photo-card">

            ${
              photo
                ? `
                  <img
                    id="fm3-case-photo"
                    class="fm3-full-photo"
                    src="${escapeHTML(photo)}"
                    alt="${escapeHTML(
                      getPersonName(item)
                    )}"
                    data-fm3-action="preview-photo"
                    data-case-id="${escapeHTML(
                      getCaseId(item)
                    )}"
                  >

                  <button
                    class="fm3-preview"
                    data-fm3-action="preview-photo"
                    data-case-id="${escapeHTML(
                      getCaseId(item)
                    )}"
                  >
                    🔍 Preview Full Photo
                  </button>
                `
                : `
                  <div class="fm3-no-photo">
                    📷 No reference photo available
                  </div>
                `
            }

          </div>

          <div class="fm3-info-card">

            <h2 style="margin-top:0;color:#173f72;">
              ${escapeHTML(getPersonName(item))}
            </h2>

            ${infoRow(
              'Case ID',
              getCaseId(item)
            )}

            ${infoRow(
              'Age',
              item.age ||
              item.missingPersonAge ||
              '—'
            )}

            ${infoRow(
              'Gender',
              item.gender ||
              item.missingPersonGender ||
              '—'
            )}

            ${infoRow(
              'Height',
              item.height ||
              item.missingPersonHeight ||
              '—'
            )}

            ${infoRow(
              'Physical Description',
              item.physicalDescription ||
              item.description ||
              item.physicalDetails ||
              '—'
            )}

            ${infoRow(
              'Clothing',
              item.clothing ||
              item.clothingDescription ||
              '—'
            )}

            ${infoRow(
              'Identifying Marks',
              item.identifyingMarks ||
              item.identificationMarks ||
              '—'
            )}

            ${infoRow(
              'Additional Information',
              item.additionalInfo ||
              item.additionalInformation ||
              '—'
            )}

            ${infoRow(
              'Complainant Name',
              item.complainantName ||
              item.reporterName ||
              item.citizenName ||
              '—'
            )}

            ${infoRow(
              'Complainant Phone',
              item.complainantPhone ||
              item.phone ||
              item.contactNumber ||
              '—'
            )}

            ${infoRow(
              'Relationship',
              item.relationship ||
              item.complainantRelationship ||
              '—'
            )}

            ${infoRow(
              'Created',
              formatDate(
                item.createdAt ||
                item.createdDate
              )
            )}

            ${infoRow(
              'Current Status',
              statusLabel(getStatus(item))
            )}

            <div style="
              margin-top:20px;
              padding:16px;
              border-radius:12px;
              background:#f8fbff;
              border:1px solid #dbe7f5;
            ">
              <h3 style="margin-top:0;color:#173f72;">📍 Last Seen Information</h3>
              ${infoRow('Last Seen Location', item.lastSeenLocation || item.lastSeenPlace || '—')}
              ${infoRow('Last Seen Date', item.lastSeenDate || '—')}
              ${infoRow('Last Seen Time', item.lastSeenTime || '—')}
            </div>

            ${
              item.verificationNotes ||
              item.enquiryNotes ||
              item.enquiryResult ||
              item.verifiedBy
                ? `
                  <div style="
                    margin-top:20px;
                    padding:16px;
                    border-radius:12px;
                    background:#f5f9ff;
                  ">

                    <h3 style="
                      margin-top:0;
                      color:#173f72;
                    ">
                      Verification Information
                    </h3>

                    ${infoRow(
                      'Verified By',
                      item.verifiedBy || '—'
                    )}

                    ${infoRow(
                      'Verification Date',
                      formatDate(
                        item.verifiedAt ||
                        item.verificationDate
                      )
                    )}

                    ${infoRow(
                      'Enquiry Result',
                      item.enquiryResult || '—'
                    )}

                    ${infoRow(
                      'Enquiry Notes',
                      item.enquiryNotes ||
                      item.verificationNotes ||
                      '—'
                    )}

                  </div>
                `
                : ''
            }

            <div class="fm3-actions">

              <button
                class="fm3-primary fm3-success"
                data-fm3-action="verify-case"
                data-case-id="${escapeHTML(
                  getCaseId(item)
                )}"
              >
                ✅ Verify Case
              </button>

              <button
                class="fm3-primary fm3-danger"
                data-fm3-action="reject-case"
                data-case-id="${escapeHTML(
                  getCaseId(item)
                )}"
              >
                ❌ Reject Case
              </button>

            </div>

            <div style="margin-top:22px;">

              <h3 style="color:#173f72;">
                Administrator Enquiry
              </h3>

              <select
                id="fm3-enquiry-result"
                data-enquiry-result="true"
                style="
                  width:100%;
                  box-sizing:border-box;
                  padding:11px;
                  border:1px solid #cbd8e8;
                  border-radius:10px;
                  margin-bottom:10px;
                "
              >
                <option value="" ${!item.enquiryResult ? 'selected' : ''}>Select enquiry result</option>
                <option value="Verified" ${item.enquiryResult === 'Verified' ? 'selected' : ''}>Verified — details confirmed</option>
                <option value="Pending" ${item.enquiryResult === 'Pending' ? 'selected' : ''}>Pending — further enquiry required</option>
                <option value="More Information Required" ${item.enquiryResult === 'More Information Required' ? 'selected' : ''}>More Information Required</option>
                <option value="Rejected" ${item.enquiryResult === 'Rejected' ? 'selected' : ''}>Rejected — insufficient/incorrect information</option>
              </select>

              <h3 style="color:#173f72;">
                Administrator Enquiry Notes
              </h3>

              <textarea
                id="fm3-enquiry-notes"
                class="fm3-note"
                placeholder="Enter enquiry/contact notes before verification or rejection..."
              >${escapeHTML(
                item.enquiryNotes ||
                item.verificationNotes ||
                ''
              )}</textarea>

              <button
                class="fm3-primary"
                style="margin-top:10px;"
                data-fm3-action="save-enquiry"
                data-case-id="${escapeHTML(
                  getCaseId(item)
                )}"
              >
                💾 Save Enquiry Notes
              </button>

            </div>

            <div style="margin-top:22px;">

              <h3 style="color:#173f72;">
                Case Status
              </h3>

              <select
                id="fm3-case-status"
                style="
                  width:100%;
                  box-sizing:border-box;
                  padding:11px;
                  border:1px solid #cbd8e8;
                  border-radius:10px;
                "
              >

                <option value="pending"
                  ${['pending','reported'].includes(normalize(getStatus(item)))
                    ? 'selected' : ''}>
                  Pending
                </option>

                <option value="under-verification"
                  ${['under-verification','under verification','under-investigation'].includes(normalize(getStatus(item)))
                    ? 'selected' : ''}>
                  Under Verification
                </option>

                <option value="verified-active"
                  ${['verified-active','verified','active'].includes(normalize(getStatus(item)))
                    ? 'selected' : ''}>
                  Verified & Active
                </option>

                <option value="rejected"
                  ${normalize(getStatus(item)) === 'rejected'
                    ? 'selected' : ''}>
                  Rejected
                </option>

                <option value="resolved"
                  ${['resolved','case closed'].includes(normalize(getStatus(item)))
                    ? 'selected' : ''}>
                  Resolved
                </option>

              </select>

              <button
                class="fm3-primary"
                style="margin-top:10px;"
                data-fm3-action="save-status"
                data-case-id="${escapeHTML(
                  getCaseId(item)
                )}"
              >
                🔄 Update Status
              </button>

            </div>

          </div>

        </div>

      </div>
    `;

    bindPart3Events();
  };

  function infoRow(label, value) {

    return `
      <div class="fm3-info-row">

        <div class="fm3-info-label">
          ${escapeHTML(label)}
        </div>

        <div class="fm3-info-value">
          ${escapeHTML(value || '—')}
        </div>

      </div>
    `;
  }

  /* ============================================================
     SAVE ENQUIRY NOTES
     ============================================================ */

  function saveEnquiry(caseId) {

    if (!requireAdmin()) return;

    const notes =
      document.getElementById(
        'fm3-enquiry-notes'
      )?.value.trim() || '';

    const cases = getCases();

    const index = cases.findIndex(
      item =>
        normalize(getCaseId(item)) ===
        normalize(caseId)
    );

    if (index < 0) {
      alert('Case not found.');
      return;
    }

    cases[index].enquiryNotes = notes;
    cases[index].verificationNotes = notes;
    cases[index].enquiryStatus =
      notes ? 'Completed' : 'Pending';

    cases[index].updatedAt =
      new Date().toISOString();

    saveCases(cases);

    addActivity(
      'ENQUIRY NOTES UPDATED',
      cases[index]
    );

    addNotification(
      'Enquiry Notes Updated',
      'Administrator enquiry notes were updated.',
      cases[index]
    );

    app.renderAdministratorCase(caseId);
  }

  /* ============================================================
     VERIFY CASE
     ============================================================ */

  async function verifyCase(caseId) {

    if (!requireAdmin()) return;

    const cases = getCases();
    const index = cases.findIndex(item =>
      normalize(getCaseId(item)) === normalize(caseId)
    );

    if (index < 0) {
      alert('Case not found.');
      return;
    }

    const notes =
      document.getElementById('fm3-enquiry-notes')?.value.trim() ||
      cases[index].enquiryNotes ||
      '';

    if (!notes) {
      alert('Please enter enquiry/contact notes before verifying the case.');
      return;
    }

    try {
      const response = await findMeApiRequest(
        '/admin/complaints/' + encodeURIComponent(caseId),
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'Verified',
            remarks: notes,
            enquiry_notes: notes,
            enquiry_result: 'Verified'
          })
        }
      );

      if (!response?.success) {
        throw new Error(response?.message || 'Verification failed on the server.');
      }

      // Synchronize the UI cache only after the backend transaction succeeds.
      cases[index].status = 'verified-active';
      cases[index].verificationStatus = 'verified-active';
      cases[index].backendStatus = 'Verified';
      cases[index].verifiedBy = ADMIN_EMAIL;
      cases[index].verifiedAt = new Date().toISOString();
      cases[index].verificationDate = cases[index].verifiedAt;
      cases[index].enquiryNotes = notes;
      cases[index].verificationNotes = notes;
      cases[index].enquiryStatus = 'Completed';
      cases[index].enquiryResult = 'Verified';
      cases[index].updatedAt = new Date().toISOString();
      saveCases(cases);

      addActivity('CASE VERIFIED', cases[index]);
      app.showToast?.('Case verified and citizen notification sent.', 'success');
      app.renderAdministratorCase(caseId);

    } catch (error) {
      console.error('FIND-ME FINAL: verification failed:', error);
      alert('Unable to verify this case on the server. Please try again.');
    }
  }

  /* ============================================================
     REJECT CASE
     ============================================================ */

  async function rejectCase(caseId) {

    if (!requireAdmin()) return;

    const cases = getCases();
    const index = cases.findIndex(item =>
      normalize(getCaseId(item)) === normalize(caseId)
    );

    if (index < 0) {
      alert('Case not found.');
      return;
    }

    const notes =
      document.getElementById('fm3-enquiry-notes')?.value.trim() ||
      cases[index].enquiryNotes ||
      '';

    if (!notes) {
      alert('Please enter enquiry/contact notes before rejecting the case.');
      return;
    }

    try {
      const response = await findMeApiRequest(
        '/admin/complaints/' + encodeURIComponent(caseId),
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'Rejected',
            remarks: notes,
            enquiry_notes: notes,
            enquiry_result: 'Rejected'
          })
        }
      );

      if (!response?.success) {
        throw new Error(response?.message || 'Rejection failed on the server.');
      }

      cases[index].status = 'rejected';
      cases[index].verificationStatus = 'rejected';
      cases[index].backendStatus = 'Rejected';
      cases[index].verifiedBy = ADMIN_EMAIL;
      cases[index].verifiedAt = new Date().toISOString();
      cases[index].rejectionReason = notes;
      cases[index].enquiryNotes = notes;
      cases[index].verificationNotes = notes;
      cases[index].enquiryStatus = 'Completed';
      cases[index].enquiryResult = 'Rejected';
      cases[index].updatedAt = new Date().toISOString();
      saveCases(cases);

      addActivity('CASE REJECTED', cases[index]);
      app.showToast?.('Case rejected and citizen notification sent.', 'success');
      app.renderAdministratorCase(caseId);

    } catch (error) {
      console.error('FIND-ME FINAL: rejection failed:', error);
      alert('Unable to reject this case on the server. Please try again.');
    }
  }

  /* ============================================================
     STATUS UPDATE
     ============================================================ */

  async function updateCaseStatus(caseId) {

    if (!requireAdmin()) return;

    const newStatus =
      document.getElementById(
        'fm3-case-status'
      )?.value;

    if (!newStatus) return;

    const cases = getCases();

    const index = cases.findIndex(
      item =>
        normalize(getCaseId(item)) ===
        normalize(caseId)
    );

    if (index < 0) {
      alert('Case not found.');
      return;
    }

    /*
     * V28: the administrator status change must update the backend
     * source of truth. Previously this Part-3 screen only changed
     * localStorage, so the backend never created the citizen notification.
     */
    const backendStatusMap = {
      'pending': 'Reported',
      'under-verification': 'Under Verification',
      'verified-active': 'Verified',
      'rejected': 'Rejected',
      'resolved': 'Case Closed'
    };

    const backendStatus =
      backendStatusMap[
        normalize(newStatus)
      ] || newStatus;

    try {
      const response =
        await findMeApiRequest(
          '/admin/complaints/' +
          encodeURIComponent(caseId),
          {
            method: 'PATCH',
            body: JSON.stringify({
              status: backendStatus,
              remarks:
                cases[index].adminRemarks ||
                cases[index].verificationNotes ||
                ''
            })
          }
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
          'Backend status update failed.'
        );
      }

      /*
       * Keep the existing UI cache synchronized with the backend.
       * The UI uses verified-active for its dashboard label while the
       * backend stores the canonical "Verified" status.
       */
      cases[index].status =
        newStatus;

      cases[index].caseStatus =
        newStatus;

      cases[index].verificationStatus =
        newStatus;

      cases[index].backendStatus =
        backendStatus;

      cases[index].updatedAt =
        new Date().toISOString();

      saveCases(cases);

      addActivity(
        'CASE STATUS UPDATED TO ' +
        newStatus.toUpperCase(),
        cases[index]
      );

      app.renderAdministratorCase(caseId);

    } catch (error) {
      console.error(
        'FIND-ME V28: backend case status update failed:',
        error
      );

      alert(
        'Unable to update the case on the server. ' +
        'Please make sure the Find-Me backend is running and try again.'
      );
    }
  }


  /* ============================================================
     DELETED CASES
     ============================================================ */

  app.renderAdministratorDeletedCases =
    function () {

      if (!requireAdmin()) return;

      const deleted =
        getCases().filter(
          item => isDeleted(item)
        );

      root().innerHTML = `
        <div class="fm3-page">

          <div class="fm3-header">

            <div>
              <h1 class="fm3-title">
                Deleted Cases
              </h1>

              <p class="fm3-subtitle">
                Soft-deleted cases remain available for
                administrator audit purposes.
              </p>
            </div>

            <button
              class="fm3-back"
              data-fm3-action="dashboard"
            >
              ← Back to Administrator Dashboard
            </button>

          </div>

          ${
            !deleted.length
              ? `
                <div class="fm3-empty">
                  <div style="font-size:45px;">
                    🗑️
                  </div>
                  <h2>No Deleted Cases</h2>
                  <p>
                    No citizen-deleted cases are currently
                    available.
                  </p>
                </div>
              `
              : `
                <div class="fm3-list">

                  ${deleted.map(item => `

                    <div class="fm3-list-item">

                      <h3 style="
                        margin-top:0;
                        color:#173f72;
                      ">
                        ${escapeHTML(
                          getPersonName(item)
                        )}
                      </h3>

                      ${infoRow(
                        'Case ID',
                        getCaseId(item)
                      )}

                      ${infoRow(
                        'Status Before Deletion',
                        item.statusBeforeDeletion ||
                        item.verificationStatusBeforeDeletion ||
                        '—'
                      )}

                      ${infoRow(
                        'Deleted By',
                        item.deletedBy ||
                        item.deletedByEmail ||
                        'Citizen'
                      )}

                      ${infoRow(
                        'Deleted Date',
                        formatDate(
                          item.deletedAt ||
                          item.deletedDate
                        )
                      )}

                      ${infoRow(
                        'Audit Action',
                        item.auditAction ||
                        'CASE DELETED BY USER'
                      )}

                      ${infoRow(
                        'Deletion Reason',
                        item.deletionReason ||
                        'User soft delete'
                      )}

                      ${
                        item.originalCaseSnapshot
                          ? `
                            <details style="
                              margin-top:15px;
                            ">
                              <summary style="
                                cursor:pointer;
                                color:#155ba8;
                                font-weight:700;
                              ">
                                📁 View Original Case Record
                              </summary>

                              <pre style="
                                white-space:pre-wrap;
                                background:#f8fafc;
                                padding:14px;
                                border-radius:10px;
                                overflow:auto;
                                margin-top:10px;
                              ">${escapeHTML(
                                JSON.stringify(
                                  item.originalCaseSnapshot,
                                  null,
                                  2
                                )
                              )}</pre>
                            </details>
                          `
                          : ''
                      }

                    </div>

                  `).join('')}

                </div>
              `
          }

        </div>
      `;

      bindPart3Events();
    };

  /* ============================================================
     ACTIVITY LOG
     ============================================================ */

  app.renderAdministratorActivity =
    function () {

      if (!requireAdmin()) return;

      const activities =
        readArray(ACTIVITY_KEY);

      root().innerHTML = `
        <div class="fm3-page">

          <div class="fm3-header">

            <div>
              <h1 class="fm3-title">
                Activity Log
              </h1>

              <p class="fm3-subtitle">
                Administrator actions recorded by FIND-ME AI.
              </p>
            </div>

            <button
              class="fm3-back"
              data-fm3-action="dashboard"
            >
              ← Back
            </button>

          </div>

          ${
            !activities.length
              ? `
                <div class="fm3-empty">
                  📜
                  <h2>No Activity Yet</h2>
                </div>
              `
              : `
                <div class="fm3-list">

                  ${activities.map(item => `

                    <div class="fm3-list-item">

                      <strong>
                        ${escapeHTML(
                          item.action || 'Activity'
                        )}
                      </strong>

                      <div style="
                        margin-top:7px;
                        color:#64748b;
                      ">
                        Person:
                        ${escapeHTML(
                          item.personName || '—'
                        )}
                      </div>

                      <div style="
                        color:#64748b;
                      ">
                        Case ID:
                        ${escapeHTML(
                          item.caseId || '—'
                        )}
                      </div>

                      <div style="
                        color:#64748b;
                      ">
                        Performed By:
                        ${escapeHTML(
                          item.performedBy || ADMIN_EMAIL
                        )}
                      </div>

                      <div style="
                        color:#64748b;
                      ">
                        Date:
                        ${formatDate(
                          item.performedAt
                        )}
                      </div>

                    </div>

                  `).join('')}

                </div>
              `
          }

        </div>
      `;

      bindPart3Events();
    };

  /* ============================================================
     NOTIFICATIONS
     ============================================================ */

  app.renderAdministratorNotifications =
    async function () {

      if (!requireAdmin()) return;

      let notifications = [];
      try {
        const response = await findMeApiRequest('/notifications');
        notifications = Array.isArray(response?.notifications) ? response.notifications : [];
      } catch (error) {
        console.error('Unable to load administrator notifications:', error);
      }

      root().innerHTML = `
        <div class="fm3-page">

          <div class="fm3-header">

            <div>
              <h1 class="fm3-title">
                Notifications
              </h1>

              <p class="fm3-subtitle">
                FIND-ME AI system and case notifications.
              </p>
            </div>

            <button
              class="fm3-back"
              data-fm3-action="dashboard"
            >
              ← Back
            </button>

          </div>

          ${
            !notifications.length
              ? `
                <div class="fm3-empty">
                  <div style="font-size:45px;">
                    🔔
                  </div>
                  <h2>No Notifications</h2>
                  <p>
                    There are no notifications currently.
                  </p>
                </div>
              `
              : `
                <div class="fm3-list">

                  ${notifications.map(item => `

                    <div class="fm3-list-item">

                      <strong>
                        ${escapeHTML(
                          item.title || 'Notification'
                        )}
                      </strong>

                      <p style="
                        color:#475569;
                        line-height:1.5;
                      ">
                        ${escapeHTML(
                          item.message || ''
                        )}
                      </p>

                      ${
                        item.caseId
                          ? `
                            <div>
                              Case ID:
                              <strong>
                                ${escapeHTML(
                                  item.caseId
                                )}
                              </strong>
                            </div>
                          `
                          : ''
                      }

                      <div style="
                        margin-top:6px;
                        color:#64748b;
                        font-size:12px;
                      ">
                        ${formatDate(
                          item.createdAt
                        )}
                      </div>

                    </div>

                  `).join('')}

                </div>
              `
          }

        </div>
      `;

      bindPart3Events();
    };

  /* ============================================================
     LAST-SEEN INFORMATION
     ============================================================ */

  app.renderAdministratorLastSeen =
    function () {

      if (!requireAdmin()) return;

      const cases =
        getCases().filter(
          item => !isDeleted(item)
        );

      root().innerHTML = `
        <div class="fm3-page">

          <div class="fm3-header">

            <div>
              <h1 class="fm3-title">
                Last-Seen Information
              </h1>

              <p class="fm3-subtitle">
                Review last-known information associated
                with active cases.
              </p>
            </div>

            <button
              class="fm3-back"
              data-fm3-action="dashboard"
            >
              ← Back
            </button>

          </div>

          <div class="fm3-list">

            ${
              cases.map(item => {

                const lastSeen =
                  item.lastSeenLocation ||
                  item.lastSeenPlace ||
                  item.lastSeenAddress ||
                  item.lastSeen ||
                  item.lastSeenInformation ||
                  '';

                const date =
                  item.lastSeenDate ||
                  item.lastSeenAt ||
                  '';

                const description =
                  item.lastSeenDescription ||
                  item.lastSeenDetails ||
                  '';

                return `

                  <div class="fm3-list-item">

                    <h3 style="
                      margin-top:0;
                      color:#173f72;
                    ">
                      ${escapeHTML(
                        getPersonName(item)
                      )}
                    </h3>

                    ${infoRow(
                      'Case ID',
                      getCaseId(item)
                    )}

                    ${infoRow(
                      'Last-Seen Location',
                      lastSeen || 'Not provided'
                    )}

                    ${infoRow(
                      'Last-Seen Date',
                      date
                        ? formatDate(date)
                        : 'Not provided'
                    )}

                    ${infoRow(
                      'Description',
                      description || 'Not provided'
                    )}

                  </div>
                `;
              }).join('')
            }

          </div>

        </div>
      `;

      bindPart3Events();
    };

  /* ============================================================
     PHOTO PREVIEW
     ============================================================ */

  app.openAdministratorPhotoPreview =
    function (caseId) {

      if (!requireAdmin()) return;

      const item = findCase(caseId);

      if (!item) return;

      const photo = getPhoto(item);

      if (!photo) {
        alert('No reference photo is available.');
        return;
      }

      closePhotoPreview();

      const modal =
        document.createElement('div');

      modal.id = 'fm3-photo-modal';
      modal.className = 'fm3-modal';

      modal.innerHTML = `
        <div class="fm3-modal-inner">

          <button
            class="fm3-modal-close"
            id="fm3-photo-close"
            aria-label="Close photo preview"
          >
            ×
          </button>

          <img
            class="fm3-modal-image"
            src="${escapeHTML(photo)}"
            alt="${escapeHTML(
              getPersonName(item)
            )}"
          >

          <div class="fm3-modal-title">
            ${escapeHTML(
              getPersonName(item)
            )}
            —
            ${escapeHTML(
              getCaseId(item)
            )}
          </div>

        </div>
      `;

      document.body.appendChild(modal);

      document
        .getElementById('fm3-photo-close')
        ?.addEventListener(
          'click',
          closePhotoPreview
        );

      modal.addEventListener(
        'click',
        event => {
          if (event.target === modal) {
            closePhotoPreview();
          }
        }
      );
    };

  function closePhotoPreview() {

    document
      .getElementById('fm3-photo-modal')
      ?.remove();
  }

  app.closeAdministratorPhotoPreview =
    closePhotoPreview;

  document.addEventListener(
    'keydown',
    function (event) {

      if (event.key === 'Escape') {
        closePhotoPreview();
      }

    }
  );

  /* ============================================================
     INVESTIGATION CENTER CONNECTION
     ============================================================ */

  function openInvestigationCenter() {

    if (!requireAdmin()) return;

    /*
      IMPORTANT:
      Part 5 owns Investigation Center.
      We do NOT replace or recreate it here.
    */

    if (
      typeof app.renderInvestigationCenter ===
      'function'
    ) {
      app.renderInvestigationCenter();
      return;
    }

    if (
      typeof app.openInvestigationCenter ===
      'function'
    ) {
      app.openInvestigationCenter();
      return;
    }

    if (
      typeof app.handleAdministratorAction ===
      'function'
    ) {
      app.handleAdministratorAction(
        'investigation'
      );
      return;
    }

    alert(
      'Investigation Center is not available.'
    );
  }

  /* ============================================================
     CENTRAL EVENT DELEGATION
     ============================================================ */

  function bindPart3Events() {

    if (document.body.dataset.fm3Delegated === 'true') {
      return;
    }

    document.body.dataset.fm3Delegated = 'true';

    document.body.addEventListener(
      'click',
      function (event) {

        const target =
          event.target.closest(
            '[data-fm3-action]'
          );

        if (!target) return;

        const action =
          target.dataset.fm3Action;

        const caseId =
          target.dataset.caseId || '';

        if (action === 'dashboard') {
          app.renderAdministratorDashboard();
          return;
        }

        if (action === 'all-cases') {
          app.renderAdministratorAllCases();
          return;
        }

        if (action === 'search') {
          app.renderAdministratorSearch();
          return;
        }

        if (action === 'verification') {

          if (
            typeof app.renderAdministratorVerification ===
            'function'
          ) {
            app.renderAdministratorVerification();
          } else {
            app.renderAdministratorAllCases();
          }

          return;
        }

        if (action === 'deleted') {
          app.renderAdministratorDeletedCases();
          return;
        }

        if (action === 'activity') {
          app.renderAdministratorActivity();
          return;
        }

        if (action === 'notifications') {
          app.renderAdministratorNotifications();
          return;
        }

        if (action === 'emergency-alerts') {
          app.renderAdministratorEmergencyAlerts();
          return;
        }

        if (action === 'last-seen') {
          app.renderAdministratorLastSeen();
          return;
        }

        if (action === 'investigation') {
          openInvestigationCenter();
          return;
        }

        if (action === 'view-case') {
          app.renderAdministratorCase(caseId);
          return;
        }

        if (action === 'preview-photo') {
          app.openAdministratorPhotoPreview(caseId);
          return;
        }

        if (action === 'verify-case') {
          verifyCase(caseId);
          return;
        }

        if (action === 'reject-case') {
          rejectCase(caseId);
          return;
        }

        if (action === 'save-enquiry') {
          saveEnquiry(caseId);
          return;
        }

        if (action === 'save-status') {
          updateCaseStatus(caseId);
          return;
        }

        if (action === 'refresh-cases') {
          renderCaseTable();
          return;
        }

        if (action === 'logout') {

          if (
            typeof app.logoutAdministrator ===
            'function'
          ) {
            app.logoutAdministrator();
            return;
          }

          if (
            typeof app.logout ===
            'function'
          ) {
            app.logout();
            return;
          }

          localStorage.removeItem(
            'findme_session'
          );

          if (
            typeof app.renderLogin ===
            'function'
          ) {
            app.renderLogin();
          }

        }

      }
    );

    document.body.addEventListener('click', async function (event) {
      const filter = event.target.closest('[data-alert-filter]');
      if (filter) {
        document.querySelectorAll('[data-alert-filter]').forEach(node => node.classList.remove('active'));
        filter.classList.add('active');
        await renderEmergencyAlerts(filter.dataset.alertFilter || 'ALL');
        return;
      }
      const alertButton = event.target.closest('[data-alert-action]');
      if (alertButton) {
        try {
          await window.FindMeAPI.updateEmergencyAlert(alertButton.dataset.alertAction, alertButton.dataset.alertStatus);
          await renderEmergencyAlerts(document.querySelector('[data-alert-filter].active')?.dataset.alertFilter || 'ALL');
          app.showToast?.('Emergency alert updated.', 'success');
        } catch (error) {
          app.showToast?.(error.message || 'Unable to update alert.', 'error');
        }
      }
    });

    /*
      Search and status filters are dynamic.
    */

    document.body.addEventListener(
      'input',
      function (event) {

        if (
          event.target.id ===
          'fm3-search-input'
        ) {
          renderCaseTable();
        }

      }
    );

    document.body.addEventListener(
      'change',
      function (event) {

        if (
          event.target.id ===
          'fm3-status-filter'
        ) {
          renderCaseTable();
        }

      }
    );
  }

  /* ============================================================
     ADMIN ACTION ROUTER COMPATIBILITY
     ============================================================ */

  /*
    We deliberately DO NOT replace
    app.handleAdministratorAction.

    Part 5 may own that router.

    Part 3 dashboard buttons use
    data-fm3-action directly, preventing
    router conflicts.
  */

  /* ============================================================
     OPTIONAL EVENT FOR CITIZEN DELETION
     ============================================================ */

  window.addEventListener(
    'findme:case-deleted',
    function () {

      /*
        If Deleted Cases is currently visible,
        refresh it immediately.
      */

      const title =
        document.querySelector(
          '.fm3-title'
        );

      if (
        title &&
        title.textContent
          .toLowerCase()
          .includes('deleted cases')
      ) {
        app.renderAdministratorDeletedCases();
      }

    }
  );

  /* ============================================================
     PUBLIC PART 3 METHODS
     ============================================================ */

  app.getAdministratorCases = function () {
    return getCases();
  };

  app.getAdministratorActiveCases = function () {
    return getCases().filter(
      item => !isDeleted(item)
    );
  };

  app.getAdministratorDeletedCases = function () {
    return getCases().filter(
      item => isDeleted(item)
    );
  };

  app.refreshAdministratorDeletedCases =
    function () {

      const title =
        document.querySelector(
          '.fm3-title'
        );

      if (
        title &&
        title.textContent
          .toLowerCase()
          .includes('deleted cases')
      ) {
        app.renderAdministratorDeletedCases();
      }

    };

  /* ============================================================
     INITIAL EVENT BINDING
     ============================================================ */

  bindPart3Events();

  console.log(
    'FIND-ME Part 3 loaded successfully.'
  );

})();


/* ================================================================
   FIND-ME AI
   PART 4
   CITIZEN CASE REGISTRATION + MY REPORTS + SIGHTINGS +
   NOTIFICATIONS + SOFT DELETE
   ================================================================ */

(function () {
  'use strict';

  const app = window.findMeApp;

  if (!app) {
    console.error('FIND-ME Part 4: findMeApp was not found.');
    return;
  }

  const CASES_KEY = 'findme_cases_v3';
  const NOTIFICATIONS_KEY = 'findme_notifications_v3';
  const SIGHTINGS_KEY = 'findme_sightings_v3';
  const ACTIVITY_KEY = 'findme_activity_v3';

  /* ================================================================
     HELPERS
     ================================================================ */

  function getRoot() {
    if (app.elements && app.elements.root) {
      return app.elements.root;
    }

    return document.getElementById('findme-app-root');
  }

  function safeString(value) {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  function escapeHTML(value) {
    return safeString(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalize(value) {
    return safeString(value).trim().toLowerCase();
  }

  function generateId(prefix) {
    return (
      prefix +
      '-' +
      Date.now().toString(36) +
      '-' +
      Math.random().toString(36).slice(2, 9)
    ).toUpperCase();
  }

  function readArray(key) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('FIND-ME storage read error:', key, error);
      return [];
    }
  }

  function writeArray(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(Array.isArray(value) ? value : [])
      );

      return true;
    } catch (error) {
      console.error('FIND-ME storage write error:', key, error);

      if (
        error &&
        (
          error.name === 'QuotaExceededError' ||
          error.code === 22 ||
          error.code === 1014
        )
      ) {
        if (app.showToast) {
          app.showToast(
            'Storage is full. Please use a smaller image.',
            'error'
          );
        }
      }

      return false;
    }
  }

  function getCurrentUser() {
    if (app.currentUser) {
      return app.currentUser;
    }

    if (typeof app.getSession === 'function') {
      const session = app.getSession();

      if (session && session.user) {
        return session.user;
      }
    }

    try {
      const raw = localStorage.getItem(
        'findme_secure_session_v3'
      );

      if (raw) {
        const session = JSON.parse(raw);

        if (session && session.user) {
          return session.user;
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  function getCurrentUserId() {
    const user = getCurrentUser();

    return safeString(
      user?.id ||
      user?.userId ||
      user?.citizenId ||
      user?.complainantId
    );
  }

  function getCurrentUserEmail() {
    const user = getCurrentUser();

    return normalize(
      user?.email ||
      user?.username
    );
  }

  function getCurrentUserName() {
    const user = getCurrentUser();

    return safeString(
      user?.name ||
      user?.fullName ||
      user?.username ||
      'Citizen'
    );
  }

  function getCurrentUserPhone() {
    const user = getCurrentUser();

    return safeString(
      user?.phone ||
      user?.mobile ||
      ''
    );
  }

  /* ================================================================
     CASE STORAGE
     IMPORTANT:
     We save directly to findme_cases_v3.
     This prevents another saveCases implementation from
     accidentally restoring the deleted case.
     ================================================================ */

  function getCases() {
    return readArray(CASES_KEY);
  }

  function saveCasesDirectly(cases) {
    const success = writeArray(
      CASES_KEY,
      cases
    );

    if (success) {
      app.cases = cases;
    }

    return success;
  }

  /* ================================================================
     OWNERSHIP
     ================================================================ */

  function caseBelongsToCurrentCitizen(caseItem) {
    if (!caseItem) {
      return false;
    }

    const userId = normalize(getCurrentUserId());
    const email = getCurrentUserEmail();

    const ownerIds = [
      caseItem.userId,
      caseItem.userID,
      caseItem.citizenId,
      caseItem.citizenID,
      caseItem.complainantId,
      caseItem.complainantID,
      caseItem.ownerId,
      caseItem.ownerID,
      caseItem.createdByUserId,
      caseItem.createdById
    ]
      .map(normalize)
      .filter(Boolean);

    const ownerEmails = [
      caseItem.citizenEmail,
      caseItem.complainantEmail,
      caseItem.userEmail,
      caseItem.ownerEmail,
      caseItem.createdByEmail
    ]
      .map(normalize)
      .filter(Boolean);

    if (userId && ownerIds.includes(userId)) {
      return true;
    }

    if (email && ownerEmails.includes(email)) {
      return true;
    }

    return false;
  }

  /* ================================================================
     CASE ID MATCHING
     ================================================================ */

  function caseMatchesId(caseItem, requestedId) {
    const target = normalize(requestedId);

    if (!target || !caseItem) {
      return false;
    }

    const identifiers = [
      caseItem.id,
      caseItem.caseId,
      caseItem.caseID,
      caseItem.caseNumber,
      caseItem.caseNo,
      caseItem.complaintId,
      caseItem.complaintID
    ];

    return identifiers.some(
      value => normalize(value) === target
    );
  }

  /* ================================================================
     ACTIVITY LOG
     ================================================================ */

  function addActivity(entry) {
    const activities = readArray(ACTIVITY_KEY);

    activities.unshift({
      id: generateId('ACT'),
      timestamp: new Date().toISOString(),
      ...entry
    });

    writeArray(
      ACTIVITY_KEY,
      activities.slice(0, 1000)
    );
  }

  /* ================================================================
     NOTIFICATION
     ================================================================ */

  function addCitizenNotification(notification) {
    const notifications =
      readArray(NOTIFICATIONS_KEY);

    notifications.unshift({
      id: generateId('NTF'),
      createdAt: new Date().toISOString(),
      read: false,
      userId: getCurrentUserId(),
      citizenId: getCurrentUserId(),
      citizenEmail: getCurrentUserEmail(),
      ...notification
    });

    writeArray(
      NOTIFICATIONS_KEY,
      notifications.slice(0, 1000)
    );
  }

  /* ================================================================
     PART 4 STYLES
     ================================================================ */

  function injectPart4Styles() {
    if (document.getElementById('findme-part4-styles')) {
      return;
    }

    const style = document.createElement('style');

    style.id = 'findme-part4-styles';

    style.textContent = `
      .findme-p4-page {
        min-height: 100%;
        padding: 30px;
        box-sizing: border-box;
      }

      .findme-p4-container {
        width: min(1180px, 100%);
        margin: 0 auto;
      }

      .findme-p4-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .findme-p4-title-area h1 {
        margin: 0;
        color: #0f2747;
        font-size: 30px;
        font-weight: 800;
      }

      .findme-p4-title-area p {
        margin: 7px 0 0;
        color: #64748b;
        font-size: 14px;
      }

      .findme-p4-back {
        border: 0;
        background: #eaf2ff;
        color: #1557a6;
        padding: 11px 17px;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .findme-p4-card {
        background: #ffffff;
        border: 1px solid #e4ebf5;
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 12px 35px rgba(20, 60, 100, 0.07);
        margin-bottom: 22px;
      }

      .findme-p4-section-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
      }

      .findme-p4-section-title h2 {
        margin: 0;
        color: #12345a;
        font-size: 21px;
      }

      .findme-p4-section-title span {
        font-size: 25px;
      }

      .findme-p4-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      .findme-p4-field {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .findme-p4-field.full {
        grid-column: 1 / -1;
      }

      .findme-p4-field label {
        color: #334155;
        font-size: 13px;
        font-weight: 700;
      }

      .findme-p4-field input,
      .findme-p4-field select,
      .findme-p4-field textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #d5deea;
        background: #f8fbff;
        border-radius: 11px;
        padding: 12px 13px;
        color: #172b4d;
        font-size: 14px;
        outline: none;
      }

      .findme-p4-field textarea {
        min-height: 105px;
        resize: vertical;
      }

      .findme-p4-field input:focus,
      .findme-p4-field select:focus,
      .findme-p4-field textarea:focus {
        border-color: #3684dc;
        box-shadow: 0 0 0 3px rgba(54, 132, 220, 0.10);
      }

      .findme-p4-photo-box {
        border: 2px dashed #bfd2e8;
        border-radius: 18px;
        padding: 22px;
        text-align: center;
        background: #f7fbff;
      }

      .findme-p4-photo-icon {
        font-size: 42px;
        margin-bottom: 8px;
      }

      .findme-p4-photo-box h3 {
        margin: 0 0 6px;
        color: #17385e;
      }

      .findme-p4-photo-box p {
        margin: 0 0 15px;
        color: #718096;
        font-size: 13px;
      }

      .findme-p4-upload-button {
        display: inline-block;
        cursor: pointer;
        background: #1769c2;
        color: white;
        padding: 11px 17px;
        border-radius: 11px;
        font-weight: 700;
      }

      .findme-p4-upload-button input {
        display: none;
      }

      .findme-p4-preview {
        display: none;
        margin-top: 18px;
      }

      .findme-p4-preview img {
        max-width: 230px;
        max-height: 230px;
        object-fit: cover;
        border-radius: 14px;
        border: 1px solid #d6e0ec;
      }

      .findme-p4-remove-photo {
        display: block;
        margin: 10px auto 0;
        border: 0;
        background: #fee2e2;
        color: #b91c1c;
        padding: 8px 13px;
        border-radius: 9px;
        font-weight: 700;
        cursor: pointer;
      }

      .findme-p4-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 22px;
      }

      .findme-p4-primary {
        border: 0;
        background: linear-gradient(135deg, #1769c2, #1550a4);
        color: #fff;
        padding: 13px 21px;
        border-radius: 12px;
        font-weight: 800;
        cursor: pointer;
      }

      .findme-p4-secondary {
        border: 0;
        background: #edf3fa;
        color: #23456b;
        padding: 13px 21px;
        border-radius: 12px;
        font-weight: 800;
        cursor: pointer;
      }

      .findme-p4-error {
        display: none;
        background: #fff1f2;
        color: #be123c;
        border: 1px solid #fecdd3;
        border-radius: 11px;
        padding: 12px 14px;
        margin-top: 15px;
        font-size: 13px;
        font-weight: 600;
      }

      .findme-p4-report-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      .findme-p4-report {
        background: #fff;
        border: 1px solid #e2eaf3;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(30, 70, 110, 0.06);
      }

      .findme-p4-report-top {
        display: flex;
        gap: 16px;
        padding: 18px;
      }

      .findme-p4-report-photo {
        width: 90px;
        height: 90px;
        border-radius: 14px;
        object-fit: cover;
        background: #edf3f9;
        flex-shrink: 0;
      }

      .findme-p4-report-photo-empty {
        width: 90px;
        height: 90px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #edf3f9;
        font-size: 30px;
        flex-shrink: 0;
      }

      .findme-p4-report-info {
        min-width: 0;
      }

      .findme-p4-report-info h3 {
        margin: 0 0 6px;
        color: #17385e;
        font-size: 18px;
      }

      .findme-p4-case-number {
        color: #6b7c93;
        font-size: 12px;
        font-weight: 700;
      }

      .findme-p4-status {
        display: inline-block;
        margin-top: 9px;
        padding: 5px 9px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        background: #fff7d6;
        color: #8a6500;
      }

      .findme-p4-report-body {
        padding: 0 18px 18px;
        color: #5f7187;
        font-size: 13px;
      }

      .findme-p4-report-row {
        margin-top: 7px;
      }

      .findme-p4-report-row strong {
        color: #334e6f;
      }

      .findme-p4-report-actions {
        display: flex;
        gap: 9px;
        padding: 0 18px 18px;
        flex-wrap: wrap;
      }

      .findme-p4-view-button {
        border: 0;
        background: #eaf2ff;
        color: #1456a0;
        padding: 9px 13px;
        border-radius: 9px;
        cursor: pointer;
        font-weight: 700;
      }

      .findme-p4-delete-button {
        border: 0;
        background: #fff0f0;
        color: #c62828;
        padding: 9px 13px;
        border-radius: 9px;
        cursor: pointer;
        font-weight: 700;
      }

      .findme-p4-empty {
        text-align: center;
        padding: 50px 20px;
        color: #718096;
      }

      .findme-p4-empty-icon {
        font-size: 50px;
        margin-bottom: 10px;
      }

      .findme-p4-notification {
        padding: 16px;
        border: 1px solid #e4ebf4;
        border-radius: 14px;
        margin-bottom: 12px;
        background: #fbfdff;
      }

      .findme-p4-notification.unread {
        background: #eef7ff;
        border-color: #c7e1ff;
      }

      .findme-p4-notification h3 {
        margin: 0 0 6px;
        color: #183b62;
        font-size: 15px;
      }

      .findme-p4-notification p {
        margin: 0;
        color: #64748b;
        font-size: 13px;
        line-height: 1.55;
      }

      .findme-p4-sighting {
        background: #f8fbff;
        border: 1px solid #dce8f5;
        border-radius: 15px;
        padding: 17px;
        margin-bottom: 13px;
      }

      .findme-p4-sighting h3 {
        margin: 0 0 8px;
        color: #173b62;
      }

      .findme-p4-sighting p {
        margin: 5px 0;
        color: #64748b;
        font-size: 13px;
      }

      .findme-p4-modal {
        position: fixed;
        inset: 0;
        background: rgba(8, 25, 45, 0.62);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 99999;
      }

      .findme-p4-modal-box {
        width: min(650px, 100%);
        max-height: 90vh;
        overflow: auto;
        background: #fff;
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 25px 70px rgba(0,0,0,.25);
      }

      .findme-p4-modal-box h2 {
        margin: 0 0 15px;
        color: #17385e;
      }

      .findme-p4-detail-row {
        padding: 10px 0;
        border-bottom: 1px solid #edf1f5;
        font-size: 13px;
      }

      .findme-p4-detail-row strong {
        display: inline-block;
        min-width: 145px;
        color: #334e6f;
      }

      @media (max-width: 760px) {
        .findme-p4-page {
          padding: 18px;
        }

        .findme-p4-grid,
        .findme-p4-report-grid {
          grid-template-columns: 1fr;
        }

        .findme-p4-field.full {
          grid-column: auto;
        }

        .findme-p4-report-top {
          flex-direction: column;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ================================================================
     CASE NUMBER
     ================================================================ */

  function generateCaseNumber() {
    const now = new Date();

    const datePart =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');

    const randomPart =
      Math.floor(
        100000 +
        Math.random() * 900000
      );

    return `FM-${datePart}-${randomPart}`;
  }

  /* ================================================================
     PHOTO READER
     ================================================================ */

  function readPhotoAsDataURL(file, callback) {
    if (!file) {
      callback(null);
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      if (app.showToast) {
        app.showToast(
          'Please upload a JPG, JPEG or PNG image.',
          'warning'
        );
      }

      callback(null);
      return;
    }

    /*
      Keep this limit low enough for localStorage.
      Large base64 images can otherwise fill browser storage.
    */
    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      if (app.showToast) {
        app.showToast(
          'Photo must be 2 MB or smaller.',
          'warning'
        );
      }

      callback(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = function () {
      callback(reader.result);
    };

    reader.onerror = function () {
      callback(null);

      if (app.showToast) {
        app.showToast(
          'Unable to read the selected photo.',
          'error'
        );
      }
    };

    reader.readAsDataURL(file);
  }

  /* ================================================================
     REGISTER MISSING PERSON
     ================================================================ */

  function renderRegisterMissingPerson() {
    const root = getRoot();

    if (!root) {
      return;
    }

    injectPart4Styles();

    const user = getCurrentUser();

    if (!user) {
      root.innerHTML = `
        <div class="findme-p4-page">
          <div class="findme-p4-container">
            <div class="findme-p4-card">
              <div class="findme-p4-empty">
                <div class="findme-p4-empty-icon">🔐</div>
                <h2>Login Required</h2>
                <p>Please sign in as a citizen before registering a missing person.</p>
                <button
                  class="findme-p4-primary"
                  id="findme-p4-login"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document
        .getElementById('findme-p4-login')
        ?.addEventListener(
          'click',
          () => {
            app.clearSession?.();
            app.renderLogin?.();
          }
        );

      return;
    }

    root.innerHTML = `
      <div class="findme-p4-page">
        <div class="findme-p4-container">

          <div class="findme-p4-header">

            <div class="findme-p4-title-area">
              <h1>Register Missing Person</h1>
              <p>
                Submit accurate information so the case can be
                reviewed by authorized personnel.
              </p>
            </div>

            <button
              class="findme-p4-back"
              id="findme-p4-register-back"
            >
              ← Back to Dashboard
            </button>

          </div>

          <form id="findme-p4-registration-form">

            <div class="findme-p4-card">

              <div class="findme-p4-section-title">
                <span>📷</span>
                <h2>Missing Person Photo</h2>
              </div>

              <div class="findme-p4-photo-box">

                <div class="findme-p4-photo-icon">
                  🧑
                </div>

                <h3>Upload a clear recent photo</h3>

                <p>
                  JPG, JPEG or PNG • Maximum 2 MB
                </p>

                <label class="findme-p4-upload-button">
                  Choose Photo
                  <input
                    type="file"
                    id="findme-p4-photo"
                    accept="image/jpeg,image/jpg,image/png"
                  />
                </label>

                <div
                  class="findme-p4-preview"
                  id="findme-p4-photo-preview"
                >
                  <img
                    id="findme-p4-photo-preview-image"
                    alt="Missing person preview"
                  />

                  <button
                    type="button"
                    class="findme-p4-remove-photo"
                    id="findme-p4-remove-photo"
                  >
                    Remove Photo
                  </button>
                </div>

              </div>

            </div>

            <div class="findme-p4-card">

              <div class="findme-p4-section-title">
                <span>👤</span>
                <h2>Missing Person Details</h2>
              </div>

              <div class="findme-p4-grid">

                <div class="findme-p4-field">
                  <label for="findme-p4-name">
                    Full Name *
                  </label>

                  <input
                    id="findme-p4-name"
                    type="text"
                    required
                    placeholder="Enter full name"
                  />
                </div>

                <div class="findme-p4-field">
                  <label for="findme-p4-age">
                    Age *
                  </label>

                  <input
                    id="findme-p4-age"
                    type="number"
                    min="0"
                    max="120"
                    required
                    placeholder="Age"
                  />
                </div>

                <div class="findme-p4-field">
                  <label for="findme-p4-gender">
                    Gender *
                  </label>

                  <select
                    id="findme-p4-gender"
                    required
                  >
                    <option value="">
                      Select gender
                    </option>
                    <option value="Male">
                      Male
                    </option>
                    <option value="Female">
                      Female
                    </option>
                    <option value="Other">
                      Other
                    </option>
                    <option value="Unknown">
                      Unknown
                    </option>
                  </select>
                </div>

                <div class="findme-p4-field">
                  <label for="findme-p4-height">
                    Height
                  </label>

                  <input
                    id="findme-p4-height"
                    type="text"
                    placeholder="Example: 165 cm"
                  />
                </div>

                <div class="findme-p4-field full">
                  <label for="findme-p4-description">
                    Physical Description
                  </label>

                  <textarea
                    id="findme-p4-description"
                    placeholder="Describe appearance, hair, complexion, build, etc."
                  ></textarea>
                </div>

                <div class="findme-p4-field full">
                  <label for="findme-p4-clothing">
                    Clothing / Appearance at Last Known Sighting
                  </label>

                  <textarea
                    id="findme-p4-clothing"
                    placeholder="Describe clothes, footwear, bag, accessories, etc."
                  ></textarea>
                </div>

                <div class="findme-p4-field full">
                  <label for="findme-p4-identifying">
                    Identifying Marks
                  </label>

                  <textarea
                    id="findme-p4-identifying"
                    placeholder="Birthmarks, scars, tattoos or other identifying features."
                  ></textarea>
                </div>

                <div class="findme-p4-field full">
                  <label for="findme-p4-additional">
                    Additional Information
                  </label>

                  <textarea
                    id="findme-p4-additional"
                    placeholder="Any other information useful to investigators."
                  ></textarea>
                </div>

              </div>

            </div>

            <div class="findme-p4-card">

              <div class="findme-p4-section-title">
                <span>📋</span>
                <h2>Complainant Information</h2>
              </div>

              <div class="findme-p4-grid">

                <div class="findme-p4-field">
                 <label for="findme-p4-complainant-name">
    Your Name
</label>

<input
    id="findme-p4-complainant-name"
    type="text"
    value=""
    placeholder="Enter your full name"
    required
/>
                </div>

                <div class="findme-p4-field">
                  <label>
                    Your Email
                  </label>

                  <input
                    type="email"
                    value="${escapeHTML(
                      getCurrentUserEmail()
                    )}"
                    readonly
                  />
                </div>

                <div class="findme-p4-field">
                  <label for="findme-p4-phone">
                    Contact Phone *
                  </label>

                  <input
                    id="findme-p4-phone"
                    type="tel"
                    value="${escapeHTML(
                      getCurrentUserPhone()
                    )}"
                    required
                    placeholder="Phone number"
                  />
                </div>

                <div class="findme-p4-field">
                  <label for="findme-p4-relationship">
                    Relationship *
                  </label>

                  <select
                    id="findme-p4-relationship"
                    required
                  >
                    <option value="">
                      Select relationship
                    </option>
                    <option value="Parent">
                      Parent
                    </option>
                    <option value="Sibling">
                      Sibling
                    </option>
                    <option value="Spouse">
                      Spouse
                    </option>
                    <option value="Relative">
                      Relative
                    </option>
                    <option value="Friend">
                      Friend
                    </option>
                    <option value="Guardian">
                      Guardian
                    </option>
                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div class="findme-p4-field">
                  <label for="findme-p4-contact-preference">
                    Preferred Contact
                  </label>

                  <select
                    id="findme-p4-contact-preference"
                  >
                    <option value="Phone">
                      Phone
                    </option>
                    <option value="Email">
                      Email
                    </option>
                    <option value="Either">
                      Either
                    </option>
                  </select>
                  <small class="findme-contact-help">
                    Email / Either sends case notifications to your registered
                    email when SMTP email delivery is configured.
                  </small>
                </div>

                <div class="findme-p4-field full">
                  <label for="findme-p4-complainant-notes">
                    Notes for Verification
                  </label>

                  <textarea
                    id="findme-p4-complainant-notes"
                    placeholder="Anything the verification officer should know."
                  ></textarea>
                </div>

              </div>

            </div>

            <div class="findme-p4-card">

              <div class="findme-p4-section-title">
                <span>🛡️</span>
                <h2>Verification</h2>
              </div>

              <p style="
                margin:0;
                color:#64748b;
                line-height:1.7;
                font-size:14px;
              ">
                Your report will initially remain
                <strong>Pending Verification</strong>.
                Authorized personnel may contact you to confirm
                the information before the case becomes active.
              </p>

              <div
                class="findme-p4-error"
                id="findme-p4-error"
              ></div>

              <div class="findme-p4-actions">

                <button
                  type="button"
                  class="findme-p4-secondary"
                  id="findme-p4-cancel"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  class="findme-p4-primary"
                >
                  Submit Missing Person Report
                </button>

              </div>

            </div>

          </form>

        </div>
      </div>
    `;

    attachRegisterEvents();
  }

  /* ================================================================
     REGISTER EVENTS
     ================================================================ */

  function attachRegisterEvents() {
    const root = getRoot();

    if (!root) {
      return;
    }

    let photoData = '';

    const photoInput =
      document.getElementById(
        'findme-p4-photo'
      );

    const preview =
      document.getElementById(
        'findme-p4-photo-preview'
      );

    const previewImage =
      document.getElementById(
        'findme-p4-photo-preview-image'
      );

    const removePhoto =
      document.getElementById(
        'findme-p4-remove-photo'
      );

    photoInput?.addEventListener(
      'change',
      function () {
        const file =
          this.files &&
          this.files[0];

        readPhotoAsDataURL(
          file,
          function (dataURL) {
            if (!dataURL) {
              photoData = '';

              if (preview) {
                preview.style.display =
                  'none';
              }

              if (photoInput) {
                photoInput.value = '';
              }

              return;
            }

            photoData = dataURL;

            if (previewImage) {
              previewImage.src =
                dataURL;
            }

            if (preview) {
              preview.style.display =
                'block';
            }
          }
        );
      }
    );

    removePhoto?.addEventListener(
      'click',
      function () {
        photoData = '';

        if (photoInput) {
          photoInput.value = '';
        }

        if (preview) {
          preview.style.display =
            'none';
        }

        if (previewImage) {
          previewImage.removeAttribute(
            'src'
          );
        }
      }
    );

    document
      .getElementById(
        'findme-p4-register-back'
      )
      ?.addEventListener(
        'click',
        function () {
          app.renderCitizenDashboard?.();
        }
      );

    document
      .getElementById(
        'findme-p4-cancel'
      )
      ?.addEventListener(
        'click',
        function () {
          app.renderCitizenDashboard?.();
        }
      );

    const form =
      document.getElementById(
        'findme-p4-registration-form'
      );

    form?.addEventListener(
      'submit',
      function (event) {
        event.preventDefault();

        submitMissingPersonCase(
          photoData
        );
      }
    );
  }

  /* ================================================================
     SUBMIT CASE
     ================================================================ */

  function submitMissingPersonCase(
    photoData
  ) {
    const errorBox =
      document.getElementById(
        'findme-p4-error'
      );

    function showError(message) {
      if (!errorBox) {
        return;
      }

      errorBox.textContent =
        message;

      errorBox.style.display =
        'block';
    }

    if (errorBox) {
      errorBox.style.display =
        'none';
    }

    const user = getCurrentUser();

    if (!user) {
      showError(
        'Your session has expired. Please login again.'
      );
      return;
    }

    if (!photoData) {
      showError(
        'Please upload a photo of the missing person.'
      );
      return;
    }

    const name =
      safeString(
        document.getElementById(
          'findme-p4-name'
        )?.value
      ).trim();

      const complainantName =
  safeString(
    document.getElementById(
      'findme-p4-complainant-name'
    )?.value
  ).trim();

    const ageValue =
      safeString(
        document.getElementById(
          'findme-p4-age'
        )?.value
      ).trim();

    const gender =
      safeString(
        document.getElementById(
          'findme-p4-gender'
        )?.value
      ).trim();

    const height =
      safeString(
        document.getElementById(
          'findme-p4-height'
        )?.value
      ).trim();

    const description =
      safeString(
        document.getElementById(
          'findme-p4-description'
        )?.value
      ).trim();

    const clothing =
      safeString(
        document.getElementById(
          'findme-p4-clothing'
        )?.value
      ).trim();

    const identifyingMarks =
      safeString(
        document.getElementById(
          'findme-p4-identifying'
        )?.value
      ).trim();

    const additionalInfo =
      safeString(
        document.getElementById(
          'findme-p4-additional'
        )?.value
      ).trim();

    const phone =
      safeString(
        document.getElementById(
          'findme-p4-phone'
        )?.value
      ).trim();

    const relationship =
      safeString(
        document.getElementById(
          'findme-p4-relationship'
        )?.value
      ).trim();

    const preferredContact =
      safeString(
        document.getElementById(
          'findme-p4-contact-preference'
        )?.value
      ).trim();

    const complainantNotes =
      safeString(
        document.getElementById(
          'findme-p4-complainant-notes'
        )?.value
      ).trim();

    const age =
      Number(ageValue);

    if (!name) {
      showError(
        'Please enter the missing person name.'
      );
      return;
    }

    if (!complainantName) {
  showError(
    'Please enter your full name.'
  );
  return;
}

    if (
      !Number.isFinite(age) ||
      age < 0 ||
      age > 120
    ) {
      showError(
        'Please enter a valid age.'
      );
      return;
    }

    if (!gender) {
      showError(
        'Please select the gender.'
      );
      return;
    }

    if (!phone) {
      showError(
        'Please enter your contact phone number.'
      );
      return;
    }

    if (!relationship) {
      showError(
        'Please select your relationship with the missing person.'
      );
      return;
    }

    const now =
      new Date().toISOString();

    const caseId =
      generateId('CASE');

    const caseNumber =
      generateCaseNumber();

    const currentUserId =
      getCurrentUserId();

    const currentEmail =
      getCurrentUserEmail();

    const currentName =
      getCurrentUserName();

    const newCase = {
      id: caseId,
      caseId: caseId,

      caseNumber: caseNumber,
      caseNo: caseNumber,

      /* Missing person */
      name: name,
      missingPersonName: name,
      personName: name,

      age: age,
      missingPersonAge: age,

      gender: gender,
      missingPersonGender: gender,

      height: height,
      physicalDescription: description,
      description: description,

      clothing: clothing,
      clothingDescription: clothing,

      identifyingMarks: identifyingMarks,
      identifyingFeatures: identifyingMarks,

      additionalInfo: additionalInfo,

      /* Photo */
      photo: photoData,
      photoData: photoData,
      photoDataURL: photoData,
      image: photoData,
      imageData: photoData,
      referencePhoto: photoData,
      referenceImage: photoData,
      missingPersonPhoto: photoData,
      missingPersonImage: photoData,

      /* Citizen ownership */
      userId: currentUserId,
      citizenId: currentUserId,
      complainantId: currentUserId,
      ownerId: currentUserId,
      createdByUserId: currentUserId,

     citizenName: complainantName,
complainantName: complainantName,

      citizenEmail: currentEmail,
      complainantEmail: currentEmail,
      userEmail: currentEmail,

      citizenPhone: phone,
      complainantPhone: phone,

      relationship: relationship,
      preferredContact: preferredContact,
      complainantNotes: complainantNotes,

      /* Verification */
      status: 'pending',
      verificationStatus: 'pending',
      verificationDecision: 'PENDING',

      verified: false,
      isVerified: false,
      isActive: false,

      enquiryStatus: 'Not Started',
      enquiryResult: 'Pending',

      verificationNotes: '',
      enquiryNotes: '',
      investigationNotes: '',

      verifiedBy: '',
      verifiedAt: null,
      verificationDate: null,

      /* Audit */
      createdAt: now,
      registeredAt: now,
      submittedAt: now,
      createdBy: currentName,
      createdByEmail: currentEmail,

      /* Soft-delete foundation */
      deleted: false,
      isDeleted: false,
      deletedAt: null,
      deletedBy: '',
      deletedByUserId: '',
      deletedByEmail: '',
      auditAction: '',

      originalCaseSnapshot: null
    };

    const cases =
      getCases();

    cases.push(
      newCase
    );

    const saved =
      saveCasesDirectly(cases);

    if (!saved) {
      showError(
        'The report could not be saved. Please try again.'
      );
      return;
    }

    /*
      Keep app.cases synchronized as well.
    */
    app.cases = cases;

    addActivity({
      action: 'CASE REGISTERED BY USER',
      actionType: 'CASE_REGISTERED',
      caseId: caseId,
      caseNumber: caseNumber,
      citizenId: currentUserId,
      citizenEmail: currentEmail,
      citizenName: currentName
    });

    addCitizenNotification({
      type: 'case-created',
      title: 'Report Submitted',
      message:
        `Your missing person report ${caseNumber} has been submitted and is pending verification.`,
      caseId: caseId,
      caseNumber: caseNumber
    });

    if (app.showToast) {
      app.showToast(
        `Report submitted successfully. Case ${caseNumber} is pending verification.`,
        'success'
      );
    }

    /*
      Immediately open My Reports so the new report is visible.
    */
    renderMyReports();
  }

  /* ================================================================
     MY REPORTS
     ================================================================ */

  function getCitizenCases() {
    const cases =
      getCases();

    return cases.filter(
      function (caseItem) {
        return (
          caseBelongsToCurrentCitizen(
            caseItem
          ) &&
          !caseItem.deleted &&
          !caseItem.isDeleted
        );
      }
    );
  }

  function renderMyReports() {
    const root = getRoot();

    if (!root) {
      return;
    }

    injectPart4Styles();

    const user = getCurrentUser();

    if (!user) {
      app.renderLogin?.();
      return;
    }

    const cases =
      getCitizenCases();

    root.innerHTML = `
      <div class="findme-p4-page">

        <div class="findme-p4-container">

          <div class="findme-p4-header">

            <div class="findme-p4-title-area">
              <h1>My Reports</h1>
              <p>
                View and manage the missing-person reports
                submitted from your account.
              </p>
            </div>

            <button
              class="findme-p4-back"
              id="findme-p4-reports-back"
            >
              ← Back to Dashboard
            </button>

          </div>

          <div class="findme-p4-card">

            <div class="findme-p4-section-title">
              <span>📋</span>
              <h2>
                Your Active Reports
                (${cases.length})
              </h2>
            </div>

            ${
              cases.length === 0
                ? `
                  <div class="findme-p4-empty">

                    <div class="findme-p4-empty-icon">
                      📭
                    </div>

                    <h2>
                      No active reports
                    </h2>

                    <p>
                      You have not submitted any active
                      missing-person reports.
                    </p>

                    <button
                      class="findme-p4-primary"
                      id="findme-p4-new-report"
                    >
                      Register Missing Person
                    </button>

                  </div>
                `
                : `
                  <div class="findme-p4-report-grid">
                    ${cases
                      .map(
                        renderCitizenCaseCard
                      )
                      .join('')}
                  </div>
                `
            }

          </div>

        </div>

      </div>
    `;

    document
      .getElementById(
        'findme-p4-reports-back'
      )
      ?.addEventListener(
        'click',
        function () {
          app.renderCitizenDashboard?.();
        }
      );

    document
      .getElementById(
        'findme-p4-new-report'
      )
      ?.addEventListener(
        'click',
        function () {
          renderRegisterMissingPerson();
        }
      );

    root
      .querySelectorAll(
        '[data-findme-view-case]'
      )
      .forEach(
        function (button) {
          button.addEventListener(
            'click',
            function () {
              const caseId =
                this.dataset.findmeViewCase;

              showCitizenCaseDetails(
                caseId
              );
            }
          );
        }
      );

    root
      .querySelectorAll(
        '[data-findme-delete-case]'
      )
      .forEach(
        function (button) {
          button.addEventListener(
            'click',
            function () {
              const caseId =
                this.dataset.findmeDeleteCase;

              confirmDeleteCase(
                caseId
              );
            }
          );
        }
      );
  }

  /* ================================================================
     REPORT CARD
     ================================================================ */

  function renderCitizenCaseCard(caseItem) {
    const photo =
      caseItem.photo ||
      caseItem.photoData ||
      caseItem.photoDataURL ||
      caseItem.image ||
      caseItem.imageData ||
      '';

    const status =
      safeString(
        caseItem.status ||
        'pending'
      );

    const statusText =
      status === 'verified-active'
        ? 'Verified & Active'
        : status === 'rejected'
          ? 'Rejected'
          : status === 'resolved'
            ? 'Resolved'
            : 'Pending Verification';

    return `
      <div class="findme-p4-report">

        <div class="findme-p4-report-top">

          ${
            photo
              ? `
                <img
                  class="findme-p4-report-photo"
                  src="${escapeHTML(photo)}"
                  alt="${escapeHTML(
                    caseItem.name ||
                    'Missing person'
                  )}"
                />
              `
              : `
                <div class="findme-p4-report-photo-empty">
                  🧑
                </div>
              `
          }

          <div class="findme-p4-report-info">

            <h3>
              ${escapeHTML(
                caseItem.name ||
                caseItem.missingPersonName ||
                'Unknown'
              )}
            </h3>

            <div class="findme-p4-case-number">
              Case:
              ${escapeHTML(
                caseItem.caseNumber ||
                caseItem.caseNo ||
                caseItem.id ||
                ''
              )}
            </div>

            <span class="findme-p4-status">
              ${escapeHTML(statusText)}
            </span>

          </div>

        </div>

        <div class="findme-p4-report-body">

          <div class="findme-p4-report-row">
            <strong>Age:</strong>
            ${escapeHTML(
              caseItem.age ||
              caseItem.missingPersonAge ||
              'Not provided'
            )}
          </div>

          <div class="findme-p4-report-row">
            <strong>Gender:</strong>
            ${escapeHTML(
              caseItem.gender ||
              caseItem.missingPersonGender ||
              'Not provided'
            )}
          </div>

          <div class="findme-p4-report-row">
            <strong>Submitted:</strong>
            ${escapeHTML(
              formatDate(
                caseItem.createdAt ||
                caseItem.submittedAt
              )
            )}
          </div>

          <div class="findme-p4-report-row">
            <strong>Verification:</strong>
            ${escapeHTML(
              caseItem.verificationStatus ||
              'pending'
            )}
          </div>

        </div>

        <div class="findme-p4-report-actions">

          <button
            class="findme-p4-view-button"
            data-findme-view-case="${escapeHTML(
              caseItem.id ||
              caseItem.caseId ||
              caseItem.caseNumber ||
              ''
            )}"
          >
            View Details
          </button>

          <button
            class="findme-p4-delete-button"
            data-findme-delete-case="${escapeHTML(
              caseItem.id ||
              caseItem.caseId ||
              caseItem.caseNumber ||
              ''
            )}"
          >
            🗑️ Delete Report
          </button>

        </div>

      </div>
    `;
  }

  /* ================================================================
     DATE FORMAT
     ================================================================ */

  function formatDate(value) {
    if (!value) {
      return 'Not available';
    }

    try {
      const date =
        new Date(value);

      if (Number.isNaN(date.getTime())) {
        return safeString(value);
      }

      return date.toLocaleString(
        'en-IN',
        {
          dateStyle: 'medium',
          timeStyle: 'short'
        }
      );
    } catch (error) {
      return safeString(value);
    }
  }

  /* ================================================================
     CASE DETAILS
     ================================================================ */

  function showCitizenCaseDetails(
    requestedId
  ) {
    const cases =
      getCases();

    const caseItem =
      cases.find(
        function (item) {
          return (
            caseMatchesId(
              item,
              requestedId
            ) &&
            caseBelongsToCurrentCitizen(
              item
            ) &&
            !item.deleted &&
            !item.isDeleted
          );
        }
      );

    if (!caseItem) {
      app.showToast?.(
        'Report not found.',
        'warning'
      );

      renderMyReports();
      return;
    }

    const photo =
      caseItem.photo ||
      caseItem.photoData ||
      caseItem.photoDataURL ||
      caseItem.image ||
      caseItem.imageData ||
      '';

    const modal =
      document.createElement(
        'div'
      );

    modal.className =
      'findme-p4-modal';

    modal.innerHTML = `
      <div class="findme-p4-modal-box">

        <h2>
          ${escapeHTML(
            caseItem.name ||
            caseItem.missingPersonName ||
            'Missing Person'
          )}
        </h2>

        ${
          photo
            ? `
              <div style="text-align:center;margin-bottom:18px;">
                <img
                  src="${escapeHTML(photo)}"
                  alt="Missing person"
                  style="
                    max-width:220px;
                    max-height:220px;
                    border-radius:15px;
                    object-fit:cover;
                  "
                />
              </div>
            `
            : ''
        }

        <div class="findme-p4-detail-row">
          <strong>Case Number</strong>
          ${escapeHTML(
            caseItem.caseNumber ||
            caseItem.caseNo ||
            ''
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Name</strong>
          ${escapeHTML(
            caseItem.name ||
            caseItem.missingPersonName ||
            ''
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Age</strong>
          ${escapeHTML(
            caseItem.age ||
            ''
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Gender</strong>
          ${escapeHTML(
            caseItem.gender ||
            ''
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Height</strong>
          ${escapeHTML(
            caseItem.height ||
            'Not provided'
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Physical Description</strong>
          ${escapeHTML(
            caseItem.physicalDescription ||
            caseItem.description ||
            'Not provided'
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Clothing</strong>
          ${escapeHTML(
            caseItem.clothing ||
            caseItem.clothingDescription ||
            'Not provided'
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Identifying Marks</strong>
          ${escapeHTML(
            caseItem.identifyingMarks ||
            caseItem.identifyingFeatures ||
            'Not provided'
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Status</strong>
          ${escapeHTML(
            caseItem.status ||
            'pending'
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Verification</strong>
          ${escapeHTML(
            caseItem.verificationStatus ||
            'pending'
          )}
        </div>

        <div class="findme-p4-detail-row">
          <strong>Submitted</strong>
          ${escapeHTML(
            formatDate(
              caseItem.createdAt
            )
          )}
        </div>

        <div class="findme-p4-actions">

          <button
            class="findme-p4-secondary"
            id="findme-p4-close-details"
          >
            Close
          </button>

          <button
            class="findme-p4-delete-button"
            id="findme-p4-delete-from-details"
          >
            🗑️ Delete Report
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(
      modal
    );

    document
      .getElementById(
        'findme-p4-close-details'
      )
      ?.addEventListener(
        'click',
        function () {
          modal.remove();
        }
      );

    document
      .getElementById(
        'findme-p4-delete-from-details'
      )
      ?.addEventListener(
        'click',
        function () {
          modal.remove();

          confirmDeleteCase(
            caseItem.id ||
            caseItem.caseId ||
            caseItem.caseNumber
          );
        }
      );

    modal.addEventListener(
      'click',
      function (event) {
        if (
          event.target === modal
        ) {
          modal.remove();
        }
      }
    );
  }

  /* ================================================================
     CONFIRM DELETE
     ================================================================ */

  function confirmDeleteCase(
    requestedId
  ) {
    const cases =
      getCases();

    const caseItem =
      cases.find(
        function (item) {
          return (
            caseMatchesId(
              item,
              requestedId
            ) &&
            caseBelongsToCurrentCitizen(
              item
            ) &&
            !item.deleted &&
            !item.isDeleted
          );
        }
      );

    if (!caseItem) {
      app.showToast?.(
        'This report cannot be deleted or no longer exists.',
        'warning'
      );

      renderMyReports();
      return;
    }

    const caseNumber =
      caseItem.caseNumber ||
      caseItem.caseNo ||
      caseItem.id;

    const personName =
      caseItem.name ||
      caseItem.missingPersonName ||
      'this missing person';

    const modal =
      document.createElement(
        'div'
      );

    modal.className =
      'findme-p4-modal';

    modal.innerHTML = `
      <div class="findme-p4-modal-box">

        <div style="
          text-align:center;
          font-size:46px;
          margin-bottom:8px;
        ">
          ⚠️
        </div>

        <h2 style="text-align:center;">
          Delete Report?
        </h2>

        <p style="
          color:#64748b;
          line-height:1.7;
          text-align:center;
        ">
          Are you sure you want to delete the report
          for <strong>${escapeHTML(
            personName
          )}</strong>?
        </p>

        <p style="
          background:#fff7ed;
          border:1px solid #fed7aa;
          color:#9a3412;
          padding:13px;
          border-radius:11px;
          font-size:13px;
          line-height:1.6;
        ">
          Case <strong>${escapeHTML(
            caseNumber
          )}</strong> will be removed from your
          active reports. The case will be retained as a
          <strong>Deleted Case</strong> in the administrator
          audit records.
        </p>

        <div class="findme-p4-actions">

          <button
            class="findme-p4-secondary"
            id="findme-p4-delete-cancel"
          >
            Cancel
          </button>

          <button
            class="findme-p4-delete-button"
            id="findme-p4-delete-confirm"
          >
            Yes, Delete Report
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(
      modal
    );

    document
      .getElementById(
        'findme-p4-delete-cancel'
      )
      ?.addEventListener(
        'click',
        function () {
          modal.remove();
        }
      );

    document
      .getElementById(
        'findme-p4-delete-confirm'
      )
      ?.addEventListener(
        'click',
        function () {
          modal.remove();

          deleteCitizenCase(
            requestedId
          );
        }
      );

    modal.addEventListener(
      'click',
      function (event) {
        if (
          event.target === modal
        ) {
          modal.remove();
        }
      }
    );
  }

  /* ================================================================
     IMPORTANT:
     CITIZEN SOFT DELETE
     ================================================================ */

  async function deleteCitizenCase(
    requestedId
  ) {
    /*
      Backend-backed reports must be deleted in Flask/SQLite. The existing
      local soft-delete remains available for legacy demo-only records.
    */
    if (
      window.FindMeAPI &&
      typeof window.FindMeAPI.deleteComplaint === 'function'
    ) {
      try {
        await window.FindMeAPI.deleteComplaint(
          requestedId
        );

        if (
          window.FindMeBackend &&
          typeof window.FindMeBackend.syncCases === 'function'
        ) {
          await window.FindMeBackend.syncCases();
        }

        app.showToast?.(
          `Report ${safeString(requestedId)} deleted successfully.`,
          'success'
        );

        renderMyReports();
        return;
      } catch (backendError) {
        const backendCases =
          app.cases || [];

        const isBackendCase =
          backendCases.some(
            function (item) {
              return (
                caseMatchesId(
                  item,
                  requestedId
                ) &&
                item.backend
              );
            }
          );

        if (isBackendCase) {
          app.showToast?.(
            backendError.message ||
              'The report could not be deleted from the database.',
            'error'
          );
          return;
        }
      }
    }

    const cases =
      getCases();

    const index =
      cases.findIndex(
        function (item) {
          return (
            caseMatchesId(
              item,
              requestedId
            ) &&
            caseBelongsToCurrentCitizen(
              item
            ) &&
            !item.deleted &&
            !item.isDeleted
          );
        }
      );

    if (index === -1) {
      app.showToast?.(
        'Report not found or you do not have permission to delete it.',
        'error'
      );

      renderMyReports();
      return;
    }

    const originalCase =
      cases[index];

    const now =
      new Date().toISOString();

    const currentUser =
      getCurrentUser();

    const currentUserId =
      getCurrentUserId();

    const currentEmail =
      getCurrentUserEmail();

    const currentName =
      getCurrentUserName();

    /*
      Preserve the original report before modifying it.
      This is what the Administrator Deleted Cases section
      can use to display the original case information.
    */
    const originalSnapshot =
      JSON.parse(
        JSON.stringify(
          originalCase
        )
      );

    /*
      SOFT DELETE.
      DO NOT remove the array element.
    */
    const deletedCase = {
      ...originalCase,

      deleted: true,
      isDeleted: true,

      deletedAt: now,
      deletedDate: now,

      deletedBy: currentName,
      deletedByUserId: currentUserId,
      deletedByEmail: currentEmail,

      deletedByRole: 'citizen',

      auditAction:
        'CASE DELETED BY USER',

      deletionReason:
        'Deleted by citizen from My Reports',

      deletionType:
        'USER_SOFT_DELETE',

      isActive: false,

      active: false,

      statusBeforeDeletion:
        originalCase.status ||
        'pending',

      verificationStatusBeforeDeletion:
        originalCase.verificationStatus ||
        'pending',

      originalCaseSnapshot:
        originalSnapshot,

      originalCaseDetails:
        originalSnapshot,

      deletionAudit: {
        action:
          'CASE DELETED BY USER',

        actionType:
          'CASE_DELETED_BY_USER',

        caseId:
          originalCase.id ||
          originalCase.caseId ||
          '',

        caseNumber:
          originalCase.caseNumber ||
          originalCase.caseNo ||
          '',

        missingPersonName:
          originalCase.name ||
          originalCase.missingPersonName ||
          '',

        deletedBy:
          currentName,

        deletedByUserId:
          currentUserId,

        deletedByEmail:
          currentEmail,

        deletedAt:
          now,

        role:
          'citizen'
      }
    };

    cases[index] =
      deletedCase;

    /*
      CRITICAL:
      Save ONLY through our direct storage function.
      We do NOT call app.saveCases() here because another
      implementation could overwrite this array.
    */
    const saved =
      saveCasesDirectly(
        cases
      );

    if (!saved) {
      app.showToast?.(
        'The report could not be deleted because it could not be saved.',
        'error'
      );

      return;
    }

    /*
      Synchronize application memory.
    */
    app.cases =
      cases;

    /*
      Administrator audit log.
      Part 3 can read this as well.
    */
    addActivity({
      action:
        'CASE DELETED BY USER',

      actionType:
        'CASE_DELETED_BY_USER',

      caseId:
        deletedCase.id ||
        deletedCase.caseId ||
        '',

      caseNumber:
        deletedCase.caseNumber ||
        deletedCase.caseNo ||
        '',

      missingPersonName:
        deletedCase.name ||
        deletedCase.missingPersonName ||
        '',

      citizenId:
        currentUserId,

      citizenEmail:
        currentEmail,

      citizenName:
        currentName,

      deletedBy:
        currentName,

      deletedByUserId:
        currentUserId,

      deletedByEmail:
        currentEmail,

      deletedAt:
        now,

      originalStatus:
        originalCase.status ||
        'pending',

      originalVerificationStatus:
        originalCase.verificationStatus ||
        'pending'
    });

    /*
      Citizen notification.
    */
    addCitizenNotification({
      type:
        'case-deleted',

      title:
        'Report Deleted',

      message:
        `Your report ${safeString(
          deletedCase.caseNumber ||
          deletedCase.caseNo
        )} has been deleted successfully.`,

      caseId:
        deletedCase.id ||
        deletedCase.caseId ||
        '',

      caseNumber:
        deletedCase.caseNumber ||
        deletedCase.caseNo ||
        '',

      deletedAt:
        now
    });

    /*
      SUCCESS MESSAGE.
    */
    if (app.showToast) {
      app.showToast(
        `Report ${safeString(
          deletedCase.caseNumber ||
          deletedCase.caseNo
        )} deleted successfully.`,
        'success'
      );
    }

    /*
      IMPORTANT:
      Immediately rebuild My Reports from fresh localStorage.
      Therefore the deleted card disappears NOW.
    */
    renderMyReports();

    /*
      Dispatch an event so any administrator/list component
      currently listening can refresh when appropriate.
    */
    try {
      window.dispatchEvent(
        new CustomEvent(
          'findme:case-deleted',
          {
            detail: {
              caseId:
                deletedCase.id ||
                deletedCase.caseId,

              caseNumber:
                deletedCase.caseNumber ||
                deletedCase.caseNo,

              deletedAt:
                now,

              deletedBy:
                currentName
            }
          }
        )
      );
    } catch (error) {
      /*
        CustomEvent may not be available in very old browsers.
        The stored case is still correct.
      */
    }

    /*
      If Part 3 exposes a refresh function, use it.
      This is intentionally optional so Part 4 does not
      break if the administrator page is not loaded.
    */
    if (
      typeof app.refreshAdministratorDeletedCases ===
      'function'
    ) {
      app.refreshAdministratorDeletedCases();
    }
  }

  /* ================================================================
     SIGHTING REPORT
     ================================================================ */

  function renderReportSighting() {
    const root = getRoot();

    if (!root) {
      return;
    }

    injectPart4Styles();

    const user =
      getCurrentUser();

    if (!user) {
      app.renderLogin?.();
      return;
    }

    const activeCases =
      getCitizenCases();

    root.innerHTML = `
      <div class="findme-p4-page">

        <div class="findme-p4-container">

          <div class="findme-p4-header">

            <div class="findme-p4-title-area">
              <h1>Report a Sighting</h1>
              <p>
                Submit information if you believe you have
                seen a missing person.
              </p>
            </div>

            <button
              class="findme-p4-back"
              id="findme-p4-sighting-back"
            >
              ← Back to Dashboard
            </button>

          </div>

          <div class="findme-p4-card">

            <div class="findme-p4-section-title">
              <span>👁️</span>
              <h2>Sighting Information</h2>
            </div>

            <div class="findme-p4-grid">

              <div class="findme-p4-field full">

                <label for="findme-p4-sighting-case">
                  Related Report
                </label>

                <select
                  id="findme-p4-sighting-case"
                >

                  <option value="">
                    Select a report
                  </option>

                  ${activeCases
                    .map(
                      item => `
                        <option
                          value="${escapeHTML(
                            item.id ||
                            item.caseId ||
                            ''
                          )}"
                        >
                          ${escapeHTML(
                            item.caseNumber ||
                            item.caseNo ||
                            ''
                          )}
                          -
                          ${escapeHTML(
                            item.name ||
                            item.missingPersonName ||
                            ''
                          )}
                        </option>
                      `
                    )
                    .join('')}

                </select>

              </div>

              <div class="findme-p4-field">
                <label for="findme-p4-sighting-location">
                  Location *
                </label>

                <input
                  id="findme-p4-sighting-location"
                  type="text"
                  placeholder="Where was the person seen?"
                />
              </div>

              <div class="findme-p4-field">
                <label for="findme-p4-sighting-time">
                  Date & Time
                </label>

                <input
                  id="findme-p4-sighting-time"
                  type="datetime-local"
                />
              </div>

              <div class="findme-p4-field full">
                <label for="findme-p4-sighting-description">
                  Description *
                </label>

                <textarea
                  id="findme-p4-sighting-description"
                  placeholder="Describe what you observed."
                ></textarea>
              </div>

            </div>

            <div
              class="findme-p4-error"
              id="findme-p4-sighting-error"
            ></div>

            <div class="findme-p4-actions">

              <button
                type="button"
                class="findme-p4-primary"
                id="findme-p4-submit-sighting"
              >
                Submit Sighting
              </button>

            </div>

          </div>

          <div class="findme-p4-card">

            <div class="findme-p4-section-title">
              <span>📍</span>
              <h2>My Sighting Reports</h2>
            </div>

            <div id="findme-p4-sightings-list"></div>

          </div>

        </div>

      </div>
    `;

    document
      .getElementById(
        'findme-p4-sighting-back'
      )
      ?.addEventListener(
        'click',
        function () {
          app.renderCitizenDashboard?.();
        }
      );

    document
      .getElementById(
        'findme-p4-submit-sighting'
      )
      ?.addEventListener(
        'click',
        submitSighting
      );

    renderCitizenSightings();
  }

  /* ================================================================
     SUBMIT SIGHTING
     ================================================================ */

  function submitSighting() {
    const error =
      document.getElementById(
        'findme-p4-sighting-error'
      );

    const caseId =
      safeString(
        document.getElementById(
          'findme-p4-sighting-case'
        )?.value
      ).trim();

    const location =
      safeString(
        document.getElementById(
          'findme-p4-sighting-location'
        )?.value
      ).trim();

    const sightingTime =
      safeString(
        document.getElementById(
          'findme-p4-sighting-time'
        )?.value
      ).trim();

    const description =
      safeString(
        document.getElementById(
          'findme-p4-sighting-description'
        )?.value
      ).trim();

    if (!location) {
      if (error) {
        error.textContent =
          'Please enter the sighting location.';

        error.style.display =
          'block';
      }

      return;
    }

    if (!description) {
      if (error) {
        error.textContent =
          'Please enter a description of the sighting.';

        error.style.display =
          'block';
      }

      return;
    }

    const currentUserId =
      getCurrentUserId();

    const currentEmail =
      getCurrentUserEmail();

    const currentName =
      getCurrentUserName();

    const sightings =
      readArray(
        SIGHTINGS_KEY
      );

    const sighting = {
      id:
        generateId('SIGHT'),

      caseId:
        caseId,

      citizenId:
        currentUserId,

      userId:
        currentUserId,

      citizenEmail:
        currentEmail,

      citizenName:
        currentName,

      location:
        location,

      sightingTime:
        sightingTime ||
        new Date().toISOString(),

      description:
        description,

      status:
        'pending',

      createdAt:
        new Date().toISOString()
    };

    sightings.unshift(
      sighting
    );

    writeArray(
      SIGHTINGS_KEY,
      sightings
    );

    addActivity({
      action:
        'SIGHTING REPORTED BY USER',

      actionType:
        'SIGHTING_REPORTED',

      sightingId:
        sighting.id,

      caseId:
        caseId,

      citizenId:
        currentUserId,

      citizenEmail:
        currentEmail,

      citizenName:
        currentName
    });

    addCitizenNotification({
      type:
        'sighting-created',

      title:
        'Sighting Submitted',

      message:
        'Your sighting report has been submitted for review.',

      sightingId:
        sighting.id,

      caseId:
        caseId
    });

    app.showToast?.(
      'Sighting submitted successfully.',
      'success'
    );

    renderReportSighting();
  }

  /* ================================================================
     CITIZEN SIGHTINGS
     ================================================================ */

  function renderCitizenSightings() {
    const container =
      document.getElementById(
        'findme-p4-sightings-list'
      );

    if (!container) {
      return;
    }

    const userId =
      getCurrentUserId();

    const email =
      getCurrentUserEmail();

    const sightings =
      readArray(
        SIGHTINGS_KEY
      ).filter(
        function (item) {
          return (
            normalize(
              item.citizenId ||
              item.userId
            ) ===
            normalize(userId)
          ) ||
          normalize(
            item.citizenEmail
          ) === email;
        }
      );

    if (sightings.length === 0) {
      container.innerHTML = `
        <div class="findme-p4-empty">
          <div class="findme-p4-empty-icon">
            📍
          </div>
          <p>
            You have not submitted any sighting reports.
          </p>
        </div>
      `;

      return;
    }

    const cases =
      getCases();

    container.innerHTML =
      sightings
        .map(
          function (sighting) {
            const relatedCase =
              cases.find(
                item =>
                  caseMatchesId(
                    item,
                    sighting.caseId
                  )
              );

            return `
              <div class="findme-p4-sighting">

                <h3>
                  📍
                  ${escapeHTML(
                    relatedCase?.name ||
                    relatedCase?.missingPersonName ||
                    'Sighting Report'
                  )}
                </h3>

                <p>
                  <strong>Location:</strong>
                  ${escapeHTML(
                    sighting.location
                  )}
                </p>

                <p>
                  <strong>Date:</strong>
                  ${escapeHTML(
                    formatDate(
                      sighting.sightingTime
                    )
                  )}
                </p>

                <p>
                  <strong>Description:</strong>
                  ${escapeHTML(
                    sighting.description
                  )}
                </p>

                <p>
                  <strong>Status:</strong>
                  ${escapeHTML(
                    sighting.status ||
                    'pending'
                  )}
                </p>

              </div>
            `;
          }
        )
        .join('');
  }

  /* ================================================================
     NOTIFICATIONS
     ================================================================ */

  async function renderCitizenNotifications() {
    const root = getRoot();

    if (!root) {
      return;
    }

    injectPart4Styles();

    const userId =
      getCurrentUserId();

    const email =
      getCurrentUserEmail();

    // FINAL BUILD: never clear backend notifications while opening this page.
    // The backend database is the only source of truth for citizen notifications.
    try {
      const legacy = readArray(NOTIFICATIONS_KEY);
      writeArray(NOTIFICATIONS_KEY, legacy.filter(function(item) {
        const sameUser = normalize(item.userId || item.citizenId) === normalize(userId);
        const sameEmail = normalize(item.citizenEmail) === email;
        return !(sameUser || sameEmail);
      }));
    } catch (_) {}

    let notifications = [];
    let notificationLoadError = '';

    try {
      const response =
        await findMeApiRequest(
          '/notifications'
        );

      notifications =
        Array.isArray(
          response?.notifications
        )
          ? response.notifications.map(
              function (item) {
                return {
                  ...item,
                  createdAt:
                    item.created_at ||
                    item.createdAt ||
                    ''
                };
              }
            )
          : [];
    } catch (error) {
      console.error(
        'Unable to load backend citizen notifications:',
        error
      );
      notificationLoadError = error?.message || 'Unable to load notifications from the server.';
      notifications = [];
    }

    root.innerHTML = `
      <div class="findme-p4-page">

        <div class="findme-p4-container">

          <div class="findme-p4-header">

            <div class="findme-p4-title-area">
              <h1>Notifications</h1>
              <p>
                Updates about your reports and submissions.
              </p>
            </div>

            <button
              type="button"
              id="findme-p4-clear-notifications"
              class="findme-p4-back"
              style="margin-right:8px;"
            >
              🗑️ Clear Notifications
            </button>

            <button
              class="findme-p4-back"
              id="findme-p4-notifications-back"
            >
              ← Back to Dashboard
            </button>

          </div>

          <div class="findme-p4-card">

            ${
              notificationLoadError
                ? `
                  <div class="findme-p4-empty" style="border-color:#fecaca;background:#fff7f7;">
                    <div class="findme-p4-empty-icon">⚠️</div>
                    <h2>Unable to load notifications</h2>
                    <p>${escapeHTML(notificationLoadError)}</p>
                    <button type="button" class="findme-p4-back" onclick="location.reload()">Refresh</button>
                  </div>
                `
                : notifications.length === 0
                ? `
                  <div class="findme-p4-empty">
                    <div class="findme-p4-empty-icon">
                      🔔
                    </div>
                    <h2>No notifications</h2>
                    <p>
                      You are all caught up.
                    </p>
                  </div>
                `
                : notifications
                    .map(
                      function (item) {
                        return `
                          <div class="
                            findme-p4-notification
                            ${
                              item.read
                                ? ''
                                : 'unread'
                            }
                          ">

                            <h3>
                              ${
                                item.read
                                  ? '🔔'
                                  : '🔵'
                              }
                              ${escapeHTML(
                                item.title ||
                                'Notification'
                              )}
                            </h3>

                            <p>
                              ${escapeHTML(
                                item.message ||
                                ''
                              )}
                            </p>

                            <p style="
                              margin-top:8px;
                              font-size:11px;
                              color:#94a3b8;
                            ">
                              ${escapeHTML(
                                formatDate(
                                  item.createdAt
                                )
                              )}
                            </p>

                          </div>
                        `;
                      }
                    )
                    .join('')
            }

          </div>

        </div>

      </div>
    `;

    /*
      Mark backend notifications as read after displaying them.
      The backend remains the source of truth.
    */
    try {
      await findMeApiRequest(
        '/notifications/read-all',
        { method: 'POST' }
      );
    } catch (error) {
      console.warn(
        'Unable to mark backend notifications as read:',
        error
      );
    }

    document
      .getElementById(
        'findme-p4-clear-notifications'
      )
      ?.addEventListener(
        'click',
        async function () {
          try {
            await findMeApiRequest(
              '/notifications/clear',
              { method: 'POST' }
            );

            // Also remove legacy browser-side notifications for this citizen.
            writeArray(
              NOTIFICATIONS_KEY,
              readArray(NOTIFICATIONS_KEY).filter(
                function (item) {
                  const sameUser =
                    normalize(
                      item.userId ||
                      item.citizenId
                    ) === normalize(userId);

                  const sameEmail =
                    normalize(
                      item.citizenEmail
                    ) === email;

                  return !(
                    sameUser ||
                    sameEmail
                  );
                }
              )
            );

            renderCitizenNotifications();
          } catch (error) {
            alert(
              'Unable to clear notifications. Please try again.'
            );
          }
        }
      );

    document
      .getElementById(
        'findme-p4-notifications-back'
      )
      ?.addEventListener(
        'click',
        function () {
          app.renderCitizenDashboard?.();
        }
      );
  }

  /* ================================================================
     ROUTING
     ================================================================ */

  const previousCitizenAction =
    app.handleCitizenAction;

  app.handleCitizenAction =
    function (action) {

      const normalizedAction =
        normalize(action);

      if (
        normalizedAction ===
        'register'
      ) {
        renderRegisterMissingPerson();
        return;
      }

      if (
        normalizedAction ===
        'reports'
      ) {
        renderMyReports();
        return;
      }

      if (
        normalizedAction ===
        'sighting'
      ) {
        renderReportSighting();
        return;
      }

      if (
        normalizedAction ===
        'notifications'
      ) {
        renderCitizenNotifications();
        return;
      }

      if (
        typeof previousCitizenAction ===
        'function'
      ) {
        return previousCitizenAction.call(
          app,
          action
        );
      }
    };

  /* ================================================================
     PUBLIC METHODS
     ================================================================ */

  app.renderRegisterMissingPerson =
    renderRegisterMissingPerson;

  app.showRegisterMissingPerson =
    renderRegisterMissingPerson;

  app.renderMyReports =
    renderMyReports;

  app.renderReportSighting =
    renderReportSighting;

  app.renderCitizenNotifications =
    renderCitizenNotifications;

  app.deleteCitizenCase =
    deleteCitizenCase;

  app.confirmDeleteCase =
    confirmDeleteCase;

  app.getCitizenCases =
    getCitizenCases;

  app.getAllFindMeCases =
    getCases;

  /*
    IMPORTANT:
    We intentionally DO NOT override:

      app.renderCitizenRegistration

    because Part 1's Create Citizen Account page must continue
    working normally.
  */

  /* ================================================================
     AUTOMATIC ADMIN DELETED-CASE REFRESH SUPPORT
     ================================================================ */

  window.addEventListener(
    'findme:case-deleted',
    function (event) {

      const detail =
        event?.detail || {};

      console.log(
        'FIND-ME: Case deleted and stored for administrator audit:',
        detail
      );

      /*
        If Part 3 has a deleted-case refresh method,
        call it.
      */
      if (
        typeof app.refreshAdministratorDeletedCases ===
        'function'
      ) {
        app.refreshAdministratorDeletedCases();
      }
    }
  );

  /* ================================================================
     FINISH
     ================================================================ */

  console.log(
    'FIND-ME Part 4 loaded successfully.'
  );

  console.log(
    'Citizen features:',
    'Register Missing Person, My Reports, Sighting Reports, Notifications, Soft Delete'
  );

  console.log(
    'Soft delete storage:',
    CASES_KEY
  );

})();




/* ============================================================
   FIND-ME AI — PART 5
   INVESTIGATION CENTER + VIDEO PROCESSING + FULL PHOTO PREVIEW
   ============================================================ */

(() => {
  'use strict';

  const APP_NAME = 'FIND-ME AI';

  const CASES_KEY = 'findme_cases_v3';
  const INVESTIGATION_UPLOADS_KEY = 'findme_investigation_uploads_v1';

  const app = window.findMeApp;

  if (!app) {
    console.error('Find-Me Part 5: application instance not found.');
    return;
  }

  /* ============================================================
     BASIC HELPERS
     ============================================================ */

  function getRoot() {
    if (typeof app.getRoot === 'function') {
      return app.getRoot();
    }
 
    return (
      document.getElementById('findme-root') ||
      document.getElementById('app') ||
      document.querySelector('[data-findme-root]') ||
      document.body
    );
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeString(value, fallback = '') {
    if (value === null || value === undefined) {
      return fallback;
    }

    return String(value);
  }

  function normalize(value) {
    return safeString(value)
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-');
  }

  function readArray(key) {
    try {
      const value = localStorage.getItem(key);

      if (!value) {
        return [];
      }

      const parsed = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(`Find-Me: unable to read ${key}`, error);
      return [];
    }
  }

  function writeArray(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(Array.isArray(value) ? value : [])
      );
    } catch (error) {
      console.error(`Find-Me: unable to write ${key}`, error);
    }
  }

  function showToast(message, type = 'info') {
    if (typeof app.showToast === 'function') {
      app.showToast(message, type);
      return;
    }

    const existing = document.querySelector(
      '.findme-part5-toast'
    );

    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');

    toast.className =
      'findme-part5-toast findme-part5-toast-' +
      normalize(type);

    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  function requireAdministrator() {
    if (typeof app.requireAdministrator === 'function') {
      return app.requireAdministrator();
    }

    if (typeof app.isAdministrator === 'function') {
      return app.isAdministrator();
    }

    return (
      app.currentRole === 'administrator' ||
      app.user?.role === 'administrator' ||
      app.currentUser?.role === 'administrator'
    );
  }

  function openAdminDashboard() {
    if (typeof app.openAdministratorDashboard === 'function') {
      app.openAdministratorDashboard();
      return;
    }

    if (
      typeof app.renderAdministratorDashboard ===
      'function'
    ) {
      app.renderAdministratorDashboard();
      return;
    }

    if (
      typeof app.renderAdminDashboard ===
      'function'
    ) {
      app.renderAdminDashboard();
      return;
    }

    console.warn(
      'Find-Me Part 5: administrator dashboard method not found.'
    );
  }

  /* ============================================================
     INVESTIGATION UPLOAD STORAGE
     ============================================================ */

  function saveInvestigationUpload(record) {
    const uploads = readArray(
      INVESTIGATION_UPLOADS_KEY
    );

    uploads.unshift(record);

    writeArray(
      INVESTIGATION_UPLOADS_KEY,
      uploads.slice(0, 20)
    );
  }

  function getInvestigationUploads() {
    return readArray(
      INVESTIGATION_UPLOADS_KEY
    );
  }

  /* ============================================================
     PART 5 CSS
     ============================================================ */

  function injectStyles() {
    if (
      document.getElementById(
        'findme-part5-styles'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'findme-part5-styles';

    style.textContent = `
      .findme-p5-page {
        width: 100%;
        max-width: 1250px;
        margin: 0 auto;
        padding: 28px;
        box-sizing: border-box;
      }

      .findme-p5-back {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: none;
        background: #eef4ff;
        color: #1d4ed8;
        padding: 11px 16px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 700;
        margin-bottom: 22px;
      }

      .findme-p5-back:hover {
        background: #dbeafe;
      }

      .findme-p5-title {
        font-size: 30px;
        font-weight: 800;
        color: #102a43;
        margin: 0 0 8px;
      }

      .findme-p5-subtitle {
        color: #64748b;
        margin: 0 0 28px;
        font-size: 15px;
        line-height: 1.6;
      }

      .findme-p5-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 20px;
      }

      .findme-p5-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 24px;
        box-shadow:
          0 10px 28px rgba(15, 23, 42, 0.07);
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .findme-p5-card:hover {
        transform: translateY(-3px);
        box-shadow:
          0 16px 34px rgba(15, 23, 42, 0.11);
      }

      .findme-p5-card-icon {
        font-size: 38px;
        margin-bottom: 12px;
      }

      .findme-p5-card h3 {
        margin: 0 0 8px;
        font-size: 21px;
        color: #0f172a;
      }

      .findme-p5-card p {
        margin: 0 0 18px;
        color: #64748b;
        line-height: 1.55;
        font-size: 14px;
      }

      .findme-p5-button {
        border: none;
        border-radius: 11px;
        padding: 12px 18px;
        cursor: pointer;
        font-weight: 700;
        font-size: 14px;
        background: #2563eb;
        color: #ffffff;
        transition:
          background 0.2s ease,
          transform 0.15s ease;
      }

      .findme-p5-button:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
      }

      .findme-p5-button.secondary {
        background: #eef4ff;
        color: #1d4ed8;
      }

      .findme-p5-button.secondary:hover {
        background: #dbeafe;
      }

      .findme-p5-button.success {
        background: #15803d;
      }

      .findme-p5-button.danger {
        background: #dc2626;
      }

      .findme-p5-file {
        width: 100%;
        padding: 13px;
        border: 1px dashed #94a3b8;
        border-radius: 11px;
        background: #f8fafc;
        margin-bottom: 15px;
        box-sizing: border-box;
      }

      .findme-p5-status {
        margin-top: 15px;
        padding: 13px 15px;
        border-radius: 11px;
        background: #f1f5f9;
        color: #334155;
        font-size: 14px;
        line-height: 1.5;
      }

      .findme-p5-status.success {
        background: #ecfdf5;
        color: #166534;
      }

      .findme-p5-status.error {
        background: #fef2f2;
        color: #991b1b;
      }

      .findme-p5-camera {
        width: 100%;
        max-height: 560px;
        background: #020617;
        border-radius: 16px;
        object-fit: contain;
        display: block;
      }

      .findme-p5-camera-wrap {
        background: #020617;
        border-radius: 16px;
        padding: 8px;
        margin-bottom: 16px;
      }

      .findme-p5-results {
        margin-top: 25px;
      }

      .findme-p5-results h2 {
        margin: 0 0 18px;
        color: #0f172a;
      }

      .findme-p5-stat-grid {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }

      .findme-p5-stat {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 13px;
        padding: 16px;
      }

      .findme-p5-stat-label {
        color: #64748b;
        font-size: 12px;
        margin-bottom: 5px;
      }

      .findme-p5-stat-value {
        color: #0f172a;
        font-size: 21px;
        font-weight: 800;
      }

      .findme-p5-match {
        background: #ffffff;
        border: 1px solid #dbeafe;
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 15px;
      }

      .findme-p5-match h3 {
        margin: 0 0 14px;
        color: #1e3a8a;
      }

      .findme-p5-match-row {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
      }

      .findme-p5-match-row:last-child {
        border-bottom: none;
      }

      .findme-p5-match-label {
        color: #64748b;
      }

      .findme-p5-match-value {
        color: #0f172a;
        font-weight: 700;
        text-align: right;
      }

      /* ========================================================
         FULL PHOTO PREVIEW
         ======================================================== */

      .findme-p5-photo-container {
        width: 100%;
        min-height: 320px;
        max-height: 650px;
        background: #f1f5f9;
        border-radius: 16px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e2e8f0;
      }

      .findme-p5-full-photo {
        display: block;
        width: 100%;
        height: 100%;
        max-height: 650px;
        object-fit: contain !important;
        object-position: center center !important;
        background: #f8fafc;
      }

      .findme-p5-photo-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 14px;
      }

      .findme-p5-photo-modal {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(2, 6, 23, 0.88);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 25px;
        box-sizing: border-box;
      }

      .findme-p5-photo-modal-inner {
        position: relative;
        width: min(1100px, 96vw);
        height: min(850px, 94vh);
        background: #ffffff;
        border-radius: 18px;
        padding: 18px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }

      .findme-p5-photo-modal-title {
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 12px;
        padding-right: 45px;
      }

      .findme-p5-photo-modal-image-wrap {
        flex: 1;
        min-height: 0;
        background: #0f172a;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
      }

      .findme-p5-photo-modal-image {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain !important;
        object-position: center center !important;
        display: block;
      }

      .findme-p5-photo-close {
        position: absolute;
        top: 12px;
        right: 14px;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        background: #f1f5f9;
        cursor: pointer;
        font-size: 20px;
        font-weight: 800;
      }

      .findme-p5-photo-close:hover {
        background: #e2e8f0;
      }

      .findme-p5-center-banner {
        background:
          linear-gradient(
            135deg,
            #eff6ff,
            #f8fbff
          );
        border: 1px solid #bfdbfe;
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 22px;
        color: #1e3a8a;
      }

      .findme-p5-center-banner strong {
        display: block;
        margin-bottom: 5px;
        font-size: 17px;
      }

      .findme-part5-toast {
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 100000;
        max-width: 380px;
        padding: 14px 18px;
        border-radius: 12px;
        background: #0f172a;
        color: #ffffff;
        box-shadow:
          0 15px 35px rgba(15, 23, 42, 0.25);
        font-size: 14px;
      }

      .findme-part5-toast-success {
        background: #166534;
      }

      .findme-part5-toast-error {
        background: #991b1b;
      }

      @media (max-width: 800px) {
        .findme-p5-grid {
          grid-template-columns: 1fr;
        }

        .findme-p5-stat-grid {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .findme-p5-page {
          padding: 18px;
        }

        .findme-p5-title {
          font-size: 25px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  injectStyles();

  /* ============================================================
     DASHBOARD CLEANUP
     
     IMPORTANT:
     Remove the four individual investigation options from
     Administrator Dashboard.

     They will appear ONLY inside Investigation Center.
     ============================================================ */

  function findDashboardCard(element) {
    if (!element) {
      return null;
    }

    let node = element;

    for (let i = 0; i < 7 && node; i++) {
      const actionCount =
        node.querySelectorAll(
          '[data-admin-action]'
        ).length;

      const moduleCount =
        node.querySelectorAll(
          '[data-admin-module]'
        ).length;

      if (
        actionCount === 1 &&
        moduleCount === 0
      ) {
        return node;
      }

      if (
        moduleCount === 1 &&
        actionCount === 0
      ) {
        return node;
      }

      node = node.parentElement;
    }

    return element.parentElement;
  }

  function findActionContainer(anchor) {
    if (!anchor) {
      return null;
    }

    let node = anchor;

    for (let i = 0; i < 7 && node; i++) {
      const className =
        safeString(node.className);

      if (
        /grid|cards|actions|modules|dashboard/i.test(
          className
        )
      ) {
        return node;
      }

      node = node.parentElement;
    }

    return null;
  }

  function createInvestigationCenterDashboardCard() {
    const existing =
      document.querySelector(
        '[data-findme-investigation-center-card="true"]'
      );

    if (existing) {
      return;
    }

    const card =
      document.createElement('div');

    card.className =
      'findme-p5-card';

    card.dataset.findmeInvestigationCenterCard =
      'true';

    card.setAttribute(
      'data-admin-action',
      'investigation-center'
    );

    card.innerHTML = `
      <div class="findme-p5-card-icon">
        🔍
      </div>

      <h3>
        Investigation Center
      </h3>

      <p>
        Access Live Camera, Phone Camera Video,
        CCTV Video and AI Identification from
        one secure investigation workspace.
      </p>

      <button
        type="button"
        class="findme-p5-button"
        data-findme-open-investigation-center="true"
      >
        🔍 Open Investigation Center
      </button>
    `;

    const button =
      card.querySelector(
        '[data-findme-open-investigation-center]'
      );

    button?.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();

        app.renderAIIdentificationCenter();
      }
    );

    return card;
  }

  function cleanAdministratorDashboard() {
    const root = getRoot();

    if (!root) {
      return;
    }

    // The redesigned command dashboard owns its own bottom Investigation Center.
    if (root.querySelector('.fm-dashboard-professional')) {
      return;
    }

    /*
      Only operate when administrator dashboard
      content is actually present.
    */

    const actionNodes = [
      ...root.querySelectorAll(
        '[data-admin-action]'
      )
    ].filter(
      node =>
        !node.closest(
          '#findme-investigation-center-page'
        )
    );

    const targetActions = new Set([
      'live-camera',
      'phone-camera',
      'phone-camera-video',
      'cctv',
      'cctv-video',
      'ai-identification',
      'ai',
      'investigation-ai'
    ]);

    let anchor = null;
    let container = null;

    for (const node of actionNodes) {
      const action =
        normalize(
          node.getAttribute(
            'data-admin-action'
          )
        );

      if (!targetActions.has(action)) {
        continue;
      }

      if (!anchor) {
        anchor = node;
        container =
          findActionContainer(node);
      }

      const card =
        findDashboardCard(node);

      if (
        card &&
        card !== root &&
        !card.id?.includes(
          'findme-investigation-center'
        )
      ) {
        card.remove();
      } else {
        node.remove();
      }
    }

    /*
      Remove the older separate AI module card.
    */

    const aiModules = [
      ...root.querySelectorAll(
        '[data-admin-module]'
      )
    ];

    for (const node of aiModules) {
      if (
        node.closest(
          '#findme-investigation-center-page'
        )
      ) {
        continue;
      }

      const module =
        normalize(
          node.getAttribute(
            'data-admin-module'
          )
        );

      if (
        module === 'ai' ||
        module === 'ai-identification' ||
        module === 'investigation'
      ) {
        const card =
          findDashboardCard(node);

        if (
          card &&
          card !== root
        ) {
          card.remove();
        } else {
          node.remove();
        }
      }
    }

    /*
      Create ONE Investigation Center option.
    */

    if (
      root.querySelector(
        '[data-findme-investigation-center-card="true"]'
      )
    ) {
      return;
    }

    const centerCard =
      createInvestigationCenterDashboardCard();

    if (!centerCard) {
      return;
    }

    if (container) {
      container.appendChild(centerCard);
    } else if (anchor?.parentElement) {
      anchor.parentElement.appendChild(
        centerCard
      );
    } else {
      root.appendChild(centerCard);
    }
  }

  /* ============================================================
     DASHBOARD METHOD WRAPPING
     ============================================================ */

  function wrapDashboardMethod(name) {
    const original = app[name];

    if (
      typeof original !== 'function' ||
      original.__findmePart5Wrapped
    ) {
      return;
    }

    function wrappedDashboard(...args) {
      const result =
        original.apply(this, args);

      setTimeout(
        cleanAdministratorDashboard,
        0
      );

      setTimeout(
        cleanAdministratorDashboard,
        150
      );

      setTimeout(
        cleanAdministratorDashboard,
        500
      );

      return result;
    }

    wrappedDashboard.__findmePart5Wrapped =
      true;

    app[name] = wrappedDashboard;
  }

  wrapDashboardMethod(
    'renderAdministratorDashboard'
  );

  wrapDashboardMethod(
    'renderAdminDashboard'
  );

  wrapDashboardMethod(
    'openAdministratorDashboard'
  );

  wrapDashboardMethod(
    'showAdministratorDashboard'
  );

  /* ============================================================
     INVESTIGATION CENTER
     ============================================================ */

  app.renderAIIdentificationCenter =
    function () {
      if (!requireAdministrator()) {
        showToast(
          'Administrator access is required.',
          'error'
        );
        return;
      }

      const root = getRoot();

      root.innerHTML = `
        <section
          id="findme-investigation-center-page"
          class="findme-p5-page"
        >

          <button
            type="button"
            class="findme-p5-back"
            data-findme-investigation-back="true"
          >
            ← Back to Administrator Dashboard
          </button>

          <h1 class="findme-p5-title">
            🔍 Investigation Center
          </h1>

          <p class="findme-p5-subtitle">
            Secure administrator workspace for
            video-based and live-camera missing-person
            investigation.
          </p>

          <div class="findme-p5-center-banner">
            <strong>
              🛡️ Administrator Investigation Workspace
            </strong>

            Select an investigation method below.
            Phone Camera Video and CCTV Video only
            upload footage. AI Identification is the
            module that analyzes video and displays
            possible missing-person candidates.
          </div>

          <div class="findme-p5-grid">

            <!-- LIVE CAMERA -->

            <article class="findme-p5-card">

              <div class="findme-p5-card-icon">
                📷
              </div>

              <h3>
                Live Camera
              </h3>

              <p>
                Start the device camera and perform
                live investigation.
              </p>

              <button
                type="button"
                class="findme-p5-button"
                data-findme-investigation-option="live"
              >
                📷 Open Live Camera
              </button>

            </article>

            <!-- PHONE VIDEO -->

            <article class="findme-p5-card">

              <div class="findme-p5-card-icon">
                📱🎥
              </div>

              <h3>
                Phone Camera Video
              </h3>

              <p>
                Upload a video that was already
                recorded using a phone camera.
                This option stores the video only.
              </p>

              <button
                type="button"
                class="findme-p5-button"
                data-findme-investigation-option="phone"
              >
                📱 Open Phone Camera Video
              </button>

            </article>

            <!-- CCTV -->

            <article class="findme-p5-card">

              <div class="findme-p5-card-icon">
                🎦
              </div>

              <h3>
                CCTV Video
              </h3>

              <p>
                Upload CCTV footage for an
                administrator investigation.
                CCTV upload itself does not display
                AI results.
              </p>

              <button
                type="button"
                class="findme-p5-button"
                data-findme-investigation-option="cctv"
              >
                🎦 Open CCTV Video
              </button>

            </article>

            <!-- AI IDENTIFICATION -->

            <article class="findme-p5-card">

              <div class="findme-p5-card-icon">
                🤖
              </div>

              <h3>
                AI Identification
              </h3>

              <p>
                Analyze an investigation video using
                the AI face-matching pipeline and
                display possible missing-person
                candidates.
              </p>

              <button
                type="button"
                class="findme-p5-button"
                data-findme-investigation-option="ai"
              >
                🤖 Start AI Identification
              </button>

            </article>

          </div>

        </section>
      `;

      const back =
        root.querySelector(
          '[data-findme-investigation-back]'
        );

      back?.addEventListener(
        'click',
        () => {
          openAdminDashboard();
        }
      );

      root
        .querySelector(
          '[data-findme-investigation-option="live"]'
        )
        ?.addEventListener(
          'click',
          () => {
            app.renderAdministratorLiveCamera();
          }
        );

      root
        .querySelector(
          '[data-findme-investigation-option="phone"]'
        )
        ?.addEventListener(
          'click',
          () => {
            app.renderAdministratorPhoneCamera();
          }
        );

      root
        .querySelector(
          '[data-findme-investigation-option="cctv"]'
        )
        ?.addEventListener(
          'click',
          () => {
            app.renderAdministratorCCTV();
          }
        );

      root
        .querySelector(
          '[data-findme-investigation-option="ai"]'
        )
        ?.addEventListener(
          'click',
          () => {
            app.renderAIIdentification();
          }
        );
    };

  /* ============================================================
     LIVE CAMERA
     ============================================================ */

  app.renderAdministratorLiveCamera =
    function () {
      if (!requireAdministrator()) {
        showToast(
          'Administrator access is required.',
          'error'
        );
        return;
      }

      const root = getRoot();

      root.innerHTML = `
        <section class="findme-p5-page ${String(app.currentRole || '').toLowerCase().includes('admin') ? 'findme-p5-admin-surface' : 'findme-p5-citizen-surface'}">

          <button
            type="button"
            class="findme-p5-back"
            data-live-back="true"
          >
            ← Back to Investigation Center
          </button>

          <h1 class="findme-p5-title">
            📷 Live Camera
          </h1>

          <p class="findme-p5-subtitle">
            Start the device camera only when you
            explicitly choose to start it.
          </p>

          <div class="findme-p5-card">

            <div class="findme-p5-camera-wrap">
              <video
                id="findme-live-video"
                class="findme-p5-camera"
                autoplay
                playsinline
                muted
              ></video>
            </div>

            <div class="findme-p5-photo-actions">

              <button
                type="button"
                class="findme-p5-button"
                id="findme-start-live-camera"
              >
                📷 Start Live Camera
              </button>

              <button
                type="button"
                class="findme-p5-button secondary"
                id="findme-stop-live-camera"
              >
                ⏹ Stop Camera
              </button>

            </div>

            <div
              id="findme-live-status"
              class="findme-p5-status"
            >
              Camera is not running.
            </div>

          </div>

        </section>
      `;

      const back =
        root.querySelector(
          '[data-live-back]'
        );

      back?.addEventListener(
        'click',
        () => {
          app.renderAIIdentificationCenter();
        }
      );

      const video =
        root.querySelector(
          '#findme-live-video'
        );

      const status =
        root.querySelector(
          '#findme-live-status'
        );

      let stream = null;

      const startButton =
        root.querySelector(
          '#findme-start-live-camera'
        );

      const stopButton =
        root.querySelector(
          '#findme-stop-live-camera'
        );

      startButton?.addEventListener(
        'click',
        async () => {
          if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
          ) {
            status.textContent =
              'Camera access is not supported by this browser.';

            status.classList.add(
              'error'
            );

            return;
          }

          try {
            stream =
              await navigator.mediaDevices.getUserMedia(
                {
                  video: true,
                  audio: false
                }
              );

            video.srcObject = stream;

            status.textContent =
              '📷 Live camera is active.';

            status.classList.remove(
              'error'
            );

            status.classList.add(
              'success'
            );
          } catch (error) {
            console.error(
              'Find-Me live camera error:',
              error
            );

            status.textContent =
              'Unable to access the camera. Please allow camera permission.';

            status.classList.add(
              'error'
            );
          }
        }
      );

      stopButton?.addEventListener(
        'click',
        () => {
          if (stream) {
            stream
              .getTracks()
              .forEach(
                track =>
                  track.stop()
              );

            stream = null;
          }

          if (video) {
            video.srcObject = null;
          }

          status.textContent =
            'Camera stopped.';
        }
      );
    };

  app.openLiveCamera =
    function () {
      app.renderAdministratorLiveCamera();
    };

  /* ============================================================
     PHONE CAMERA VIDEO
     
     IMPORTANT:
     THIS DOES NOT CALL /api/videos/process
     
     It ONLY uploads/stores the recorded video.
     ============================================================ */

  app.renderAdministratorPhoneCamera =
    function () {
      if (!requireAdministrator()) {
        showToast(
          'Administrator access is required.',
          'error'
        );
        return;
      }

      const root = getRoot();

      root.innerHTML = `
        <section class="findme-p5-page">

          <button
            type="button"
            class="findme-p5-back"
            data-phone-back="true"
          >
            ← Back to Investigation Center
          </button>

          <h1 class="findme-p5-title">
            📱 Phone Camera Video
          </h1>

          <p class="findme-p5-subtitle">
            Upload a video that was already recorded
            using a phone camera. This page only
            uploads the video. AI analysis is performed
            from the separate AI Identification option.
          </p>

          <div class="findme-p5-card">

            <input
              id="findme-phone-video"
              class="findme-p5-file"
              type="file"
              accept="video/*"
            />

            <button
              type="button"
              class="findme-p5-button"
              id="findme-phone-upload"
            >
              📱 Upload Phone Video
            </button>

            <div
              id="findme-phone-status"
              class="findme-p5-status"
            >
              No video uploaded yet.
            </div>

          </div>

        </section>
      `;

      root
        .querySelector(
          '[data-phone-back]'
        )
        ?.addEventListener(
          'click',
          () => {
            app.renderAIIdentificationCenter();
          }
        );

      const input =
        root.querySelector(
          '#findme-phone-video'
        );

      const button =
        root.querySelector(
          '#findme-phone-upload'
        );

      const status =
        root.querySelector(
          '#findme-phone-status'
        );

      button?.addEventListener(
        'click',
        async () => {
          await uploadOnlyVideo(
            input,
            status,
            'phone-camera'
          );
        }
      );
    };

  app.openPhoneCameraVideo =
    function () {
      app.renderAdministratorPhoneCamera();
    };

  /* ============================================================
     CCTV VIDEO
     
     IMPORTANT:
     THIS DOES NOT CALL /api/videos/process
     
     It ONLY uploads/stores CCTV footage.
     ============================================================ */

  app.renderAdministratorCCTV =
    function () {
      if (!requireAdministrator()) {
        showToast(
          'Administrator access is required.',
          'error'
        );
        return;
      }

      const root = getRoot();

      root.innerHTML = `
        <section class="findme-p5-page">

          <button
            type="button"
            class="findme-p5-back"
            data-cctv-back="true"
          >
            ← Back to Investigation Center
          </button>

          <h1 class="findme-p5-title">
            🎦 CCTV Video
          </h1>

          <p class="findme-p5-subtitle">
            Upload CCTV footage. Uploading CCTV
            footage does not run AI analysis here.
            Use AI Identification when you are ready
            to analyze a video.
          </p>

          <div class="findme-p5-card">

            <input
              id="findme-cctv-video"
              class="findme-p5-file"
              type="file"
              accept="video/*"
            />

            <button
              type="button"
              class="findme-p5-button"
              id="findme-cctv-upload"
            >
              🎦 Upload CCTV Video
            </button>

            <div
              id="findme-cctv-status"
              class="findme-p5-status"
            >
              No CCTV video uploaded yet.
            </div>

          </div>

        </section>
      `;

      root
        .querySelector(
          '[data-cctv-back]'
        )
        ?.addEventListener(
          'click',
          () => {
            app.renderAIIdentificationCenter();
          }
        );

      const input =
        root.querySelector(
          '#findme-cctv-video'
        );

      const button =
        root.querySelector(
          '#findme-cctv-upload'
        );

      const status =
        root.querySelector(
          '#findme-cctv-status'
        );

      button?.addEventListener(
        'click',
        async () => {
          await uploadOnlyVideo(
            input,
            status,
            'cctv'
          );
        }
      );
    };

  app.openCCTVVideo =
    function () {
      app.renderAdministratorCCTV();
    };

  /* ============================================================
     UPLOAD-ONLY VIDEO FUNCTION
     
     Used ONLY by Phone Camera Video and CCTV.
     
     There is NO /api/videos/process here.
     ============================================================ */

  async function uploadOnlyVideo(
    input,
    status,
    source
  ) {
    if (!input?.files?.length) {
      status.textContent =
        'Please select a video first.';

      status.classList.add(
        'error'
      );

      return null;
    }

    const file =
      input.files[0];

    const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
    if (file.size > MAX_VIDEO_BYTES) {
      status.className = 'findme-p5-status error';
      status.textContent = 'Video exceeds the 1 GB upload limit.';
      input.value = '';
      return;
    }

    if (
      !file.type.startsWith(
        'video/'
      )
    ) {
      status.textContent =
        'Please select a valid video file.';

      status.classList.add(
        'error'
      );

      return null;
    }

    status.className =
      'findme-p5-status';

    status.textContent =
      'Uploading video...';

    try {
      const formData =
        new FormData();

      formData.append(
        'video',
        file
      );

      formData.append(
        'source',
        source
      );

      const response =
        await fetch(
          '/api/videos/upload',
          {
            method: 'POST',
            body: formData
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
          'Video upload failed.'
        );
      }

      const filename =
        data.filename ||
        data.file ||
        data.video ||
        file.name;

      saveInvestigationUpload({
        id:
          `INV-${Date.now()}`,
        filename,
        originalName:
          file.name,
        source,
        uploadedAt:
          new Date().toISOString()
      });

      status.className =
        'findme-p5-status success';

      status.innerHTML = `
        ✅ Video uploaded successfully.<br>
        <strong>
          ${escapeHTML(filename)}
        </strong>
        <br><br>
        Video has been stored.
        AI results will appear only in
        <strong>🤖 AI Identification</strong>.
      `;

      showToast(
        'Video uploaded successfully.',
        'success'
      );

      return {
        filename,
        source
      };
    } catch (error) {
      console.error(
        'Find-Me upload error:',
        error
      );

      status.className =
        'findme-p5-status error';

      status.textContent =
        error.message ||
        'Unable to upload the video.';

      showToast(
        error.message ||
        'Video upload failed.',
        'error'
      );

      return null;
    }
  }

  /* ============================================================
     AI IDENTIFICATION
     
     THIS IS THE ONLY VIDEO PAGE THAT:
     
       1. Uploads the video
       2. Calls /api/videos/process
       3. Displays AI investigation results
     ============================================================ */

  app.renderAIIdentification =
    function () {
      if (!requireAdministrator()) {
        showToast(
          'Administrator access is required.',
          'error'
        );
        return;
      }

      const root = getRoot();

      root.innerHTML = `
        <section class="findme-p5-page">

          <button
            type="button"
            class="findme-p5-back"
            data-ai-back="true"
          >
            ← Back to Investigation Center
          </button>

          <div class="findme-p5-role-banner">
            <span>SECURE INVESTIGATION WORKSPACE</span>
            <strong>AUTHORIZED ADMINISTRATOR</strong>
          </div>

          <h1 class="findme-p5-title">
            🤖 AI Identification
          </h1>

          <p class="findme-p5-subtitle">
            Upload an investigation video and let
            the AI face-matching pipeline compare
            detected faces against registered
            missing-person records.
          </p>

          <div class="findme-p5-card">

            <input
              id="findme-ai-video"
              class="findme-p5-file"
              type="file"
              accept="video/*"
            />

            <div class="findme-p5-form-grid" style="margin-top:16px;">
              <label>
                <span>📍 CCTV / Camera Location</span>
                <input id="findme-ai-location" class="findme-p5-input" type="text" placeholder="e.g. Kancheepuram Bus Stand" />
              </label>
              <label>
                <span>📅 Capture Date</span>
                <input id="findme-ai-date" class="findme-p5-input" type="date" />
              </label>
              <label>
                <span>🕒 Capture Time</span>
                <input id="findme-ai-time" class="findme-p5-input" type="time" />
              </label>
            </div>

            <div class="findme-p5-status" style="margin-top:12px;">
              <strong>Multi-Clue AI:</strong> Face 40% + Clothing 20% + Age 15% + Location 15% + Time 10%.
              These clues rank candidates for officer review; they do not confirm identity.
            </div>

            <button
              type="button"
              class="findme-p5-button"
              id="findme-ai-start"
            >
              🤖 Start AI Identification
            </button>

            <div
              id="findme-ai-status"
              class="findme-p5-status"
            >
              Select an investigation video.
            </div>

          </div>

          <div
            id="findme-ai-results"
            class="findme-p5-results"
          ></div>

        </section>
      `;

      root
        .querySelector(
          '[data-ai-back]'
        )
        ?.addEventListener(
          'click',
          () => {
            app.renderAIIdentificationCenter();
          }
        );

      const input =
        root.querySelector(
          '#findme-ai-video'
        );

      const locationInput = root.querySelector('#findme-ai-location');
      const dateInput = root.querySelector('#findme-ai-date');
      const timeInput = root.querySelector('#findme-ai-time');

      const button =
        root.querySelector(
          '#findme-ai-start'
        );

      const status =
        root.querySelector(
          '#findme-ai-status'
        );

      const results =
        root.querySelector(
          '#findme-ai-results'
        );

      button?.addEventListener(
        'click',
        async () => {
          await identifyVideo(
            input,
            status,
            results,
            locationInput,
            dateInput,
            timeInput
          );
        }
      );
    };

  app.renderAIIdentificationCenter =
    app.renderAIIdentificationCenter;

  /* ============================================================
     AI VIDEO IDENTIFICATION
     ============================================================ */

  function showV13AIProcessing(results, status) {
    if (!results) return;
    results.innerHTML = `
      <div class="fmv13-ai-processing" role="status" aria-live="polite">
        <div class="fmv13-processing-head">
          <div class="fmv13-ai-orb"><span>AI</span></div>
          <div><strong>Find-Me AI Investigation</strong><small id="fmv13-stage-text">Preparing secure video analysis…</small></div>
        </div>
        <div class="fmv13-pipeline" aria-label="AI processing stages">
          <div class="fmv13-stage active" data-stage="upload"><i>1</i><span>Secure Upload</span></div>
          <div class="fmv13-stage" data-stage="detect"><i>2</i><span>Face Detection</span></div>
          <div class="fmv13-stage" data-stage="extract"><i>3</i><span>Feature Extraction</span></div>
          <div class="fmv13-stage" data-stage="compare"><i>4</i><span>Candidate Matching</span></div>
          <div class="fmv13-stage" data-stage="clues"><i>5</i><span>Multi-Clue Analysis</span></div>
          <div class="fmv13-stage" data-stage="evidence"><i>6</i><span>Best Evidence</span></div>
        </div>
        <div class="fmv13-scan"><span></span></div>
        <div class="fmv13-processing-foot"><span class="fmv13-dot"></span><span id="fmv13-progress-text">AI engine is working…</span></div>
      </div>`;
    const stages=['upload','detect','extract','compare','clues','evidence'];
    const labels={upload:'Securing uploaded investigation video…',detect:'Detecting faces across sampled CCTV frames…',extract:'Extracting fast facial features…',compare:'Comparing faces against verified missing-person records…',clues:'Checking supporting location and time context…',evidence:'Preparing the original CCTV evidence for officer review…'};
    let idx=0;
    const advance=()=>{
      const stage=stages[idx];
      results.querySelectorAll('.fmv13-stage').forEach(el=>el.classList.toggle('active',el.dataset.stage===stage));
      results.querySelectorAll('.fmv13-stage').forEach((el,i)=>el.classList.toggle('done',i<idx));
      const text=results.querySelector('#fmv13-stage-text');
      if(text) text.textContent=labels[stage];
      const progress=results.querySelector('#fmv13-progress-text');
      if(progress) progress.textContent=`Stage ${idx+1} of ${stages.length} · AI evidence pipeline running…`;
      idx=(idx+1)%stages.length;
    };
    advance();
    const timer=setInterval(advance,1100);
    results._v13Timer=timer;
    status?.classList.add('fmv13-status-pulse');
  }

  function finishV13AIProcessing(results, status) {
    if (results?._v13Timer) { clearInterval(results._v13Timer); results._v13Timer=null; }
    status?.classList.remove('fmv13-status-pulse');
    results?.classList.add('fmv13-results-ready');
  }

  function addV20ForensicComparison(container, data, matches) {
    if (!container) return;
    const candidate = matches?.[0] || {};
    const reference = data?.best_candidate_photo || candidate.photo || '';
    const evidence = data?.best_candidate_evidence || candidate.captured_frame || '';
    if (!reference || !evidence) return;

    const panel = document.createElement('section');
    panel.className = 'fmv20-forensic-compare';
    panel.innerHTML = `
      <div class="fmv20-compare-head">
        <div><span>AI EVIDENCE COMPARISON</span><h3>Reference Photo vs CCTV Detection</h3><p>The CCTV evidence frame is compared with the registered missing-person photo. No face is visually highlighted.</p></div>
        <strong>AI candidate • officer review required</strong>
      </div>
      <div class="fmv20-compare-stage">
        <div class="fmv20-compare-card fmv20-reference"><small>REGISTERED PHOTO</small><div class="fmv20-photo-wrap"><img src="${escapeHTML(reference)}" alt="Registered missing-person photo"></div><b>Missing-person reference</b></div>
        <div class="fmv20-compare-beam"><i></i><span>AI</span><i></i></div>
        <div class="fmv20-compare-card fmv20-evidence"><small>CCTV EVIDENCE</small><div class="fmv20-photo-wrap"><img src="${escapeHTML(evidence)}" alt="CCTV evidence"></div><b>Detected candidate</b></div>
      </div>
      <div class="fmv20-compare-footer"><span>◉ Face evidence</span><span>◉ Multi-clue context</span><span>◉ Human verification</span></div>`;
    container.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add('is-visible'));
  }

  function animateV13Results(container) {
    if (!container) return;
    container.classList.add('fmv13-result-shell');
    container.querySelectorAll('.findme-p5-stat').forEach((card,i)=>{
      card.style.setProperty('--v13-delay', `${i*70}ms`);
      card.classList.add('fmv13-reveal-card');
      const value=card.querySelector('.findme-p5-stat-value');
      if(value){
        const raw=value.textContent.trim();
        const n=Number(raw.replace(/[^0-9.\-]/g,''));
        if(Number.isFinite(n) && raw && !raw.includes('%')){
          const start=0, duration=650, t0=performance.now();
          const tick=(now)=>{ const p=Math.min(1,(now-t0)/duration); const eased=1-Math.pow(1-p,3); value.textContent=String(Math.round(start+(n-start)*eased)); if(p<1) requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        }
      }
    });
    container.querySelectorAll('.findme-p5-match').forEach((card,i)=>{ card.style.setProperty('--v13-delay',`${i*130}ms`); card.classList.add('fmv13-match-enter'); });
    container.querySelectorAll('.findme-p5-match-row').forEach((row,i)=>{ row.style.setProperty('--v13-delay',`${Math.min(i,12)*45}ms`); row.classList.add('fmv13-row-enter'); });
    container.querySelectorAll('.findme-p5-match-value').forEach(value=>{ const txt=value.textContent.trim(); const m=txt.match(/([0-9]+(?:\.[0-9]+)?)%/); if(!m)return; const n=Number(m[1]); if(!Number.isFinite(n))return; const bar=document.createElement('span'); bar.className='fmv13-inline-meter'; bar.innerHTML='<i></i>'; bar.querySelector('i').style.setProperty('--v13-score',`${Math.max(0,Math.min(100,n))}%`); value.appendChild(bar); });
    container.querySelectorAll('img').forEach((img,i)=>{img.classList.add('fmv13-evidence-reveal'); img.style.setProperty('--v13-delay',`${i*90}ms`);});
  }

  async function identifyVideo(
    input,
    status,
    results,
    locationInput,
    dateInput,
    timeInput
  ) {
    if (!input?.files?.length) {
      status.className =
        'findme-p5-status error';

      status.textContent =
        'Please select an investigation video first.';

      return;
    }

    const file =
      input.files[0];

    if (
      !file.type.startsWith(
        'video/'
      )
    ) {
      status.className =
        'findme-p5-status error';

      status.textContent =
        'Please select a valid video file.';

      return;
    }

    status.className =
      'findme-p5-status';

    status.textContent =
      '⏳ Uploading investigation video...';

    results.innerHTML = '';

    try {
      /* --------------------------------------------------------
         STEP 1 — UPLOAD
         -------------------------------------------------------- */

      const formData =
        new FormData();

      formData.append(
        'video',
        file
      );

      formData.append(
        'source',
        'ai-identification'
      );
      formData.append('camera_location', locationInput?.value?.trim() || '');
      formData.append('capture_date', dateInput?.value || '');
      formData.append('capture_time', timeInput?.value || '');

      const uploadResponse =
        await fetch(
          '/api/videos/upload',
          {
            method: 'POST',
            body: formData
          }
        );

      const uploadData =
        await uploadResponse.json();

      if (
        !uploadResponse.ok ||
        uploadData.success === false
      ) {
        throw new Error(
          uploadData.message ||
          'Unable to upload investigation video.'
        );
      }

      const filename =
        uploadData.filename ||
        uploadData.file ||
        uploadData.video;

      if (!filename) {
        throw new Error(
          'The video upload service did not return a filename.'
        );
      }

      status.textContent =
        '🤖 Video uploaded. Starting AI analysis...';
      showV13AIProcessing(results, status);

      /* --------------------------------------------------------
         STEP 2 — AI PROCESSING
         
         THIS STARTS THE BACKGROUND AI JOB.
         The browser polls /api/videos/process-status until complete.
         -------------------------------------------------------- */

      const processResponse =
        await fetch(
          '/api/videos/process-async',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify({
              filename,
              camera_location: locationInput?.value?.trim() || '',
              capture_date: dateInput?.value || '',
              capture_time: timeInput?.value || ''
            })
          }
        );

      const processData =
        await processResponse.json();

      if (
        !processResponse.ok ||
        processData.success === false ||
        !processData.job_id
      ) {
        throw new Error(
          processData.message ||
          'Unable to start AI video processing.'
        );
      }

      status.textContent =
        '🤖 AI analysis is running in the background. You can keep this page open while the evidence pipeline works.';

      const jobId = processData.job_id;
      let result = null;

      // Polling keeps each browser request short. A long CCTV video can take
      // several minutes on a CPU-only laptop because FaceNet is evaluated for
      // sampled face observations. The browser no longer waits on one
      // long-running fetch connection.
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 1800));

        const pollResponse =
          await fetch(
            `/api/videos/process-status/${encodeURIComponent(jobId)}`,
            {
              method: 'GET',
              cache: 'no-store'
            }
          );

        const pollData =
          await pollResponse.json();

        if (!pollResponse.ok || pollData.success === false) {
          throw new Error(
            pollData.message ||
            'Unable to read AI processing status.'
          );
        }

        const elapsed =
          Number(pollData.elapsed_seconds || 0);

        if (pollData.status === 'queued') {
          status.textContent =
            '🤖 AI analysis is queued securely…';
          continue;
        }

        if (pollData.status === 'processing') {
          status.textContent =
            `🤖 AI analysis is running… ${elapsed.toFixed(0)}s elapsed. Long CCTV videos are processed at an adaptive sampling rate.`;
          continue;
        }

        if (pollData.status === 'failed') {
          throw new Error(
            pollData.message ||
            'AI video processing failed.'
          );
        }

        if (pollData.status === 'completed') {
          result = pollData.result;
          break;
        }
      }

      if (!result || result.success === false) {
        throw new Error(
          result?.message ||
          'AI video processing failed.'
        );
      }

      status.className =
        'findme-p5-status success';

      status.textContent =
        `✅ AI processing completed in ${Number(result.processing_seconds || 0).toFixed(1)}s. ${Number(result.realtime_ratio || 0) >= 1 ? 'Near real-time screening.' : 'Fast-screening mode completed.'}`;

      finishV13AIProcessing(results, status);
      renderAIResults(
        result,
        results
      );
      animateV13Results(results);
    } catch (error) {
      if (results?._v13Timer) { clearInterval(results._v13Timer); results._v13Timer=null; }
      console.error(
        'Find-Me AI identification error:',
        error
      );

      status.className =
        'findme-p5-status error';

      status.textContent =
        error.message ||
        'AI identification failed.';
    }
  }

  /* ============================================================
     AI RESULT EXTRACTION
     ============================================================ */

  function getResultArray(data) {
    // `matches` is backend-gated. `candidates` contains investigation-only
    // observations and must never be rendered as identity matches.
    const arrays = [
      data?.matches,
      data?.possible_matches
    ];

    for (const value of arrays) {
      if (Array.isArray(value)) {
        // V9 candidate aggregation: the backend returns one row per unique
        // missing person/case and keeps repeated observations underneath it.
        if (value.length && value[0] && value[0].best_overall_score !== undefined) {
          return value.map(candidate => ({
            ...candidate,
            similarity: candidate.best_face_similarity,
            overall_score: candidate.best_overall_score,
            score_breakdown: candidate.best_score_breakdown || {},
            captured_frame: candidate.best_evidence,
            frame_number: candidate.best_frame,
            timestamp_seconds: candidate.best_timestamp_seconds,
            supporting_detections: candidate.detection_count,
            repeated_observations: candidate.repeated_observations
          }));
        }
        return value;
      }
    }

    return [];
  }

  function getNumberValue(
    data,
    keys
  ) {
    for (const key of keys) {
      if (
        data &&
        data[key] !== undefined &&
        data[key] !== null
      ) {
        const number =
          Number(data[key]);

        if (
          Number.isFinite(number)
        ) {
          return number;
        }
      }
    }

    return null;
  }

  function getSimilarity(match) {
    const value =
      getNumberValue(
        match,
        [
          'similarity',
          'similarityScore',
          'similarity_score',
          'confidence',
          'confidenceScore',
          'score',
          'matchScore'
        ]
      );

    if (value === null) {
      return null;
    }

    if (
      value >= 0 &&
      value <= 1
    ) {
      return value * 100;
    }

    return value;
  }

  function formatPercent(value) {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(
        Number(value)
      )
    ) {
      return 'Not provided';
    }

    return (
      Number(value).toFixed(2) +
      '%'
    );
  }

  function getMatchName(match) {
    return (
      match?.name ||
      match?.person_name ||
      match?.personName ||
      match?.missing_person_name ||
      match?.missingPersonName ||
      match?.best_match?.name ||
      match?.best_match?.person_name ||
      'Unknown person'
    );
  }

  function getCaseId(match) {
    return (
      match?.case_id ??
      match?.caseId ??
      match?.missing_person_id ??
      match?.missingPersonId ??
      match?.person_id ??
      match?.personId ??
      match?.best_match?.case_id ??
      match?.best_match?.caseId ??
      match?.best_match?.missing_person_id ??
      'Not provided'
    );
  }

  function getFrame(match) {
    return (
      match?.frame ||
      match?.frameNumber ||
      match?.frame_number ||
      match?.frameIndex ||
      match?.frame_index ||
      match?.frame_filename ||
      'Not provided'
    );
  }

  function getMatchResult(match) {
    return (
      match?.result ||
      match?.status ||
      match?.match_result ||
      match?.best_match?.result ||
      'unknown'
    );
  }

  /* ============================================================
     AI RESULTS RENDERING
     ============================================================ */

  function renderAIResults(
    data,
    container
  ) {
    const matches =
      getResultArray(data);

    const totalFrames =
      getNumberValue(
        data,
        [
          'total_frames',
          'totalFrames'
        ]
      );

    const framesExtracted =
      getNumberValue(
        data,
        [
          'frames_extracted',
          'framesExtracted',
          'processed_frames',
          'processedFrames'
        ]
      );

    const framesWithFaces =
      getNumberValue(
        data,
        [
          'frames_with_faces',
          'framesWithFaces'
        ]
      );

    const facesDetected =
      getNumberValue(
        data,
        [
          'faces_detected',
          'facesDetected',
          'total_faces',
          'totalFaces'
        ]
      );

    const matchesFound =
      getNumberValue(
        data,
        [
          'matches_found',
          'matchesFound'
        ]
      );

    let html = `
      <h2>
        🔎 AI Investigation Results
      </h2>

      <div class="findme-p5-stat-grid">

        <div class="findme-p5-stat">
          <div class="findme-p5-stat-label">
            Total Frames
          </div>

          <div class="findme-p5-stat-value">
            ${
              totalFrames ??
              'Not provided'
            }
          </div>
        </div>

        <div class="findme-p5-stat">
          <div class="findme-p5-stat-label">
            Frames Extracted
          </div>

          <div class="findme-p5-stat-value">
            ${
              framesExtracted ??
              'Not provided'
            }
          </div>
        </div>

        <div class="findme-p5-stat">
          <div class="findme-p5-stat-label">
            Frames With Faces
          </div>

          <div class="findme-p5-stat-value">
            ${
              framesWithFaces ??
              'Not provided'
            }
          </div>
        </div>

        <div class="findme-p5-stat">
          <div class="findme-p5-stat-label">
            Possible Match Observations
          </div>

          <div class="findme-p5-stat-value">
            ${
              matchesFound ??
              matches.length
            }
          </div>
        </div>

        <div class="findme-p5-stat">
          <div class="findme-p5-stat-label">
            Unique Possible-Match Candidates
          </div>

          <div class="findme-p5-stat-value">
            ${data?.unique_candidates ?? matches.length}
          </div>
        </div>

        <div class="findme-p5-stat">
          <div class="findme-p5-stat-label">
            Candidates Screened
          </div>

          <div class="findme-p5-stat-value">
            ${data?.candidates_screened ?? data?.unique_candidates ?? matches.length}
          </div>
        </div>

      </div>
    `;

    if (
      facesDetected !== null
    ) {
      html += `
        <div class="findme-p5-status">
          👤 Face Observations:
          <strong>
            ${facesDetected}
          </strong>
          <br>
          <span style="font-size:12px;color:#64748b;">
            Same people across sampled frames are grouped into face tracks.
            Estimated unique people: <strong>${data?.unique_face_tracks ?? '—'}</strong>.
          </span>
        </div>
      `;
    }

    /*
      IMPORTANT:
      AI candidate != confirmed identity.
    */

    if (
      matches.length === 0
    ) {
      html += `
        <div class="findme-p5-status">
          🤖 AI processing completed.

          <br><br>

          No candidate crossed the configured possible-match gate.
          The AI may still have analyzed visually similar candidates,
          but they are not treated as possible matches until the evidence
          criteria are met.

          <br><br>

          <strong>
            No identity has been confirmed.
          </strong>

          ${
            data?.best_similarity !== undefined && data?.best_similarity !== null
              ? `<br><br><strong>Closest face-embedding score (not an identity match):</strong> ${formatPercent(data.best_similarity)}`
              : ''
          }

          ${(Array.isArray(data?.candidate_analysis) && data.candidate_analysis.length) ? `
            <div class="findme-p5-status" style="margin-top:14px;">
              <strong>🔎 Candidates Screened</strong>
              <div style="margin-top:10px;display:grid;gap:8px;">
                ${data.candidate_analysis.slice(0, 5).map(candidate => `
                  <div style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
                    <strong>Unconfirmed face candidate</strong>
                    <span style="float:right;font-weight:800;">${formatPercent(candidate.best_face_similarity)}</span>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">${candidate.observation_count || 0} observation(s) • retained for investigation history only</div>
                    <div style="font-size:12px;color:#92400e;margin-top:5px;">Not promoted to a possible match. The snapshot is retained for officer investigation.</div>
                  </div>`).join('')}
              </div>
            </div>` : ''}

          ${data?.best_candidate_score != null ? `
            <div class="findme-p5-status" style="margin-top:14px;">
              <strong>🟡 POSSIBLE MATCH — OFFICER REVIEW</strong>
              <br><strong>${escapeHTML(data.best_candidate_person || 'Unconfirmed candidate')}</strong>
              ${data.best_candidate_missing_person_id ? `<br>Case ID: ${escapeHTML(data.best_candidate_missing_person_id)}` : ''}
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Face similarity (40%)</span><span class="findme-p5-match-value">${formatPercent(data.best_candidate_breakdown?.face_similarity)}</span></div>
              ${data.best_candidate_breakdown?.efficientnet_b0_visual_similarity != null ? `<div class="findme-p5-match-row"><span class="findme-p5-match-label">EfficientNet-B0 visual corroboration</span><span class="findme-p5-match-value">${formatPercent(data.best_candidate_breakdown.efficientnet_b0_visual_similarity)}</span></div>` : ""}
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Clothing similarity (20%)</span><span class="findme-p5-match-value">${formatPercent(data.best_candidate_breakdown?.clothing_similarity)}</span></div>
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Age clue (15%, supporting only)</span><span class="findme-p5-match-value">${formatPercent(data.best_candidate_breakdown?.age_compatibility)}</span></div>
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Location relevance (15%)</span><span class="findme-p5-match-value">${formatPercent(data.best_candidate_breakdown?.location_relevance)}</span></div>
              <div class="findme-p5-context-note">📍 ${escapeHTML(data.best_candidate_breakdown?.location_context || 'Location is treated as movement context, not a hard identity filter.')}</div>
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Time relevance (10%)</span><span class="findme-p5-match-value">${formatPercent(data.best_candidate_breakdown?.time_relevance)}</span></div>
              <div class="findme-p5-context-note">👕 ${escapeHTML(data.best_candidate_breakdown?.clothing_context || 'Clothing is supporting evidence and may change between sightings.')}</div>
              <div class="findme-p5-match-row"><span class="findme-p5-match-label"><strong>Overall candidate score</strong></span><span class="findme-p5-match-value"><strong>${formatPercent(data.best_candidate_score)}</strong></span></div>
              ${data.best_candidate_breakdown?.estimated_video_age != null ? `<div class="findme-p5-match-row"><span class="findme-p5-match-label">Estimated video age</span><span class="findme-p5-match-value">${escapeHTML(String(data.best_candidate_breakdown.estimated_video_age))} years</span></div>` : ''}
              ${data.best_candidate_evidence ? `<div style="margin-top:12px;"><strong>📸 Evidence Snapshot</strong><br><img src="${escapeHTML(data.best_candidate_evidence)}" alt="AI evidence snapshot" loading="lazy" style="max-width:100%;border-radius:12px;margin-top:8px;display:block;" onerror="this.closest('div').innerHTML='<strong>📸 Evidence Snapshot</strong><div style=\"font-size:12px;color:#92400e;margin-top:6px;\">Evidence file could not be loaded.</div>'"></div>` : ''}
              <br><span>🟡 This is an AI-generated lead for officer review. No identity has been confirmed.</span>
            </div>` : ''}
        </div>
      `;

      if (window.FindMeV11 && (app.currentRole === 'administrator' || app.currentRole === 'admin')) {
        const historyCase = data?.best_candidate_complaint_id || data?.candidate_analysis?.[0]?.complaint_id || '';
        html += `<div class=\"findme-p5-history-cta\"><div><strong>🕘 Investigation saved</strong><span>Your AI investigation remains available after closing this window.</span></div><button type=\"button\" id=\"findme-open-investigation-history\">Open Investigation History</button></div>`;
      }

      container.innerHTML =
        html;

      if (window.FindMeV11) {
        const historyBtn = container.querySelector('#findme-open-investigation-history');
        historyBtn?.addEventListener('click', () => window.FindMeV11.open((data?.best_candidate_complaint_id || data?.candidate_analysis?.[0]?.complaint_id || undefined)));
      }

      console.log(
        'Find-Me AI raw response:',
        data
      );

      return;
    }

    html += `
      <div class="findme-p5-status">
        🛡️
        <strong>
          Verification Required
        </strong>

        <br>

        AI results are candidates only.
        Administrator verification is required
        before an identity can be confirmed.
      </div>
    `;

    matches.forEach(
      (match, index) => {
        const similarity =
          getSimilarity(match);

        const resultType =
          normalize(
            getMatchResult(match)
          );

        const overallScore = getNumberValue(match, ['overall_score', 'overallScore', 'candidate_score', 'candidateScore']) ?? similarity;

        let reliability =
          'Candidate';

        if (
          resultType.includes(
            'high'
          )
        ) {
          reliability =
            'High Similarity Candidate';
        } else if (
          resultType.includes(
            'possible'
          )
        ) {
          reliability =
            'Possible Match';
        } else if (
          resultType.includes(
            'low'
          )
        ) {
          reliability =
            'Low Similarity — Not Reliable';
        } else if (
          overallScore !== null
        ) {
          if (
            overallScore >= 70
          ) {
            reliability =
              'High Similarity Candidate';
          } else if (
            overallScore >= 62
          ) {
            reliability =
              'Possible Match';
          } else {
            reliability =
              'Low Similarity — Not Reliable';
          }
        }

        html += `
          <article class="findme-p5-match">

            <h3>
              🟡 POSSIBLE MATCH #${index + 1}
            </h3>

            <div class="findme-p5-match-row">
              <span class="findme-p5-match-label">
                Person Name
              </span>

              <span class="findme-p5-match-value">
                ${escapeHTML(
                  getMatchName(match)
                )}
              </span>
            </div>

            <div class="findme-p5-match-row">
              <span class="findme-p5-match-label">
                Case ID
              </span>

              <span class="findme-p5-match-value">
                ${escapeHTML(
                  getCaseId(match)
                )}
              </span>
            </div>

            <div class="findme-p5-match-row">
              <span class="findme-p5-match-label">
                Similarity
              </span>

              <span class="findme-p5-match-value">
                ${formatPercent(
                  similarity
                )}
              </span>
            </div>

            <div class="findme-p5-match-row">
              <span class="findme-p5-match-label">
                Overall Candidate Score
              </span>

              <span class="findme-p5-match-value">
                ${formatPercent(getNumberValue(match, ['overall_score', 'overallScore', 'candidate_score', 'candidateScore']))}
              </span>
            </div>

            <div class="findme-p5-status" style="margin-top:12px;">
              <strong>🧠 Explainable Multi-Clue Score</strong>
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Face similarity (40%)</span><span class="findme-p5-match-value">${formatPercent(match?.score_breakdown?.face_similarity)}</span></div>
              ${match?.score_breakdown?.efficientnet_b0_visual_similarity != null ? `<div class="findme-p5-match-row"><span class="findme-p5-match-label">EfficientNet-B0 visual corroboration</span><span class="findme-p5-match-value">${formatPercent(match.score_breakdown.efficientnet_b0_visual_similarity)}</span></div>` : ""}
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Clothing similarity (20%)</span><span class="findme-p5-match-value">${formatPercent(match?.score_breakdown?.clothing_similarity)}</span></div>
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Age clue (15%, supporting only)</span><span class="findme-p5-match-value">${formatPercent(match?.score_breakdown?.age_compatibility)}</span></div>
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Location relevance (15%)</span><span class="findme-p5-match-value">${formatPercent(match?.score_breakdown?.location_relevance)}</span></div>
              <div class="findme-p5-context-note">📍 ${escapeHTML(match?.score_breakdown?.location_context || 'Different locations can represent movement and are not an automatic rejection.')}</div>
              <div class="findme-p5-match-row"><span class="findme-p5-match-label">Time relevance (10%)</span><span class="findme-p5-match-value">${formatPercent(match?.score_breakdown?.time_relevance)}</span></div>
              <div class="findme-p5-context-note">👕 ${escapeHTML(match?.score_breakdown?.clothing_context || 'Clothing is a supporting clue and can change between sightings.')}</div>
              ${match?.estimated_video_age != null ? `<div class="findme-p5-match-row"><span class="findme-p5-match-label">Estimated video age</span><span class="findme-p5-match-value">${escapeHTML(String(match.estimated_video_age))} years</span></div>` : ''}
            </div>

            <div class="findme-p5-match-row">
              <span class="findme-p5-match-label">
                Confidence
              </span>

              <span class="findme-p5-match-value">
                ${formatPercent(
                  similarity
                )}
              </span>
            </div>

            <div class="findme-p5-match-row">
              <span class="findme-p5-match-label">
                Frame
              </span>

              <span class="findme-p5-match-value">
                ${escapeHTML(
                  getFrame(match)
                )}
              </span>
            </div>

            <div class="findme-p5-match-row">
              <span class="findme-p5-match-label">
                Repeated Observations
              </span>
              <span class="findme-p5-match-value">
                ${escapeHTML(String(match.repeated_observations ?? match.supporting_detections ?? 1))}
              </span>
            </div>

            <div class="findme-p5-match-row">
              <span class="findme-p5-match-label">
                Detections in Current Video
              </span>
              <span class="findme-p5-match-value">
                ${escapeHTML(String(match.supporting_detections ?? 1))}
              </span>
            </div>

            ${match.captured_frame ? `<div style="margin-top:12px;"><strong>📸 Best Evidence Snapshot</strong><br><img src="${escapeHTML(match.captured_frame)}" alt="Best candidate evidence" style="max-width:100%;border-radius:12px;margin-top:8px;"></div>` : ''}

            <div class="findme-p5-match-row">
              <span class="findme-p5-match-label">
                AI Assessment
              </span>

              <span class="findme-p5-match-value">
                ${escapeHTML(
                  reliability
                )}
              </span>
            </div>

            <div class="findme-p5-status">
              ⚠️
              This is an AI-generated candidate.
              It must NOT be treated as a confirmed
              missing-person identification until
              authorized personnel verify the case.
            </div>

          </article>
        `;
      }
    );

    if (window.FindMeV11 && (app.currentRole === 'administrator' || app.currentRole === 'admin')) {
      const historyCase = getCaseId(matches[0]) || '';
      html += `<div class=\"findme-p5-history-cta\"><div><strong>🕘 Investigation saved</strong><span>Close AI Identification anytime — the investigation history stays in the database.</span></div><button type=\"button\" id=\"findme-open-investigation-history\">Open Investigation History</button></div>`;
    }

    container.innerHTML =
      html;

    if (window.FindMeV11) {
      const historyBtn = container.querySelector('#findme-open-investigation-history');
      historyBtn?.addEventListener('click', () => window.FindMeV11.open(getCaseId(matches[0]) || undefined));
    }

    addV20ForensicComparison(container, data, matches);
    console.log(
      'Find-Me AI raw response:',
      data
    );
  }

  /* ============================================================
     FULL PHOTO PREVIEW
     ============================================================ */

  function getCasePhoto(caseData) {
    if (!caseData) {
      return '';
    }

    return (
      caseData.photo ||
      caseData.photoData ||
      caseData.photoDataURL ||
      caseData.image ||
      caseData.imageData ||
      caseData.referencePhoto ||
      caseData.referenceImage ||
      caseData.missingPersonPhoto ||
      caseData.missingPersonImage ||
      ''
    );
  }

  function openFullPhotoPreview(
    photo,
    personName = 'Missing Person'
  ) {
    if (!photo) {
      showToast(
        'No photo is available for this case.',
        'error'
      );
      return;
    }

    const existing =
      document.querySelector(
        '.findme-p5-photo-modal'
      );

    if (existing) {
      existing.remove();
    }

    const modal =
      document.createElement('div');

    modal.className =
      'findme-p5-photo-modal';

    modal.innerHTML = `
      <div
        class="findme-p5-photo-modal-inner"
        role="dialog"
        aria-modal="true"
        aria-label="Full photo preview"
      >

        <button
          type="button"
          class="findme-p5-photo-close"
          data-photo-close="true"
          aria-label="Close photo preview"
        >
          ×
        </button>

        <div class="findme-p5-photo-modal-title">
          🖼️ Full Photo Preview —
          ${escapeHTML(personName)}
        </div>

        <div class="findme-p5-photo-modal-image-wrap">
          <img
            class="findme-p5-photo-modal-image"
            src="${escapeHTML(photo)}"
            alt="Full missing-person photo"
          />
        </div>

      </div>
    `;

    document.body.appendChild(
      modal
    );

    const close =
      () => {
        modal.remove();
      };

    modal
      .querySelector(
        '[data-photo-close]'
      )
      ?.addEventListener(
        'click',
        close
      );

    modal.addEventListener(
      'click',
      event => {
        if (
          event.target === modal
        ) {
          close();
        }
      }
    );

    document.addEventListener(
      'keydown',
      function handlePhotoEscape(
        event
      ) {
        if (
          event.key === 'Escape'
        ) {
          close();

          document.removeEventListener(
            'keydown',
            handlePhotoEscape
          );
        }
      }
    );
  }

  app.previewMissingPersonPhoto =
    function (
      photo,
      personName
    ) {
      openFullPhotoPreview(
        photo,
        personName
      );
    };

  /* ============================================================
     IMPROVE CASE DETAIL PHOTO DISPLAY
     
     If Part 3/another module already renders a case detail,
     this helper can be called from there.
     ============================================================ */

  app.renderFullCasePhoto =
    function (
      caseData
    ) {
      const photo =
        getCasePhoto(
          caseData
        );

      const personName =
        caseData?.name ||
        caseData?.personName ||
        caseData?.missingPersonName ||
        'Missing Person';

      if (!photo) {
        return `
          <div class="findme-p5-status">
            🖼️ No reference photo available.
          </div>
        `;
      }

      return `
        <div>

          <div class="findme-p5-photo-container">

            <img
              src="${escapeHTML(photo)}"
              alt="Full photo of ${escapeHTML(personName)}"
              class="findme-p5-full-photo"
            />

          </div>

          <div class="findme-p5-photo-actions">

            <button
              type="button"
              class="findme-p5-button secondary"
              data-findme-preview-photo="true"
            >
              🖼️ Preview Full Photo
            </button>

          </div>

        </div>
      `;
    };

  /* ============================================================
     CASE PHOTO PREVIEW EVENT HELPER
     
     Part 3 can use:
     
       app.attachCasePhotoPreview(container, caseData)
     
     ============================================================ */

  app.attachCasePhotoPreview =
    function (
      container,
      caseData
    ) {
      if (!container) {
        return;
      }

      const button =
        container.querySelector(
          '[data-findme-preview-photo]'
        );

      if (!button) {
        return;
      }

      const photo =
        getCasePhoto(
          caseData
        );

      const personName =
        caseData?.name ||
        caseData?.personName ||
        caseData?.missingPersonName ||
        'Missing Person';

      button.addEventListener(
        'click',
        () => {
          openFullPhotoPreview(
            photo,
            personName
          );
        }
      );
    };

  /* ============================================================
     CASE DETAILS PHOTO AUTO-FIX
     
     This watches for case-detail content rendered by
     existing modules and ensures case-detail images
     are not cropped.
     ============================================================ */

  function improveExistingCasePhotos() {
    const root =
      getRoot();

    if (!root) {
      return;
    }

    const images =
      root.querySelectorAll(
        'img'
      );

    images.forEach(
      image => {
        const src =
          image.getAttribute(
            'src'
          );

        if (!src) {
          return;
        }

        /*
          Do not modify tiny icons/logos.
        */

        const width =
          image.width;

        const height =
          image.height;

        if (
          width <= 80 &&
          height <= 80
        ) {
          return;
        }

        /*
          Case/missing-person photos must show
          the entire image.
        */

        const alt =
          normalize(
            image.getAttribute(
              'alt'
            )
          );

        const className =
          normalize(
            image.className
          );

        if (
          alt.includes('missing') ||
          alt.includes('person') ||
          className.includes('photo') ||
          className.includes('image') ||
          image.closest(
            '[data-case-detail]',
          )
        ) {
          image.style.objectFit =
            'contain';

          image.style.objectPosition =
            'center center';

          image.style.maxWidth =
            '100%';

          image.style.maxHeight =
            '650px';
        }
      }
    );
  }

  /* ============================================================
     ADMINISTRATOR ACTION ROUTER
     
     The four investigation tools are routed through
     Investigation Center.

     The main dashboard therefore has ONLY:
     
       🔍 Investigation Center
     
     ============================================================ */

  const previousAdminAction =
    app.handleAdministratorAction;

  app.handleAdministratorAction =
    function (
      action,
      ...args
    ) {
      const key =
        normalize(action);

      if (
        key ===
          'investigation-center' ||
        key ===
          'investigation' ||
        key ===
          'investigation-center-page'
      ) {
        app.renderAIIdentificationCenter();
        return;
      }

      /*
        Legacy individual actions are redirected
        into the Investigation Center.
      */

      if (
        key === 'live-camera' ||
        key === 'phone-camera' ||
        key === 'phone-camera-video' ||
        key === 'cctv' ||
        key === 'cctv-video' ||
        key === 'ai' ||
        key === 'ai-identification' ||
        key === 'investigation-ai'
      ) {
        app.renderAIIdentificationCenter();
        return;
      }

      /*
        Preserve all other Part 3/Part 2
        administrator functionality.
      */

      if (
        typeof previousAdminAction ===
        'function'
      ) {
        return previousAdminAction.call(
          this,
          action,
          ...args
        );
      }

      console.warn(
        'Find-Me Part 5: unknown administrator action:',
        action
      );
    };

  /* ============================================================
     LEGACY ALIASES
     ============================================================ */

  app.showInvestigationCenter =
    function () {
      app.renderAIIdentificationCenter();
    };

  app.openInvestigationCenter =
    function () {
      app.renderAIIdentificationCenter();
    };

  app.openAIIdentification =
    function () {
      app.renderAIIdentificationCenter();
    };

  /* ============================================================
     PHOTO IMPROVEMENT AFTER ADMIN RENDER
     ============================================================ */

  const methodsToWatch = [
    'renderCaseDetails',
    'renderAdministratorCaseDetails',
    'renderAdminCaseDetails',
    'showCaseDetails',
    'openCaseDetails'
  ];

  methodsToWatch.forEach(
    methodName => {
      const original =
        app[methodName];

      if (
        typeof original !==
          'function' ||
        original.__findmePart5PhotoWrapped
      ) {
        return;
      }

      function wrapped(
        ...args
      ) {
        const result =
          original.apply(
            this,
            args
          );

        setTimeout(
          improveExistingCasePhotos,
          0
        );

        setTimeout(
          improveExistingCasePhotos,
          150
        );

        return result;
      }

      wrapped.__findmePart5PhotoWrapped =
        true;

      app[methodName] =
        wrapped;
    }
  );

  /* ============================================================
     STABLE MOTION COMPATIBILITY

     Older builds used a subtree MutationObserver here. That observer
     re-ran entrance animations whenever AI status text, counters, form
     fields or results changed, which caused visible blinking. The final
     motion controller at the end of this file handles page-level changes
     only, so no DOM-mutation animation is installed here.
     ============================================================ */

  /* ============================================================
     INITIAL DASHBOARD CLEANUP
     ============================================================ */

  setTimeout(
    cleanAdministratorDashboard,
    0
  );

  setTimeout(
    improveExistingCasePhotos,
    100
  );

  /* ============================================================
     PUBLIC PART 5 API
     ============================================================ */

  app.findmeInvestigationUploads =
    getInvestigationUploads;

  app.getCasePhotoForPreview =
    getCasePhoto;

  window.findMePart5 = {
    version: '5.2.0',
    renderInvestigationCenter:
      () =>
        app.renderAIIdentificationCenter(),
    renderLiveCamera:
      () =>
        app.renderAdministratorLiveCamera(),
    renderPhoneCameraVideo:
      () =>
        app.renderAdministratorPhoneCamera(),
    renderCCTV:
      () =>
        app.renderAdministratorCCTV(),
    renderAIIdentification:
      () =>
        app.renderAIIdentification(),
    previewFullPhoto:
      openFullPhotoPreview
  };

  console.log(
    'Find-Me Part 5 v5.2.0 loaded successfully.'
  );

})();


/* FINAL BUILD — stable role surfaces + purposeful page transitions.
   IMPORTANT: do not observe every DOM mutation. AI status text, form fields,
   counters and results update frequently; re-running page animations for those
   mutations caused the old upload/details card to blink. */
(function(){
  const root=document.getElementById('app');
  if(!root) return;
  let lastPageNode=null;
  function syncRole(){
    const role=String((window.findMeApp||window.app)?.currentRole||'').toLowerCase();
    root.classList.toggle('fm-role-admin',role.includes('admin'));
    root.classList.toggle('fm-role-citizen',role==='citizen');
  }
  function animatePageIfChanged(){
    syncRole();
    const page=root.firstElementChild;
    if(!page || page===lastPageNode) return;
    lastPageNode=page;
    page.classList.remove('fm-final-page-enter');
    void page.offsetWidth;
    page.classList.add('fm-final-page-enter');
  }
  syncRole();
  animatePageIfChanged();
  const observer=new MutationObserver(()=>requestAnimationFrame(animatePageIfChanged));
  observer.observe(root,{childList:true,subtree:false});
  setInterval(syncRole,1500);
})();
