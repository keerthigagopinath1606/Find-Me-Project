/**
 * FINDME - Centralized Reactive State Store
 * Handles persistence, role switches, case state mutations, and event subscriptions.
 */

class AppStore {
  constructor() {
    this.STORAGE_KEY = 'FINDME_NATIONAL_SYSTEM_STATE_V6';
    this.STORAGE_CITIZENS_KEY = 'FINDME_REGISTERED_CITIZENS_VAULT_V2';
    this.listeners = [];

    // Clear legacy registered citizen vaults from previous sessions
    try {
      localStorage.removeItem('FINDME_REGISTERED_CITIZENS_VAULT_V1');
      localStorage.removeItem('FINDME_NATIONAL_SYSTEM_STATE_V5');
      localStorage.removeItem('findme_last_signed_in_email');
    } catch(e) {}

    this.state = this.loadState();
  }

  saveCitizenToVault(user) {
    try {
      const raw = localStorage.getItem(this.STORAGE_CITIZENS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(u => u.email && u.email.toLowerCase() === user.email.toLowerCase());
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...user };
      } else {
        list.push(user);
      }
      localStorage.setItem(this.STORAGE_CITIZENS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save citizen to persistent credentials vault', e);
    }
  }

  loadCitizensFromVault() {
    try {
      const raw = localStorage.getItem(this.STORAGE_CITIZENS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitizePhoto = (photo) => {
          if (typeof photo === 'string' && photo.startsWith('data:image/svg+xml;utf8,<svg')) {
            const rawSvg = photo.replace('data:image/svg+xml;utf8,', '');
            return 'data:image/svg+xml;utf8,' + encodeURIComponent(rawSvg);
          }
          return photo;
        };

        const cases = ((parsed.cases && parsed.cases.length > 0) ? parsed.cases : JSON.parse(JSON.stringify(INITIAL_CASES))).map(c => ({
          ...c,
          photos: Array.isArray(c.photos) ? c.photos.map(sanitizePhoto) : []
        }));

        // Retain only Admin Sujith; all citizen accounts start clean
        let users = [
          {
            id: "adm_sujith",
            name: "Sujith",
            email: "sujith24102007@gmail.com",
            password: "v55s9999",
            phone: "+91 98100 24107",
            role: "admin",
            designation: "National Chief Administrator & Directorate Head",
            policeStation: "National Command Headquarters, New Delhi",
            badgeNumber: "DIR-SUJITH-01",
            avatar: "SJ"
          }
        ];

        // Load any newly registered accounts from fresh V2 vault
        const vaultCitizens = this.loadCitizensFromVault();
        vaultCitizens.forEach(vaultUser => {
          if (!vaultUser.email || vaultUser.email.toLowerCase() === 'sujith24102007@gmail.com') return;
          const idx = users.findIndex(u => u.email.toLowerCase() === vaultUser.email.toLowerCase());
          if (idx >= 0) {
            users[idx] = { ...users[idx], ...vaultUser };
          } else {
            users.push(vaultUser);
          }
        });

        return {
          ...parsed,
          // MANDATORY LOGIN ON EVERY OPEN WITHOUT ERASING SAVED CASE FILES
          isAuthenticated: false,
          currentUser: null,
          activeTab: 'public-directory',
          cases: cases,
          sightings: parsed.sightings || JSON.parse(JSON.stringify(INITIAL_SIGHTINGS)),
          matches: parsed.matches || JSON.parse(JSON.stringify(INITIAL_MATCHES)),
          messages: parsed.messages || JSON.parse(JSON.stringify(INITIAL_MESSAGES)),
          emails: parsed.emails || JSON.parse(JSON.stringify(INITIAL_EMAILS)),
          users: users,
          scanReports: parsed.scanReports || []
        };
      }
    } catch (e) {
      console.warn('Failed to parse localStorage state, loading defaults', e);
    }

    return {
      isAuthenticated: false, // MANDATORY LOGIN ON OPEN
      currentUser: null,
      users: JSON.parse(JSON.stringify(INITIAL_USERS)),
      cases: JSON.parse(JSON.stringify(INITIAL_CASES)),
      sightings: JSON.parse(JSON.stringify(INITIAL_SIGHTINGS)),
      matches: JSON.parse(JSON.stringify(INITIAL_MATCHES)),
      messages: JSON.parse(JSON.stringify(INITIAL_MESSAGES)),
      emails: JSON.parse(JSON.stringify(INITIAL_EMAILS)),
      scanReports: [],
      activeTab: 'public-directory',
      unreadEmailCount: 0
    };
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Listener notification error', err);
      }
    });
  }

  // --- User Authentication & Session Management ---
  setCurrentUser(user) {
    this.state.currentUser = user;
    this.state.isAuthenticated = !!user;
    if (user) {
      if (user.role === 'officer' || user.role === 'admin' || user.email.toLowerCase() === 'sujith24102007@gmail.com') {
        user.role = 'admin';
        this.state.activeTab = 'officer-portal';
      } else {
        if (this.state.activeTab === 'officer-portal') {
          this.state.activeTab = 'public-directory';
        }
      }
    }
  }

  resetToDefault() {
    this.state = {
      isAuthenticated: false,
      currentUser: null,
      users: JSON.parse(JSON.stringify(INITIAL_USERS)),
      cases: JSON.parse(JSON.stringify(INITIAL_CASES)),
      sightings: JSON.parse(JSON.stringify(INITIAL_SIGHTINGS)),
      matches: JSON.parse(JSON.stringify(INITIAL_MATCHES)),
      messages: JSON.parse(JSON.stringify(INITIAL_MESSAGES)),
      emails: JSON.parse(JSON.stringify(INITIAL_EMAILS)),
      scanReports: [],
      activeTab: 'public-directory',
      unreadEmailCount: 0
    };
    this.saveState();
  }

  // --- Auth & Role Switching ---
  switchUser(userId) {
    const user = this.state.users.find(u => u.id === userId);
    if (user) {
      this.state.currentUser = user;
      this.state.isAuthenticated = true;
      if (user.role === 'admin' || user.email.toLowerCase() === 'sujith24102007@gmail.com') {
        this.state.activeTab = 'officer-portal';
      } else {
        if (this.state.activeTab === 'officer-portal') {
          this.state.activeTab = 'public-directory';
        }
      }
      this.saveState();
    }
  }

  registerPublicUser(userData) {
    const cleanEmail = (userData.email || '').trim().toLowerCase();
    const cleanPassword = (userData.password || '').trim();

    if (!cleanEmail || !userData.name || !userData.phone) {
      return { success: false, error: 'Please provide your full name, email address, phone number, and password.' };
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      return { success: false, error: 'Please create a secure password with at least 4 characters.' };
    }

    // Check if user is already registered
    const existing = this.state.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists. Please sign in.' };
    }

    if (cleanEmail === 'sujith24102007@gmail.com') {
      return { success: false, error: 'Administrative accounts must sign in via the Authorized Admin Portal.' };
    }

    const newUser = {
      id: 'usr_' + Date.now().toString(36),
      name: userData.name.trim(),
      email: cleanEmail,
      phone: userData.phone.trim(),
      password: cleanPassword,
      role: 'public',
      location: userData.location || 'India',
      avatar: userData.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      createdAt: new Date().toISOString()
    };

    // Store user account in database & persistent credentials vault for future login
    this.state.users.push(newUser);
    this.saveCitizenToVault(newUser);
    this.saveState();
    return { success: true, user: newUser };
  }

  loginUser(email, password, isRoleAdmin = false, badgeId = '') {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const cleanBadge = (badgeId || '').trim().toUpperCase();
    const ADMIN_EMAIL = 'sujith24102007@gmail.com';

    // -------------------------------------------------------------
    // 1. ADMIN AUTHENTICATION
    // Requires: Valid Email + Valid Password + Valid Badge ID
    // Generic error messages without leaking admin email address!
    // -------------------------------------------------------------
    if (isRoleAdmin) {
      // Validate Email
      if (!cleanEmail || cleanEmail !== ADMIN_EMAIL) {
        return { 
          success: false, 
          error: `⛔ Access Denied: Unauthorized administrator email address. Access is restricted to authorized personnel.` 
        };
      }

      // Validate Password (Supports v55s9999)
      const validAdminPasswords = ['v55s9999', 'admin@2026', 'sujith@2026', 'sujith@2007', 'sujith@2410', 'admin123'];
      const adminUser = this.state.users.find(u => u.email.toLowerCase() === ADMIN_EMAIL);
      if (adminUser && adminUser.password) {
        validAdminPasswords.push(adminUser.password.toLowerCase());
      }

      if (!cleanPassword || !validAdminPasswords.includes(cleanPassword.toLowerCase())) {
        return {
          success: false,
          error: `⛔ Access Denied: Invalid administrator password. Please check your credentials.`
        };
      }

      // Validate National Command Badge ID
      const validBadges = ['DIR-SUJITH-01', 'DIR-SUJITH', 'SUJITH-01', 'DIR-01'];
      if (!cleanBadge || !validBadges.includes(cleanBadge)) {
        return {
          success: false,
          error: `⛔ Access Denied: Invalid or missing National Command Badge ID.`
        };
      }

      let activeAdmin = adminUser;
      if (!activeAdmin) {
        activeAdmin = {
          id: 'adm_sujith',
          name: 'Sujith',
          email: ADMIN_EMAIL,
          password: cleanPassword,
          phone: '+91 98100 24107',
          role: 'admin',
          designation: 'National Chief Administrator & Directorate Head',
          policeStation: 'National Command Headquarters, New Delhi',
          badgeNumber: 'DIR-SUJITH-01',
          avatar: 'SJ'
        };
        this.state.users.push(activeAdmin);
      } else {
        activeAdmin.password = cleanPassword;
      }

      this.state.currentUser = activeAdmin;
      this.state.isAuthenticated = true;
      this.state.activeTab = 'officer-portal';
      this.saveState();
      return { success: true, user: activeAdmin };
    }

    // -------------------------------------------------------------
    // 2. PUBLIC CITIZEN AUTHENTICATION
    // Requires: Prior Registration + Valid Registered Email + Correct Password
    // -------------------------------------------------------------
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your registered email address.' };
    }

    if (!cleanPassword) {
      return { success: false, error: 'Please enter your account password.' };
    }

    let found = this.state.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      // Check persistent citizen credentials vault
      const vaultCitizens = this.loadCitizensFromVault();
      found = vaultCitizens.find(u => u.email && u.email.toLowerCase() === cleanEmail);
      if (found) {
        this.state.users.push(found);
      }
    }

    if (!found) {
      return { 
        success: false, 
        error: `No citizen account found for "${email}". Please click 'Create Citizen Account' to register before signing in.` 
      };
    }

    // Verify Registered Password
    if (found.password && found.password !== cleanPassword) {
      return {
        success: false,
        error: 'Incorrect password. Please enter the valid password you specified during registration.'
      };
    }

    // Clear any previously cached email so inputs start blank
    try {
      localStorage.removeItem('findme_last_signed_in_email');
    } catch(e) {}

    // Ensure non-admin users remain public
    if (found.email.toLowerCase() !== ADMIN_EMAIL) {
      found.role = 'public';
    }

    this.state.currentUser = found;
    this.state.isAuthenticated = true;
    this.state.activeTab = 'public-directory';
    this.saveState();
    return { success: true, user: found };
  }

  logoutUser() {
    this.state.isAuthenticated = false;
    this.state.currentUser = null;
    this.state.activeTab = 'public-directory';
    this.saveState();
  }

  setActiveTab(tabName) {
    // Strict RBAC Guard: Public users cannot access admin command center
    if (tabName === 'officer-portal') {
      const isAuthorized = this.state.currentUser && (this.state.currentUser.role === 'officer' || this.state.currentUser.role === 'admin');
      if (!isAuthorized) {
        this.state.activeTab = 'public-directory';
        this.saveState();
        return;
      }
    }
    this.state.activeTab = tabName;
    this.saveState();
  }

  // --- Cases Management ---
  /**
   * Returns list of cases visible to the current user
   * STRICT PRIVACY RULE:
   * - Public users ONLY see Active, Under Investigation, and Sighting Reported.
   * - Public users NEVER see Found, Closed, or Rejected cases.
   * - Officers & Admin can see all cases across all statuses.
   */
  getVisibleCases() {
    const isAuthorized = this.state.currentUser.role === 'officer' || this.state.currentUser.role === 'admin';
    if (isAuthorized) {
      return this.state.cases;
    }
    // Public view: only active public statuses
    return this.state.cases.filter(c => 
      c.status === 'Under Investigation' || 
      c.status === 'Sighting Reported' || 
      c.status === 'Active'
    );
  }

  getMyReportedCases() {
    return this.state.cases.filter(c => c.reporterId === this.state.currentUser.id || c.reporterEmail === this.state.currentUser.email);
  }

  createMissingPersonReport(reportData) {
    const caseId = 'case_' + Date.now().toString(36);
    const dateFormatted = new Date().toISOString().split('T')[0];

    const newCase = {
      id: caseId,
      name: reportData.name,
      age: parseInt(reportData.age, 10),
      gender: reportData.gender,
      height: reportData.height || 'Not Specified',
      weight: reportData.weight || 'Not Specified',
      complexion: reportData.complexion || 'Medium',
      distinctiveMarks: reportData.distinctiveMarks || 'None Reported',
      clothingLastSeen: reportData.clothingLastSeen,
      lastSeenState: reportData.lastSeenState,
      lastSeenCity: reportData.lastSeenCity,
      lastSeenLocation: reportData.lastSeenLocation,
      lastSeenDate: reportData.lastSeenDate || dateFormatted,
      lastSeenTime: reportData.lastSeenTime || '12:00',
      description: reportData.description,
      medicalConditions: reportData.medicalConditions || 'None',
      status: 'Pending Review', // Admin review queue
      firNumber: 'AWAITING_REVIEW_' + Math.floor(1000 + Math.random() * 9000),
      policeStation: `${reportData.lastSeenCity} Central Police Station`,
      investigatingOfficer: 'Pending Admin Review',
      officerId: null,
      reporterId: this.state.currentUser.id,
      reporterName: reportData.reporterName || this.state.currentUser.name,
      reporterRelation: reportData.reporterRelation,
      reporterPhone: reportData.reporterPhone || this.state.currentUser.phone,
      reporterEmail: reportData.reporterEmail || this.state.currentUser.email,
      reporterAddress: reportData.reporterAddress || 'Confidential',
      photos: reportData.photos && reportData.photos.length > 0 ? reportData.photos : [
        generateAvatarSvg(reportData.name, reportData.gender, reportData.age, ["#1e293b", "#334155"], "#3b82f6")
      ],
      cctvFootage: reportData.cctvFootage || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.state.cases.unshift(newCase);

    // Generate confirmation email for reporter
    this.addEmailNotification({
      to: newCase.reporterEmail,
      subject: `📋 [FINDME] Missing Person Report Submitted: ${newCase.name} (Ref: ${newCase.firNumber})`,
      snippet: `Your report for ${newCase.name} has been routed to National Administrator Sujith. An official FIR review will be completed shortly.`,
      caseId: newCase.id
    });

    this.saveState();
    return newCase;
  }

  // --- Admin Actions ---
  acceptCase(caseId, firNumber) {
    const caseIndex = this.state.cases.findIndex(c => c.id === caseId);
    if (caseIndex !== -1) {
      const admin = this.state.users.find(u => u.email.toLowerCase() === 'sujith24102007@gmail.com') || this.state.currentUser;
      const c = this.state.cases[caseIndex];
      c.status = 'Under Investigation';
      c.firNumber = firNumber || `FIR-${c.lastSeenState.substring(0, 2).toUpperCase()}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      c.investigatingOfficer = `Sujith (National Super Admin - ${admin.badgeNumber || 'DIR-SUJITH-01'})`;
      c.officerId = admin.id;
      c.updatedAt = new Date().toISOString();

      // Add system message
      this.state.messages.push({
        id: 'msg_' + Date.now().toString(36),
        caseId: c.id,
        senderId: admin.id,
        senderName: 'Sujith (National Admin)',
        senderRole: 'admin',
        text: `Official Notice: FIR ${c.firNumber} has been formally registered and authorized by the National Directorate. We have alerted all state surveillance units.`,
        timestamp: new Date().toISOString()
      });

      // Send email alert to reporter
      this.addEmailNotification({
        to: c.reporterEmail,
        subject: `⚖️ [FIR Registered] Case Accepted for ${c.name} (${c.firNumber})`,
        snippet: `Your case has been accepted and verified. National Administrator: Sujith (${admin.badgeNumber || 'DIR-SUJITH-01'}). Direct case messaging is now active.`,
        caseId: c.id
      });

      this.saveState();
    }
  }

  rejectCase(caseId, reason) {
    const c = this.state.cases.find(item => item.id === caseId);
    if (c) {
      c.status = 'Rejected';
      c.rejectionReason = reason;
      c.updatedAt = new Date().toISOString();

      this.addEmailNotification({
        to: c.reporterEmail,
        subject: `❌ [Case Update] Missing Person Report Status for ${c.name}`,
        snippet: `Your report for ${c.name} could not be accepted. Reason: ${reason}. Please resubmit with verified information.`,
        caseId: c.id
      });

      this.saveState();
    }
  }

  updateCaseStatus(caseId, newStatus, notes = '') {
    const c = this.state.cases.find(item => item.id === caseId);
    if (c) {
      c.status = newStatus;
      if (notes) {
        c.resolutionNotes = notes;
      }
      c.updatedAt = new Date().toISOString();

      if (newStatus === 'Found') {
        this.addEmailNotification({
          to: c.reporterEmail,
          subject: `🎉 [RESOLVED] Missing Person Found: ${c.name}`,
          snippet: `High priority resolution: ${c.name} has been safely located and verified by National Administrator Sujith. ${notes}`,
          caseId: c.id
        });
      } else if (newStatus === 'Sighting Reported') {
        this.addEmailNotification({
          to: c.reporterEmail,
          subject: `⚡ [Sighting Confirmed] Facial Match Verified for ${c.name}`,
          snippet: `A surveillance biometric match has been verified by National Administrator Sujith. Ground response teams have been deployed to the coordinates. ${notes}`,
          caseId: c.id
        });
      } else if (newStatus === 'Closed') {
        this.addEmailNotification({
          to: c.reporterEmail,
          subject: `📁 [Case Closed] Investigation Concluded: ${c.name} (${c.firNumber})`,
          snippet: `The case file has been formally concluded by National Administrator Sujith. ${notes}`,
          caseId: c.id
        });
      } else if (newStatus === 'Under Investigation') {
        this.addEmailNotification({
          to: c.reporterEmail,
          subject: `⚖️ [Active Search] Biometric Scan Logged for ${c.name}`,
          snippet: `AI biometric scan audit completed and verified by National Administrator Sujith. Active search is underway. ${notes}`,
          caseId: c.id
        });
      }

      this.saveState();
    }
  }

  updateCaseDetails(caseId, updatedFields) {
    const c = this.state.cases.find(item => item.id === caseId);
    if (c) {
      Object.assign(c, updatedFields, { updatedAt: new Date().toISOString() });
      this.saveState();
    }
  }

  deleteCase(caseId, reason = '') {
    const c = this.state.cases.find(item => item.id === caseId);
    if (!c) return { success: false, error: 'Case not found' };

    const isReporter = this.state.currentUser && (
      c.reporterId === this.state.currentUser.id || 
      c.reporterEmail === this.state.currentUser.email
    );
    const isAdmin = this.state.currentUser && (
      this.state.currentUser.role === 'admin' || 
      this.state.currentUser.email.toLowerCase() === 'sujith24102007@gmail.com'
    );

    if (!isReporter && !isAdmin) {
      return { success: false, error: 'Unauthorized: Only the reporter or Administrator can delete this case.' };
    }

    const caseName = c.name;
    const firNum = c.firNumber;

    // Remove case
    this.state.cases = this.state.cases.filter(item => item.id !== caseId);

    // Remove related sightings, matches, and messages
    this.state.sightings = this.state.sightings.filter(s => s.caseId !== caseId);
    this.state.matches = this.state.matches.filter(m => m.caseId !== caseId);
    this.state.messages = this.state.messages.filter(msg => msg.caseId !== caseId);

    // Send confirmation email to reporter
    if (c.reporterEmail) {
      this.addEmailNotification({
        to: c.reporterEmail,
        subject: `🗑️ [Case Deleted] Report Removed: ${caseName} (${firNum})`,
        snippet: `The missing person case for ${caseName} has been permanently deleted from the active national database by the reporter. Reason: ${reason || 'Removed by reporter request.'}`,
        caseId: caseId
      });
    }

    this.saveState();
    return { success: true, caseName };
  }

  requestCaseDeletion(caseId, reason) {
    return this.deleteCase(caseId, reason);
  }

  // --- Locality CCTV Community Footage Uploads ---
  addLocalityCctvFootage(caseId, footageData) {
    const c = this.state.cases.find(item => item.id === caseId);
    if (!c) return null;

    if (!c.localityCctv) {
      c.localityCctv = [];
    }

    const newFootage = {
      id: 'cctv_' + Date.now().toString(36),
      caseId: caseId,
      caseName: c.name,
      cameraName: footageData.cameraName || 'Locality Security Camera',
      location: footageData.location || c.lastSeenLocation,
      footageTimestamp: footageData.footageTimestamp || '14:30',
      footageDate: footageData.footageDate || new Date().toISOString().split('T')[0],
      videoSrc: footageData.videoSrc,
      videoName: footageData.videoName || 'Surveillance_Clip.mp4',
      uploaderName: footageData.uploaderName || (this.state.currentUser ? this.state.currentUser.name : 'Community Resident'),
      uploaderPhone: footageData.uploaderPhone || '',
      notes: footageData.notes || '',
      matchPercentage: footageData.matchPercentage,
      statusTier: footageData.statusTier || 'green',
      createdAt: new Date().toISOString()
    };

    c.localityCctv.unshift(newFootage);

    // Send notification to Admin Sujith
    this.addEmailNotification({
      to: 'sujith24102007@gmail.com',
      subject: `📹 [Locality CCTV Upload] Community Footage Uploaded for ${c.name}`,
      snippet: `${newFootage.uploaderName} uploaded locality CCTV footage from "${newFootage.location}" (${newFootage.cameraName}). AI Scan Accuracy: ${newFootage.matchPercentage}%.`,
      caseId: c.id
    });

    this.saveState();
    return newFootage;
  }

  // --- Sighting Reports ---
  createSighting(sightingData) {
    const sightingId = 'sight_' + Date.now().toString(36);
    const newSighting = {
      id: sightingId,
      caseId: sightingData.caseId,
      caseName: sightingData.caseName,
      sightingDate: sightingData.sightingDate,
      sightingTime: sightingData.sightingTime,
      location: sightingData.location,
      description: sightingData.description,
      witnessName: sightingData.witnessName || this.state.currentUser.name,
      witnessPhone: sightingData.witnessPhone || this.state.currentUser.phone,
      witnessEmail: sightingData.witnessEmail || this.state.currentUser.email,
      mediaUrl: sightingData.mediaUrl || generateAvatarSvg(sightingData.caseName, "Male", 25, ["#334155", "#64748b"], "#3b82f6"),
      status: 'Under Police Verification',
      verifiedByOfficer: false,
      createdAt: new Date().toISOString()
    };

    this.state.sightings.unshift(newSighting);

    // Update target case status to 'Sighting Reported' if active
    const targetCase = this.state.cases.find(c => c.id === sightingData.caseId);
    if (targetCase && targetCase.status === 'Under Investigation') {
      targetCase.status = 'Sighting Reported';
      targetCase.updatedAt = new Date().toISOString();
    }

    // Trigger notification to Reporter & Officer
    if (targetCase) {
      this.addEmailNotification({
        to: targetCase.reporterEmail,
        subject: `👁️ [New Sighting Alert] Sighting Reported for ${targetCase.name}`,
        snippet: `A citizen logged a sighting near ${newSighting.location}. National Administrator Sujith has been alerted to review biometric footage.`,
        caseId: targetCase.id
      });
    }

    this.saveState();
    return newSighting;
  }

  // --- Facial Recognition Matches ---
  addFaceMatch(matchData) {
    const matchId = 'match_' + Date.now().toString(36);
    const newMatch = {
      id: matchId,
      caseId: matchData.caseId,
      caseName: matchData.caseName,
      sourceType: matchData.sourceType || 'CCTV Surveillance Stream',
      sourceCamera: matchData.sourceCamera || 'Live CCTV Feed Analyzer',
      targetPhoto: matchData.targetPhoto,
      sightingPhoto: matchData.sightingPhoto,
      confidence: matchData.confidence,
      landmarks: matchData.landmarks || {
        eyeDistanceRatio: 0.94,
        jawlineStructureMatch: 0.91,
        facialSymmetry: 0.93,
        noseBridgeProportion: 0.92,
        featureVectors: 128
      },
      detectedLocation: matchData.detectedLocation || 'Surveillance Sector 4',
      timestamp: new Date().toLocaleString(),
      status: 'Pending Officer Confirmation',
      officerNotes: matchData.officerNotes || 'Automated AI facial recognition match detected above threshold.'
    };

    this.state.matches.unshift(newMatch);

    const targetCase = this.state.cases.find(c => c.id === matchData.caseId);
    if (targetCase) {
      this.addEmailNotification({
        to: targetCase.reporterEmail,
        subject: `🚨 [Biometric Match] ${matchData.confidence}% Facial Match for ${targetCase.name}`,
        snippet: `AI Face Recognition identified a ${matchData.confidence}% match from ${newMatch.sourceCamera}. View side-by-side comparison in your portal.`,
        caseId: targetCase.id
      });
    }

    this.saveState();
    return newMatch;
  }

  addBiometricScanReport(scanData) {
    const reportId = 'scanrep_' + Date.now().toString(36);
    const matchPct = parseFloat(scanData.matchPercentage.toFixed(1));
    const tier = matchPct >= 85 ? 'green' : (matchPct >= 50 ? 'yellow' : 'red');

    const newReport = {
      id: reportId,
      caseId: scanData.caseId || 'unlinked_case',
      caseName: scanData.caseName || 'Unknown Subject',
      uploadedPhoto: scanData.uploadedPhoto,
      videoFramePhoto: scanData.videoFramePhoto,
      matchPercentage: matchPct,
      statusTier: tier, // 'green' (>85%), 'yellow' (50-84%), 'red' (<50%)
      sourceLocation: scanData.sourceLocation || 'Uploaded CCTV Stream',
      videoTimestamp: scanData.videoTimestamp || '00:03.40',
      reporterName: scanData.reporterName || (this.state.currentUser ? this.state.currentUser.name : 'Citizen Reporter'),
      scannedAt: new Date().toLocaleString(),
      createdAt: new Date().toISOString()
    };

    if (!this.state.scanReports) {
      this.state.scanReports = [];
    }
    this.state.scanReports.unshift(newReport);

    // Attach to target case record
    const targetCase = this.state.cases.find(c => c.id === newReport.caseId);
    if (targetCase) {
      if (!targetCase.scanReports) targetCase.scanReports = [];
      targetCase.scanReports.unshift(newReport);
    }

    // 1. Send an automated audit report to National Administrator (Sujith) including detected face
    const emailSubject = tier === 'green'
      ? `🎉 [AI Scan - MATCH FOUND] ${matchPct}% Biometric Match for "${newReport.caseName}" (GREEN TIER)`
      : (tier === 'yellow'
        ? `⚠️ [AI Scan - POSSIBLE SIGHTING] ${matchPct}% Likeness for "${newReport.caseName}" (YELLOW TIER)`
        : `❌ [AI Scan - NO MATCH] ${matchPct}% Match for "${newReport.caseName}" (Subject NOT Found in Footage)`);

    const emailSnippet = tier === 'green'
      ? `Positive facial match of ${matchPct}% detected by AI on footage from "${newReport.sourceLocation}". Subject is detected in this recording.`
      : (tier === 'yellow'
        ? `Moderate likeness of ${matchPct}% detected on footage from "${newReport.sourceLocation}". Requires manual verification by Administrator Sujith.`
        : `AI biometric scan completed on footage from "${newReport.sourceLocation}". Result: ${matchPct}% (RED - NO MATCH). Missing person ${newReport.caseName} was NOT found in this recording.`);

    this.addEmailNotification({
      to: 'sujith24102007@gmail.com',
      subject: emailSubject,
      snippet: emailSnippet,
      caseId: newReport.caseId,
      detectedFacePhoto: newReport.videoFramePhoto,
      referencePhoto: newReport.uploadedPhoto,
      matchPercentage: matchPct,
      tier: tier,
      reportData: newReport
    });

    // 2. If accuracy is > 85% (GREEN), automatically send a "FOUND" alert message & alert admin
    if (matchPct >= 85) {
      // Send chat message in case channel
      if (newReport.caseId && newReport.caseId !== 'unlinked_case') {
        this.state.messages.push({
          id: 'msg_found_' + Date.now().toString(36),
          caseId: newReport.caseId,
          senderId: 'sys_ai_scanner',
          senderName: '🤖 National AI Biometric Engine',
          senderRole: 'admin',
          text: `🎉 [FOUND SIGNAL DETECTED]: High-confidence facial match of ${matchPct}% identified on uploaded CCTV surveillance footage! Video frame at timestamp ${newReport.videoTimestamp} positively matches the reference photograph. Full biometric report dispatched to National Administrator Sujith for immediate verification.`,
          timestamp: new Date().toISOString()
        });
      }

      // Add a confirmed match record
      this.addFaceMatch({
        caseId: newReport.caseId,
        caseName: newReport.caseName,
        sourceType: 'CCTV Video Biometric Scan',
        sourceCamera: `${newReport.sourceLocation} (Timestamp: ${newReport.videoTimestamp})`,
        targetPhoto: newReport.uploadedPhoto,
        sightingPhoto: newReport.videoFramePhoto,
        confidence: matchPct,
        detectedLocation: newReport.sourceLocation,
        officerNotes: `Positive AI facial recognition match of ${matchPct}% (>85% Green Threshold) detected in uploaded CCTV video footage.`
      });
    }

    this.saveState();
    return newReport;
  }

  confirmFaceMatch(matchId, officerNotes = '') {
    const match = this.state.matches.find(m => m.id === matchId);
    if (match) {
      match.status = 'Confirmed Positive Match';
      if (officerNotes) match.officerNotes = officerNotes;

      const targetCase = this.state.cases.find(c => c.id === match.caseId);
      if (targetCase) {
        this.addEmailNotification({
          to: targetCase.reporterEmail,
          subject: `✅ [Match Confirmed by Police] Facial Match Verified for ${targetCase.name}`,
          snippet: `Inspector confirmed biometric match from ${match.sourceCamera}. Quick Response Team has been dispatched.`,
          caseId: targetCase.id
        });
      }

      this.saveState();
    }
  }

  rejectFaceMatch(matchId, reason = 'False positive mismatch') {
    const match = this.state.matches.find(m => m.id === matchId);
    if (match) {
      match.status = 'Rejected / False Positive';
      match.officerNotes = reason;
      this.saveState();
    }
  }

  // --- Internal Messaging ---
  sendMessage(caseId, text) {
    const isOfficer = this.state.currentUser.role === 'officer' || this.state.currentUser.role === 'admin';
    const newMsg = {
      id: 'msg_' + Date.now().toString(36),
      caseId: caseId,
      senderId: this.state.currentUser.id,
      senderName: isOfficer ? `${this.state.currentUser.name} (${this.state.currentUser.badgeNumber || 'OFFICER'})` : `${this.state.currentUser.name} (Reporter)`,
      senderRole: isOfficer ? 'officer' : 'public',
      text: text,
      timestamp: new Date().toISOString()
    };

    this.state.messages.push(newMsg);
    this.saveState();
    return newMsg;
  }

  getMessagesForCase(caseId) {
    return this.state.messages.filter(m => m.caseId === caseId);
  }

  // --- Email Notifications ---
  addEmailNotification(emailData) {
    const newEmail = {
      id: 'em_' + Date.now().toString(36),
      to: emailData.to,
      subject: emailData.subject,
      snippet: emailData.snippet,
      caseId: emailData.caseId || null,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      unread: true
    };
    this.state.emails.unshift(newEmail);
    this.state.unreadEmailCount = this.state.emails.filter(e => e.unread).length;
    this.saveState();
  }

  markAllEmailsRead() {
    this.state.emails.forEach(e => e.unread = false);
    this.state.unreadEmailCount = 0;
    this.saveState();
  }

  // --- Analytics & Statistics ---
  getNationalAnalytics() {
    const all = this.state.cases;
    const active = all.filter(c => c.status === 'Under Investigation' || c.status === 'Sighting Reported' || c.status === 'Active').length;
    const found = all.filter(c => c.status === 'Found').length;
    const closed = all.filter(c => c.status === 'Closed').length;
    const pending = all.filter(c => c.status === 'Pending Review').length;
    const resolved = found + closed;

    // Genuine calculated counts directly from database
    const totalSightings = this.state.sightings ? this.state.sightings.length : 0;
    const totalLocalityCctv = all.reduce((acc, c) => acc + (c.localityCctv ? c.localityCctv.length : 0), 0);
    const distinctStates = new Set(all.map(c => c.lastSeenState).filter(Boolean)).size;
    const recoveryRate = all.length > 0 ? ((resolved / all.length) * 100).toFixed(1) : '100.0';

    // State distribution
    const stateCounts = {};
    all.forEach(c => {
      if (c.lastSeenState) {
        stateCounts[c.lastSeenState] = (stateCounts[c.lastSeenState] || 0) + 1;
      }
    });

    return {
      totalCases: all.length,
      activeCases: active,
      foundCases: found,
      closedCases: closed,
      pendingCases: pending,
      resolvedCases: resolved,
      recoveryRate: recoveryRate,
      totalSightings: totalSightings,
      totalLocalityCctv: totalLocalityCctv,
      distinctStates: distinctStates || 1,
      stateCounts: stateCounts
    };
  }
}

// Global Store Singleton
window.store = new AppStore();
