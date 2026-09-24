/**
 * FINDME - Modular UI Component Renderers
 * Generates all views, modals, filters, and dynamic widgets.
 */

const Components = {
  // --- Public Citizen Sign In & Registration Interface ---
  renderPublicLoginGateway(state, publicAuthTab = 'login') {
    return `
      <div class="auth-gateway-wrapper">
        <header class="auth-gateway-header">
          <div class="brand-wrapper">
            <div class="emblem-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <path d="M11 8v6M8 11h6"></path>
              </svg>
            </div>
            <div class="brand-text">
              <h1 style="color:#fff">FINDME <span class="badge-in">INDIA</span></h1>
              <p style="color:#94a3b8">National Missing Persons Portal</p>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn btn-outline btn-sm" style="color:#f59e0b;border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.1)" onclick="App.setAuthGatewayMode('admin')" title="Restricted to authorized law enforcement and system administrators">
              🔒 Authorized Admin Sign In →
            </button>
          </div>
        </header>

        <div class="auth-gateway-body">
          <!-- Left Citizen Info Side -->
          <div class="auth-info-side">
            <div class="badge-official" style="align-self:flex-start;margin-bottom:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              PUBLIC CITIZEN SERVICES & MISSING PERSONS SEARCH
            </div>
            <h2>Reuniting Families with <span>AI Biometric Search</span></h2>
            <p>
              FINDME empowers citizens across India to search active missing person records, submit verified missing reports to law enforcement, and log sightings with instant AI facial recognition.
            </p>

            <div class="auth-features-list">
              <div class="auth-feature-item">
                <div class="feat-icon">🔍</div>
                <div><strong>Active National Directory:</strong> Real-time search across 28 States & 8 UTs.</div>
              </div>
              <div class="auth-feature-item">
                <div class="feat-icon">⚡</div>
                <div><strong>AI Sighting Analysis:</strong> Upload photos or CCTV stills to check facial landmarks.</div>
              </div>
              <div class="auth-feature-item">
                <div class="feat-icon">🔒</div>
                <div><strong>Strict Privacy Shield:</strong> Reporter contact info is completely hidden from the public.</div>
              </div>
              <div class="auth-feature-item">
                <div class="feat-icon">💬</div>
                <div><strong>Direct Case Messaging:</strong> Communicate securely with National Administrator Sujith.</div>
              </div>
            </div>
          </div>

          <!-- Right Public Auth Card -->
          <div class="auth-card-container">
            <div class="auth-card-tabs" style="grid-template-columns:1fr 1fr">
              <button class="auth-tab-btn ${publicAuthTab === 'login' ? 'active' : ''}" onclick="App.setPublicAuthTab('login')">
                <span>👤</span>
                <span>Public Citizen Sign In</span>
              </button>
              <button class="auth-tab-btn ${publicAuthTab === 'register' ? 'active' : ''}" onclick="App.setPublicAuthTab('register')">
                <span>📝</span>
                <span>Create Citizen Account</span>
              </button>
            </div>

            <div class="auth-card-content">
              ${publicAuthTab === 'login' ? `
                <div class="auth-form-title">Citizen Portal Sign In</div>
                <div class="auth-form-subtitle">Search active records, file missing reports, and monitor sightings</div>

                <form onsubmit="event.preventDefault(); App.handleGatewayLogin('public');">
                  <div class="form-group" style="margin-bottom:14px">
                    <label class="form-label">Email Address <span class="req">*</span></label>
                    <input type="email" id="gateway-email" class="form-control" placeholder="Email Address" value="" autocomplete="off" required />
                  </div>

                  <div class="form-group" style="margin-bottom:20px">
                    <label class="form-label">Password <span class="req">*</span></label>
                    <div style="position:relative;display:flex;align-items:center;">
                      <input type="password" id="gateway-password" class="form-control" placeholder="Password" required style="padding-right:42px" />
                      <button type="button" onclick="App.togglePasswordVisibility('gateway-password', this)" style="position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:16px;color:#64748b;padding:4px" title="Show / Hide Password">
                        👁️
                      </button>
                    </div>
                  </div>

                  <button type="submit" class="btn btn-primary btn-lg" style="width:100%">
                    Sign In to Public Portal →
                  </button>
                </form>
              ` : `
                <div class="auth-form-title">Create Citizen Account</div>
                <div class="auth-form-subtitle">Instant registration — open to all public citizens with no approval required</div>

                <form onsubmit="event.preventDefault(); App.handleGatewayRegister();">
                  <div class="form-group" style="margin-bottom:10px">
                    <label class="form-label">Full Legal Name <span class="req">*</span></label>
                    <input type="text" id="reg-name" class="form-control" placeholder="Full Legal Name" required />
                  </div>

                  <div class="form-group" style="margin-bottom:10px">
                    <label class="form-label">Email Address <span class="req">*</span></label>
                    <input type="email" id="reg-email" class="form-control" placeholder="Email Address" required />
                  </div>

                  <div class="form-group" style="margin-bottom:10px">
                    <label class="form-label">Mobile Phone Number (+91) <span class="req">*</span></label>
                    <input type="tel" id="reg-phone" class="form-control" placeholder="Mobile Phone Number" required />
                  </div>

                  <div class="form-group" style="margin-bottom:16px">
                    <label class="form-label">Create Secure Password <span class="req">*</span></label>
                    <div style="position:relative;display:flex;align-items:center;">
                      <input type="password" id="reg-password" class="form-control" placeholder="Password" required style="padding-right:42px" />
                      <button type="button" onclick="App.togglePasswordVisibility('reg-password', this)" style="position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:16px;color:#64748b;padding:4px" title="Show / Hide Password">
                        👁️
                      </button>
                    </div>
                  </div>

                  <button type="submit" class="btn btn-accent btn-lg" style="width:100%">
                    Create Account & Enter Portal →
                  </button>
                </form>
              `}
            </div>
          </div>
        </div>

        <footer class="footer-bottom" style="max-width:1200px;margin:0 auto;padding:16px 24px;border-top:1px solid rgba(255,255,255,0.1);color:#94a3b8;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <span>© 2026 FINDME Portal • Directorate of Law Enforcement & National Records</span>
          <a href="javascript:void(0)" onclick="App.setAuthGatewayMode('admin')" style="color:#f59e0b;font-weight:600;text-decoration:none">
            🔒 Authorized Police & Admin Portal Access →
          </a>
        </footer>
      </div>
    `;
  },

  // --- Dedicated Authorized Admin & Police Sign-In Interface ---
  renderAdminLoginGateway(state) {
    return `
      <div class="auth-gateway-wrapper admin-auth-theme" style="background:#050b14">
        <header class="auth-gateway-header" style="border-bottom:1px solid rgba(245,158,11,0.25)">
          <div class="brand-wrapper">
            <div class="emblem-logo" style="background:linear-gradient(135deg, #d97706, #b45309)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div class="brand-text">
              <h1 style="color:#fff">FINDME <span style="color:#f59e0b;font-size:12px;letter-spacing:1px;border:1px solid #f59e0b;padding:1px 6px;border-radius:4px;vertical-align:middle">ADMIN COMMAND</span></h1>
              <p style="color:#f59e0b">Directorate of Law Enforcement & National Crime Records</p>
            </div>
          </div>

          <div>
            <button class="btn btn-outline btn-sm" style="color:#cbd5e1;border-color:rgba(255,255,255,0.2)" onclick="App.setAuthGatewayMode('public')">
              ← Return to Public Portal
            </button>
          </div>
        </header>

        <div class="auth-gateway-body">
          <!-- Left Admin Info Side -->
          <div class="auth-info-side">
            <div class="badge-official" style="align-self:flex-start;margin-bottom:0;background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.4);color:#fbbf24">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              RESTRICTED ACCESS • AUTHORIZED LAW ENFORCEMENT & ADMINS ONLY
            </div>
            <h2>National Command & <span>Investigation Center</span></h2>
            <p style="color:#cbd5e1">
              Secure administration portal for National Administrator Sujith and Directorate Command Desks.
            </p>

            <div class="auth-features-list">
              <div class="auth-feature-item">
                <div class="feat-icon" style="background:rgba(245,158,11,0.2);border-color:rgba(245,158,11,0.4);color:#f59e0b">⚖️</div>
                <div><strong>FIR & Case Triage Desk:</strong> Review, accept, assign FIR numbers, or reject public reports.</div>
              </div>
              <div class="auth-feature-item">
                <div class="feat-icon" style="background:rgba(245,158,11,0.2);border-color:rgba(245,158,11,0.4);color:#f59e0b">🔒</div>
                <div><strong>Confidential Reporter Dossiers:</strong> Unseal reporter phone numbers, emails, and home addresses.</div>
              </div>
              <div class="auth-feature-item">
                <div class="feat-icon" style="background:rgba(245,158,11,0.2);border-color:rgba(245,158,11,0.4);color:#f59e0b">⚡</div>
                <div><strong>CCTV Surveillance Intelligence:</strong> Cross-match surveillance streams and confirm biometric sightings.</div>
              </div>
              <div class="auth-feature-item">
                <div class="feat-icon" style="background:rgba(245,158,11,0.2);border-color:rgba(245,158,11,0.4);color:#f59e0b">📁</div>
                <div><strong>Found & Closed Archives:</strong> Maintain national archives hidden completely from public view.</div>
              </div>
            </div>
          </div>

          <!-- Right Admin Auth Card -->
          <div class="auth-card-container" style="border:1px solid rgba(245,158,11,0.3);box-shadow:0 25px 50px -12px rgba(0,0,0,0.8)">
            <div style="background:#0f172a;padding:18px 24px;border-bottom:1px solid #1e293b;display:flex;align-items:center;gap:10px">
              <span style="font-size:22px">🏛️</span>
              <div>
                <div style="font-size:16px;font-weight:800;color:#fff">Official Admin Authentication</div>
                <div style="font-size:12px;color:#94a3b8">Law Enforcement Credentials Gateway</div>
              </div>
            </div>

            <div class="auth-card-content">
              <form onsubmit="event.preventDefault(); App.handleGatewayLogin('officer');">
                <div class="form-group" style="margin-bottom:14px">
                  <label class="form-label">Administrator Email Address <span class="req">*</span></label>
                  <input type="email" id="gateway-officer-email" class="form-control" placeholder="Administrator Email" required />
                </div>

                <div class="form-group" style="margin-bottom:14px">
                  <label class="form-label">Secure Access Password <span class="req">*</span></label>
                  <div style="position:relative;display:flex;align-items:center;">
                    <input type="password" id="gateway-officer-password" class="form-control" placeholder="Password" required style="padding-right:42px" />
                    <button type="button" onclick="App.togglePasswordVisibility('gateway-officer-password', this)" style="position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:16px;color:#64748b;padding:4px" title="Show / Hide Password">
                      👁️
                    </button>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom:20px">
                  <label class="form-label">National Command Badge ID <span class="req">*</span></label>
                  <input type="text" id="gateway-officer-badge" class="form-control" placeholder="National Command Badge ID" required />
                </div>

                <button type="submit" class="btn btn-officer btn-lg" style="width:100%">
                  Authorize Admin Session →
                </button>
              </form>

              <div style="margin-top:20px;text-align:center">
                <button class="btn btn-outline btn-sm" style="width:100%;font-size:12px" onclick="App.setAuthGatewayMode('public')">
                  ← Return to Public Citizen Login
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer class="footer-bottom" style="max-width:1200px;margin:0 auto;padding:16px 24px;border-top:1px solid rgba(255,255,255,0.1);color:#94a3b8;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <span>Official Law Enforcement System • Ministry of Home Affairs Protocol</span>
          <span>All administrative actions are cryptographically signed & audit-logged</span>
        </footer>
      </div>
    `;
  },

  // --- Main Navigation Bar ---
  renderNavbar(state) {
    const isAuthorized = state.currentUser.role === 'officer' || state.currentUser.role === 'admin';
    const pendingCasesCount = state.cases.filter(c => c.status === 'Pending Review').length;
    const myCasesCount = state.cases.filter(c => c.reporterId === state.currentUser.id || c.reporterEmail === state.currentUser.email).length;
    const activeTab = state.activeTab;

    return `
      <header class="main-header">
        <div class="navbar-container">
          <div class="brand-wrapper" onclick="App.navigate('public-directory')">
            <div class="emblem-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <path d="M11 8v6M8 11h6"></path>
              </svg>
            </div>
            <div class="brand-text">
              <h1>FINDME <span class="badge-in">INDIA</span></h1>
              <p>National Missing Persons Portal</p>
            </div>
          </div>

          <nav class="nav-links">
            <button class="nav-link ${activeTab === 'public-directory' ? 'active' : ''}" onclick="App.navigate('public-directory')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              Active Directory
            </button>

            ${!isAuthorized ? `
              <button class="nav-link ${activeTab === 'my-cases' ? 'active' : ''}" onclick="App.navigate('my-cases')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                My Reported Cases
                ${myCasesCount > 0 ? `<span class="badge-count">${myCasesCount}</span>` : ''}
              </button>
            ` : ''}

            ${isAuthorized ? `
              <button class="nav-link ${activeTab === 'officer-portal' ? 'active' : ''}" onclick="App.navigate('officer-portal')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Admin Command Center
                ${pendingCasesCount > 0 ? `<span class="badge-count" style="background:#ef4444;color:#fff">${pendingCasesCount} New</span>` : ''}
              </button>
            ` : ''}

            <button class="nav-link ${activeTab === 'analytics' ? 'active' : ''}" onclick="App.navigate('analytics')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              National Statistics
            </button>
          </nav>

          <div class="nav-actions">
            <button class="btn btn-accent" onclick="App.openReportMissingModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Report Missing Person
            </button>

            <button class="btn btn-outline btn-sm" onclick="App.openChatModal()" title="Open Case Communication Chat Box" style="position:relative;display:inline-flex;align-items:center;gap:6px;">
              <span style="position:relative;display:inline-flex;align-items:center;justify-content:center;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                ${state.messages && state.messages.length > 0 ? `
                  <span class="unread-dot-bubble" style="position:absolute;top:-2px;right:-3px;width:8px;height:8px;background:#ef4444;border-radius:50%;box-shadow:0 0 6px #ef4444;border:1.5px solid #0f172a;display:inline-block;"></span>
                ` : ''}
              </span>
              <span>Chat Box</span>
            </button>

            <div class="user-menu-pill" onclick="App.openUserAuthModal()">
              <div class="user-avatar ${isAuthorized ? 'officer-avatar' : ''}">
                ${state.currentUser.avatar || state.currentUser.name[0]}
              </div>
              <div class="user-info-text">
                <span class="user-name">${state.currentUser.name}</span>
                <span class="user-role-tag">${state.currentUser.role === 'officer' || state.currentUser.role === 'admin' ? 'ADMINISTRATOR' : 'PUBLIC CITIZEN'}</span>
              </div>
            </div>

            <button class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#fca5a5" onclick="App.handleLogout()" title="Log out and return to Login Gateway">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Log Out
            </button>
          </div>
        </div>
      </header>
    `;
  },

  // --- Hero Banner ---
  renderHero(state) {
    const stats = store.getNationalAnalytics();
    return `
      <section class="hero-banner">
        <div class="hero-content">
          <div class="hero-text-side">
            <div class="badge-official">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              OFFICIAL LAW ENFORCEMENT & PUBLIC PORTAL • INDIA
            </div>
            <h2 class="hero-title">Every Second Counts. <span>Unite & Locate</span> Missing Persons.</h2>
            <p class="hero-desc">
              A unified national search network bridging citizens, police investigation units, and AI facial recognition surveillance to rapidly identify and reunite missing children, adults, and seniors across India.
            </p>
            <div class="hero-cta-group">
              <button class="btn btn-accent btn-lg" onclick="App.openReportMissingModal()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Report a Missing Person
              </button>
              <button class="btn btn-outline btn-lg" style="background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.25)" onclick="App.openReportSightingModal()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Report a Sighting
              </button>
            </div>
          </div>

          <div class="hero-stats-side">
            <div class="stat-card-glass alert-card">
              <div class="stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <span class="stat-number">${stats.activeCases}</span>
              <span class="stat-label">Active Missing Cases</span>
            </div>

            <div class="stat-card-glass success-card">
              <div class="stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <span class="stat-number">${stats.resolvedCases}</span>
              <span class="stat-label">Safely Located & Reunited</span>
            </div>

            <div class="stat-card-glass" style="background:rgba(15,23,42,0.85);border:1px solid rgba(6,182,212,0.4);">
              <div class="stat-icon" style="background:rgba(6,182,212,0.2);color:#38bdf8;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <span class="stat-number" style="color:#38bdf8;">${stats.totalSightings}</span>
              <span class="stat-label">Citizen Sighting Reports</span>
            </div>

            <div class="stat-card-glass" style="background:rgba(15,23,42,0.85);border:1px solid rgba(245,158,11,0.4);">
              <div class="stat-icon" style="background:rgba(245,158,11,0.2);color:#fbbf24;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <span class="stat-number" style="color:#fbbf24;">${stats.distinctStates}</span>
              <span class="stat-label">States & UTs Covered</span>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  // --- Public Directory & Multi-Criteria Search Filters ---
  renderPublicDirectory(state, filters) {
    const visibleCases = store.getVisibleCases();
    
    // Apply filters
    const filteredCases = visibleCases.filter(c => {
      // Keyword search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesLocation = (c.lastSeenCity + ' ' + c.lastSeenState + ' ' + c.lastSeenLocation).toLowerCase().includes(query);
        const matchesClothes = (c.clothingLastSeen || '').toLowerCase().includes(query);
        const matchesFIR = (c.firNumber || '').toLowerCase().includes(query);
        if (!matchesName && !matchesLocation && !matchesClothes && !matchesFIR) return false;
      }

      // State filter
      if (filters.state && filters.state !== 'All States') {
        if (c.lastSeenState.toLowerCase() !== filters.state.toLowerCase()) return false;
      }

      // Age category filter
      if (filters.ageGroup) {
        if (filters.ageGroup === 'child' && c.age > 12) return false;
        if (filters.ageGroup === 'teen' && (c.age <= 12 || c.age > 18)) return false;
        if (filters.ageGroup === 'adult' && (c.age <= 18 || c.age >= 60)) return false;
        if (filters.ageGroup === 'senior' && c.age < 60) return false;
      }

      // Gender filter
      if (filters.gender && filters.gender !== 'all') {
        if (c.gender.toLowerCase() !== filters.gender.toLowerCase()) return false;
      }

      return true;
    });

    return `
      <div class="public-directory-view">
        <div class="section-header">
          <div class="section-header-text">
            <h2>Active Missing Persons Directory (India)</h2>
            <p>Showing active missing cases under ongoing police investigation across Indian states. Found and closed cases are archived.</p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.resetFilters()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Reset All Filters
          </button>
        </div>

        <!-- Multi-Criteria Search Filter Box -->
        <div class="filters-container">
          <div class="search-primary-row">
            <div class="input-with-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                id="search-keyword" 
                placeholder="Search by Person Name, City, Landmark, FIR Number..." 
                value="${filters.search || ''}" 
                oninput="App.handleFilterChange('search', this.value)"
              />
            </div>

            <div class="input-with-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <select id="filter-state" onchange="App.handleFilterChange('state', this.value)">
                ${INDIAN_STATES.map(st => `<option value="${st}" ${filters.state === st ? 'selected' : ''}>${st}</option>`).join('')}
              </select>
            </div>

            <div class="input-with-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
              <select id="filter-gender" onchange="App.handleFilterChange('gender', this.value)">
                <option value="all" ${filters.gender === 'all' ? 'selected' : ''}>All Genders</option>
                <option value="Male" ${filters.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${filters.gender === 'Female' ? 'selected' : ''}>Female</option>
              </select>
            </div>

            <button class="btn btn-primary" onclick="App.applyFilters()">
              Search Cases
            </button>
          </div>

          <div class="filter-pills-row">
            <span class="filter-pills-label">Age Category:</span>
            <button class="filter-pill-btn ${!filters.ageGroup || filters.ageGroup === 'all' ? 'active' : ''}" onclick="App.handleFilterChange('ageGroup', 'all')">
              All Ages (${visibleCases.length})
            </button>
            <button class="filter-pill-btn ${filters.ageGroup === 'child' ? 'active' : ''}" onclick="App.handleFilterChange('ageGroup', 'child')">
              👶 Children (0-12 yrs)
            </button>
            <button class="filter-pill-btn ${filters.ageGroup === 'teen' ? 'active' : ''}" onclick="App.handleFilterChange('ageGroup', 'teen')">
              🎒 Teens (13-18 yrs)
            </button>
            <button class="filter-pill-btn ${filters.ageGroup === 'adult' ? 'active' : ''}" onclick="App.handleFilterChange('ageGroup', 'adult')">
              👤 Adults (19-59 yrs)
            </button>
            <button class="filter-pill-btn ${filters.ageGroup === 'senior' ? 'active' : ''}" onclick="App.handleFilterChange('ageGroup', 'senior')">
              👴 Senior Citizens (60+ yrs)
            </button>
          </div>
        </div>

        <!-- Case Cards Grid -->
        ${filteredCases.length === 0 ? `
          <div style="text-align:center;padding:60px 24px;background:#fff;border-radius:20px;border:1px solid #e2e8f0;box-shadow:var(--shadow-sm);background:linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);">
            <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg, #10b981, #059669);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 8px 20px rgba(16, 185, 129, 0.35);color:#fff;font-size:28px;">
              🎉
            </div>
            <h3 style="font-size:22px;font-weight:800;color:#065f46;margin-bottom:8px">All Cases Successfully Located & Closed</h3>
            <p style="color:#047857;font-size:14px;max-width:540px;margin:0 auto 20px;line-height:1.6">
              Every missing person report on the national portal has been safely located, reunited with family, or formally resolved by National Administrator Sujith.
            </p>
            <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
              <button class="btn btn-accent" onclick="App.openReportMissingModal()">
                + Submit New Missing Person Report
              </button>
              ${visibleCases.length > 0 ? `
                <button class="btn btn-outline btn-sm" onclick="App.resetFilters()">Clear Search Filters</button>
              ` : ''}
            </div>
          </div>
        ` : `
          <div class="cases-grid">
            ${filteredCases.map(c => Components.renderCaseCard(c)).join('')}
          </div>
        `}
      </div>
    `;
  },

  // --- Individual Case Card ---
  renderCaseCard(c) {
    const statusClass = c.status === 'Under Investigation' ? 'investigating' :
                        c.status === 'Sighting Reported' ? 'sighting' :
                        c.status === 'Found' ? 'found' :
                        c.status === 'Closed' ? 'closed' : 'active';

    return `
      <div class="case-card" onclick="App.openCaseDetailsModal('${c.id}')" style="cursor:pointer;" title="Click to view complete missing person details">
        <div class="case-card-img-wrapper">
          <img src="${c.photos[0]}" alt="${c.name}" class="case-card-img" />
          <span class="case-badge-status ${statusClass}">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor"></span>
            ${c.status}
          </span>
          <span class="case-badge-fir">${c.firNumber || 'FIR PENDING'}</span>
        </div>

        <div class="case-card-body">
          <div class="case-card-header">
            <h3 class="case-person-name">${c.name}</h3>
            <span class="case-person-age-gender">${c.age} Yrs • ${c.gender}</span>
          </div>

          <div class="case-quick-specs">
            <div class="spec-item">
              <span class="spec-label">Height / Weight</span>
              <span class="spec-value">${c.height} • ${c.weight}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Last Seen Date</span>
              <span class="spec-value">${c.lastSeenDate}</span>
            </div>
          </div>

          <div class="case-location-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span><strong>${c.lastSeenCity}, ${c.lastSeenState}</strong>: ${c.lastSeenLocation.substring(0, 50)}...</span>
          </div>

          ${c.medicalConditions && c.medicalConditions !== 'None' ? `
            <div class="case-medical-alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>${c.medicalConditions}</span>
            </div>
          ` : ''}

          <div class="case-card-footer" style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" style="flex:1;min-width:90px" onclick="event.stopPropagation(); App.openCaseDetailsModal('${c.id}')">
              View Dossier
            </button>
            <button class="btn btn-outline btn-sm" style="color:#0284c7;border-color:#0284c7" onclick="event.stopPropagation(); App.openUploadLocalityCCTVModal('${c.id}')" title="Upload Locality CCTV Footage">
              📹 Locality CCTV
            </button>
            <button class="btn btn-accent btn-sm" onclick="event.stopPropagation(); App.openReportSightingForCase('${c.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Sighting
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // --- Reporter's "My Reported Cases" View ---
  renderMyCasesView(state) {
    const myCases = store.getMyReportedCases();

    return `
      <div class="my-cases-view">
        <div class="section-header">
          <div class="section-header-text">
            <h2>My Reported Missing Person Cases</h2>
            <p>Track official investigation status, attach locality CCTV footage, and communicate directly with National Administration.</p>
          </div>
          <button class="btn btn-accent" onclick="App.openReportMissingModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            File New Case
          </button>
        </div>

        ${myCases.length === 0 ? `
          <div style="text-align:center;padding:60px 20px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom:12px">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            </svg>
            <h3 style="font-size:18px;color:#0f172a;margin-bottom:6px">No Missing Person Reports Filed Under Your Account</h3>
            <p style="color:#64748b;font-size:14px;margin-bottom:18px">If someone is missing, submit a report immediately to alert national law enforcement.</p>
            <button class="btn btn-primary" onclick="App.openReportMissingModal()">+ File Missing Person Report</button>
          </div>
        ` : `
          <div class="my-cases-grid">
            ${myCases.map(c => this.renderMyCaseCard(c, state)).join('')}
          </div>
        `}
      </div>
    `;
  },

  renderMyCaseCard(c, state) {
    const messages = store.getMessagesForCase(c.id);
    const matches = state.matches.filter(m => m.caseId === c.id);
    const localityCount = c.localityCctv ? c.localityCctv.length : 0;

    return `
      <div class="my-case-card">
        <div class="my-case-header">
          <div style="display:flex;gap:14px;align-items:center;">
            <img src="${c.photos[0]}" class="my-case-avatar" />
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <h3 style="font-size:18px;font-weight:800;color:#0f172a;margin:0">${c.name}</h3>
                <span class="status-badge ${
                  c.status === 'Under Investigation' ? 'status-investigating' :
                  c.status === 'Sighting Reported' ? 'status-sighting' :
                  c.status === 'Found' ? 'status-found' :
                  c.status === 'Closed' ? 'status-closed' :
                  c.status === 'Rejected' ? 'status-rejected' : 'status-pending'
                }">${c.status}</span>
              </div>
              <p style="font-size:13px;color:#64748b;margin-top:2px">
                ${c.age} Yrs • ${c.gender} • FIR: <strong style="color:#0f172a;font-family:monospace">${c.firNumber || 'Pending'}</strong> • Station: ${c.policeStation}
              </p>
            </div>
          </div>

          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="App.openChatModal('${c.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Chat with Admin (${messages.length})
            </button>
            <button class="btn btn-outline btn-sm" onclick="App.openCaseDetailsModal('${c.id}')">
              Full Details
            </button>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#475569;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;">
          <div>
            🏛️ <strong>Assigned Admin / Desk:</strong> ${c.investigatingOfficer || 'Awaiting assignment by Administration'}
          </div>
          <span style="font-size:12px;color:#1e40af;font-weight:600">
            📹 ${localityCount} Locality CCTV Feeds Attached
          </span>
        </div>
      </div>
    `;
  },

  // --- Authorized Personnel (Admin) Portal ---
  renderOfficerPortal(state, currentSubTab = 'all') {
    const cases = state.cases;
    const pendingCases = cases.filter(c => c.status === 'Pending Review');
    const investigatingCases = cases.filter(c => c.status === 'Under Investigation');
    const sightingCases = cases.filter(c => c.status === 'Sighting Reported');
    const foundCases = cases.filter(c => c.status === 'Found');
    const closedCases = cases.filter(c => c.status === 'Closed');
    const rejectedCases = cases.filter(c => c.status === 'Rejected');

    let displayCases = cases;
    if (currentSubTab === 'pending') displayCases = pendingCases;
    else if (currentSubTab === 'investigating') displayCases = investigatingCases;
    else if (currentSubTab === 'sighting') displayCases = sightingCases;
    else if (currentSubTab === 'found') displayCases = foundCases;
    else if (currentSubTab === 'closed') displayCases = closedCases;
    else if (currentSubTab === 'rejected') displayCases = rejectedCases;

    const filteredCases = displayCases;

    return `
      <div class="officer-portal-view">
        <!-- Officer Header Dashboard -->
        <div class="officer-hero-card">
          <div class="officer-profile-block">
            <div class="officer-avatar-shield">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div class="officer-profile-text">
              <h2>${state.currentUser.name} <span style="font-size:11px;background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-weight:800">${state.currentUser.badgeNumber || 'ADMINISTRATOR'}</span></h2>
              <p>${state.currentUser.designation || 'Law Enforcement Administration'} • ${state.currentUser.policeStation || 'National HQ'}</p>
            </div>
          </div>

          <div class="officer-metrics-strip">
            <div class="officer-metric-box">
              <div class="metric-num" style="color:#f87171">${pendingCases.length}</div>
              <div class="metric-title">Pending Review</div>
            </div>
            <div class="officer-metric-box">
              <div class="metric-num">${investigatingCases.length + sightingCases.length}</div>
              <div class="metric-title">In Field Search</div>
            </div>
            <div class="officer-metric-box">
              <div class="metric-num" style="color:#34d399">${foundCases.length + closedCases.length}</div>
              <div class="metric-title">Resolved Cases</div>
            </div>
          </div>
        </div>

        <!-- Case Triage Operations Bar -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <div>
            <div style="font-size:15px;font-weight:800;color:#0f172a">National Case Triage & Surveillance Operations</div>
            <div style="font-size:12px;color:#64748b">Upload surveillance feeds, manage FIR registrations, and run 128-D AI facial landmark comparisons.</div>
          </div>
          <button class="btn btn-primary" style="background:#0284c7;border-color:#0284c7;font-weight:700;display:flex;align-items:center;gap:8px;" onclick="App.openAdminAddCCTVFootageModal()">
            📹 Upload Surveillance CCTV Footage to Case
          </button>
        </div>

        <!-- Case Triage Table -->
        <div class="officer-table-card">
          <div class="officer-table-header-tabs">
            <button class="officer-tab-btn ${currentSubTab === 'all' ? 'active' : ''}" onclick="App.setOfficerSubTab('all')">
              All Cases <span class="tab-badge">${cases.length}</span>
            </button>
            <button class="officer-tab-btn ${currentSubTab === 'pending' ? 'active' : ''}" onclick="App.setOfficerSubTab('pending')">
              🚨 Pending Review <span class="tab-badge" style="background:#fee2e2;color:#b91c1c">${pendingCases.length}</span>
            </button>
            <button class="officer-tab-btn ${currentSubTab === 'investigating' ? 'active' : ''}" onclick="App.setOfficerSubTab('investigating')">
              🔍 Under Investigation <span class="tab-badge">${investigatingCases.length}</span>
            </button>
            <button class="officer-tab-btn ${currentSubTab === 'sighting' ? 'active' : ''}" onclick="App.setOfficerSubTab('sighting')">
              👁️ Sighting Reported <span class="tab-badge">${sightingCases.length}</span>
            </button>
            <button class="officer-tab-btn ${currentSubTab === 'found' ? 'active' : ''}" onclick="App.setOfficerSubTab('found')">
              🎉 Found Archive <span class="tab-badge" style="background:#d1fae5;color:#047857">${foundCases.length}</span>
            </button>
            <button class="officer-tab-btn ${currentSubTab === 'closed' ? 'active' : ''}" onclick="App.setOfficerSubTab('closed')">
              📁 Closed Archive <span class="tab-badge">${closedCases.length}</span>
            </button>
            <button class="officer-tab-btn ${currentSubTab === 'rejected' ? 'active' : ''}" onclick="App.setOfficerSubTab('rejected')">
              ❌ Rejected <span class="tab-badge">${rejectedCases.length}</span>
            </button>
          </div>

          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Missing Individual</th>
                  <th>FIR / Ref Number</th>
                  <th>Last Known Location</th>
                  <th>Status</th>
                  <th>Confidential Reporter</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredCases.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align:center;padding:40px;color:#94a3b8">
                      No cases found matching this filter tab.
                    </td>
                  </tr>
                ` : displayCases.map(c => `
                  <tr style="cursor:pointer;" onclick="if(!event.target.closest('button')) App.openCaseDetailsModal('${c.id}')">
                    <td>
                      <div class="person-cell">
                        <img src="${c.photos[0]}" class="person-thumb" />
                        <div class="person-info">
                          <div class="name" style="color:#2563eb;text-decoration:underline">${c.name}</div>
                          <div class="details">${c.age} Yrs • ${c.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style="font-family:monospace;font-weight:700;color:${c.firNumber ? '#0284c7' : '#94a3b8'}">
                        ${c.firNumber || 'Pending FIR'}
                      </div>
                    </td>
                    <td>
                      <div>${c.lastSeenCity}, ${c.lastSeenState}</div>
                      <div style="font-size:11px;color:#64748b">${c.lastSeenLocation}</div>
                    </td>
                    <td>
                      ${c.status === 'Under Investigation' ? `
                        <span class="status-badge status-investigating">🔍 Under Investigation</span>
                      ` : c.status === 'Sighting Reported' ? `
                        <span class="status-badge status-sighting">👁️ Sighting Reported</span>
                      ` : c.status === 'Found' ? `
                        <span class="status-badge status-found">🎉 Found</span>
                      ` : c.status === 'Closed' ? `
                        <span class="status-badge status-closed">📁 Closed</span>
                      ` : c.status === 'Rejected' ? `
                        <span class="status-badge status-rejected">❌ Rejected</span>
                      ` : `
                        <span class="status-badge status-pending">🚨 Pending Review</span>
                      `}
                    </td>
                    <td>
                      <div style="font-weight:700;color:#0f172a">
                        ${c.reporterName}
                      </div>
                      <div style="font-size:12px;color:#1e40af;font-family:monospace">
                        📞 ${c.reporterPhone}
                      </div>
                      <div style="font-size:11px;color:#64748b">
                        ✉️ ${c.reporterEmail}
                      </div>
                    </td>
                    <td>
                      <div style="display:flex;gap:6px;flex-wrap:wrap">
                        ${c.status === 'Pending Review' ? `
                          <button class="btn btn-accent btn-sm" onclick="App.openAcceptCaseModal('${c.id}')">
                            ✓ Review & Accept FIR
                          </button>
                          <button class="btn btn-danger btn-sm" onclick="App.openRejectCaseModal('${c.id}')">
                            ✕ Reject
                          </button>
                        ` : `
                          <button class="btn btn-primary btn-sm" style="background:#0284c7;border-color:#0284c7;" onclick="App.runBiometricScanOnAcceptedCase('${c.id}')" title="Run AI Facial Recognition on CCTV feeds and verify result">
                            ⚡ AI Face Scan & Verify
                          </button>
                          <button class="btn btn-primary btn-sm" onclick="App.openOfficerCaseActionModal('${c.id}')">
                            Manage Status
                          </button>
                        `}
                        <button class="btn btn-outline btn-sm" style="color:#0284c7;border-color:#0284c7;" onclick="App.openUploadLocalityCCTVModal('${c.id}')" title="Upload official surveillance or locality CCTV footage to this case">
                          📹 Add CCTV
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="App.openCaseDetailsModal('${c.id}')" title="View Full Case Dossier">
                          📄 Dossier
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="App.openChatModal('${c.id}')" title="Chat with reporter">
                          💬 Chat
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="App.openEditCaseModal('${c.id}')" title="Edit case specs">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="App.openDeleteCaseModal('${c.id}')" title="Permanently delete and purge case from records">
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // --- CCTV & Media Facial Recognition Scanner Tool ---
  renderCCTVScanner(state) {
    const totalCases = state.cases;
    const scannerMode = state.scannerMode || 'direct'; // 'direct' or 'database'

    return `
      <div class="cctv-scanner-view">
        <div class="section-header">
          <div class="section-header-text">
            <h2>AI Facial Recognition & Video Surveillance Scanner</h2>
            <p>Scan input surveillance video clips frame-by-frame against uploaded missing person photos or cross-match against the entire national database in real time using 128-dimensional spatial landmark vectors.</p>
          </div>
        </div>

        <div class="cctv-scanner-card">
          <!-- Scanner Mode Selector Tabs -->
          <div style="display:flex;gap:10px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:14px;flex-wrap:wrap;justify-content:space-between;align-items:center;">
            <div style="display:flex;gap:10px;">
              <button class="btn ${scannerMode === 'direct' ? 'btn-primary' : 'btn-outline'}" style="${scannerMode !== 'direct' ? 'background:transparent;color:#cbd5e1;border-color:rgba(255,255,255,0.2)' : ''}" onclick="App.setScannerMode('direct')">
                🎥 Video ↔ Uploaded Photo Matcher
              </button>
              <button class="btn ${scannerMode === 'database' ? 'btn-primary' : 'btn-outline'}" style="${scannerMode !== 'database' ? 'background:transparent;color:#cbd5e1;border-color:rgba(255,255,255,0.2)' : ''}" onclick="App.setScannerMode('database')">
                🏛️ Scan Video Against National Database (${totalCases.length} Vectors)
              </button>
            </div>
            <div style="display:flex;gap:8px">
              <span class="helpline-pill" style="border-color:#06b6d4;color:#38bdf8">
                ⚡ Neural Landmark Engine Active
              </span>
            </div>
          </div>

          ${scannerMode === 'direct' ? `
            <!-- Mode 1: Direct Video to Uploaded Photo Matcher -->
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:24px;margin-bottom:20px;">
              <h3 style="color:#fff;font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
                <span>🎯</span> 1-on-1 Video-to-Photo Biometric Matcher
              </h3>
              <p style="color:#94a3b8;font-size:13px;margin-bottom:20px">
                Upload the surveillance video / CCTV footage on the left, and the missing person's reference photograph on the right. The engine scans the video frames and identifies exact matching timestamps.
              </p>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
                <!-- Left: Video Input -->
                <div style="background:rgba(15,23,42,0.8);border:2px dashed rgba(6,182,212,0.4);border-radius:12px;padding:20px;text-align:center;position:relative;">
                  <input type="file" id="direct-video-input" accept="video/*,image/*" style="display:none" onchange="App.handleDirectVideoSelect(event)" />
                  <div id="direct-video-preview-box">
                    <div style="font-size:32px;margin-bottom:8px">📹</div>
                    <h4 style="color:#fff;font-size:15px;margin-bottom:4px">1. Select Input Video / CCTV Clip</h4>
                    <p style="color:#94a3b8;font-size:12px;margin-bottom:12px">Supports MP4, WEBM, MOV video files or images</p>
                    <button class="btn btn-outline btn-sm" style="color:#38bdf8;border-color:#06b6d4" onclick="document.getElementById('direct-video-input').click()">
                      Upload Video File
                    </button>
                    <div style="margin-top:12px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap">
                      <button class="filter-pill-btn" onclick="App.loadPresetVideo('delhi_metro')">⚡ Delhi Metro Feed</button>
                      <button class="filter-pill-btn" onclick="App.loadPresetVideo('blr_cafe')">⚡ Cafe CCTV Feed</button>
                    </div>
                  </div>
                </div>

                <!-- Right: Reference Photo Input -->
                <div style="background:rgba(15,23,42,0.8);border:2px dashed rgba(245,158,11,0.4);border-radius:12px;padding:20px;text-align:center;position:relative;">
                  <input type="file" id="direct-photo-input" accept="image/*" style="display:none" onchange="App.handleDirectPhotoSelect(event)" />
                  <div id="direct-photo-preview-box">
                    <div style="font-size:32px;margin-bottom:8px">🖼️</div>
                    <h4 style="color:#fff;font-size:15px;margin-bottom:4px">2. Select Missing Person Photo</h4>
                    <p style="color:#94a3b8;font-size:12px;margin-bottom:12px">Upload clear frontal portrait or select registered case</p>
                    <button class="btn btn-outline btn-sm" style="color:#fbbf24;border-color:#f59e0b" onclick="document.getElementById('direct-photo-input').click()">
                      Upload Missing Photo
                    </button>
                    <div style="margin-top:12px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap">
                      <button class="filter-pill-btn" onclick="App.loadPresetPhoto('aarav')">👤 Aarav Sharma</button>
                      <button class="filter-pill-btn" onclick="App.loadPresetPhoto('ananya')">👤 Ananya Iyer</button>
                      <button class="filter-pill-btn" onclick="App.loadPresetPhoto('rameshwar')">👤 Rameshwar Patil</button>
                    </div>
                  </div>
                </div>
              </div>

              <div style="text-align:center;">
                <button class="btn btn-accent btn-lg" id="btn-run-direct-match" onclick="App.runDirectVideoPhotoMatch()" style="padding:14px 32px;font-size:16px;">
                  ⚡ Run AI Video-to-Photo Frame Scan & Match →
                </button>
              </div>
            </div>
          ` : `
            <!-- Mode 2: Database Wide Scanner -->
            <div class="scanner-dropzone" id="cctv-dropzone" onclick="document.getElementById('cctv-file-input').click()">
              <input type="file" id="cctv-file-input" accept="image/*,video/*" style="display:none" onchange="App.handleCCTVUpload(event)" />
              <div style="position:relative;display:inline-block;margin-bottom:12px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="1.8">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
              <h4 style="color:#fff;font-size:16px;margin-bottom:4px">Upload Surveillance Video or Sighting Photo to Scan Database</h4>
              <p style="color:#94a3b8;font-size:13px;margin-bottom:14px">Cross-matches every video frame against all missing persons registered in India</p>
              
              <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" style="color:#38bdf8;border-color:#0284c7" onclick="event.stopPropagation(); App.loadSampleCCTV('aarav')">
                  Test Sample: Delhi Metro CCTV
                </button>
                <button class="btn btn-outline btn-sm" style="color:#38bdf8;border-color:#0284c7" onclick="event.stopPropagation(); App.loadSampleCCTV('ananya')">
                  Test Sample: Indiranagar CCD Frame
                </button>
                <button class="btn btn-outline btn-sm" style="color:#38bdf8;border-color:#0284c7" onclick="event.stopPropagation(); App.loadSampleCCTV('rameshwar')">
                  Test Sample: Dadar Station Feed
                </button>
              </div>
            </div>
          `}

          <!-- Live Scanning Results Container -->
          <div id="cctv-results-container" style="display:none;margin-top:24px;"></div>
        </div>
      </div>
    `;
  },

  // --- National Analytics & Statistics View ---
  renderAnalyticsDashboard(state) {
    const stats = store.getNationalAnalytics();
    const stateList = Object.entries(stats.stateCounts).sort((a, b) => b[1] - a[1]);

    return `
      <div class="analytics-view">
        <div class="section-header">
          <div class="section-header-text">
            <h2>National Missing Persons Analytics & Resolution Metrics</h2>
            <p>Real-time statistical overview of cases, community sightings, and police recovery rates across India.</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:28px;">
          <div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:20px;">
            <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase">Active Investigations</div>
            <div style="font-size:32px;font-weight:800;color:#ef4444;margin-top:4px">${stats.activeCases}</div>
            <div style="font-size:12px;color:#10b981;margin-top:4px">● Priority Law Enforcement Track</div>
          </div>

          <div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:20px;">
            <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase">Resolved & Reunited</div>
            <div style="font-size:32px;font-weight:800;color:#10b981;margin-top:4px">${stats.resolvedCases}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px">Recovery Rate: <strong>${stats.recoveryRate}%</strong></div>
          </div>

          <div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:20px;">
            <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase">Citizen Sighting Reports</div>
            <div style="font-size:32px;font-weight:800;color:#06b6d4;margin-top:4px">${stats.totalSightings}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px">Verified Community Leads</div>
          </div>

          <div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:20px;">
            <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase">Locality CCTV Video Streams</div>
            <div style="font-size:32px;font-weight:800;color:#f59e0b;margin-top:4px">${stats.totalLocalityCctv}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px">Surveillance Feeds Attached</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:24px;">
          <!-- State-Wise Case Distribution -->
          <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:24px;">
            <h3 style="font-size:18px;color:#0f172a;margin-bottom:16px">State-Wise Case Distribution</h3>
            <div style="display:flex;flex-direction:column;gap:12px;">
              ${stateList.map(([st, count]) => {
                const pct = Math.round((count / state.cases.length) * 100);
                return `
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#334155;margin-bottom:4px">
                      <span>${st}</span>
                      <span>${count} cases (${pct}%)</span>
                    </div>
                    <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">
                      <div style="height:100%;background:#3b82f6;width:${pct}%;border-radius:4px"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- National Law Enforcement Infrastructure -->
          <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:24px;">
            <h3 style="font-size:18px;color:#0f172a;margin-bottom:16px">National Investigation Network</h3>
            <div style="display:flex;flex-direction:column;gap:14px;font-size:13px;color:#475569">
              <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                <span style="font-size:24px">⚡</span>
                <div>
                  <strong style="color:#0f172a">AI Facial Landmark Engine</strong>
                  <div>Automated 128-dimensional biometric cross-matching across CCTV & public sighting feeds</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                <span style="font-size:24px">🏛️</span>
                <div>
                  <strong style="color:#0f172a">Unified State Police Coordination</strong>
                  <div>Integrated case transfer and FIR verification across all 28 States & 8 Union Territories</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                <span style="font-size:24px">🔒</span>
                <div>
                  <strong style="color:#0f172a">Confidential Reporter Vault</strong>
                  <div>End-to-end encrypted citizen details protected under Digital Personal Data Protection standards</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
