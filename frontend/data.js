/**
 * FINDME - National Missing Persons & Sighting Intelligence Platform (India)
 * Initial Pre-seeded Mock Dataset
 */

// Helper to generate crisp, realistic avatar SVGs for persons and officers
function generateAvatarSvg(name, gender, age, bgGradient, featureColor = '#3b82f6') {
  const initials = (name || 'IND').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const isChild = age <= 12;
  const isElder = age >= 60;
  
  // Custom SVG portrait silhouette with Indian attire/features
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
    <defs>
      <linearGradient id="g_${initials}_${age}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}"/>
        <stop offset="100%" stop-color="${bgGradient[1]}"/>
      </linearGradient>
      <radialGradient id="f_${initials}_${age}" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#fed7aa"/>
        <stop offset="100%" stop-color="#fba156"/>
      </radialGradient>
      <filter id="shadow_${initials}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25"/>
      </filter>
    </defs>
    <rect width="300" height="300" rx="16" fill="url(#g_${initials}_${age})"/>
    
    <!-- Background Grid / Security Watermark -->
    <g opacity="0.07" stroke="#ffffff" stroke-width="1">
      <path d="M0 50 H300 M0 100 H300 M0 150 H300 M0 200 H300 M0 250 H300"/>
      <path d="M50 0 V300 M100 0 V300 M150 0 V300 M200 0 V300 M250 0 V300"/>
      <circle cx="150" cy="150" r="120" fill="none" stroke-width="2"/>
    </g>

    <!-- Character Silhouette -->
    <g filter="url(#shadow_${initials})">
      <!-- Shoulders/Torso -->
      <path d="M 60 300 C 60 220, 110 210, 150 210 C 190 210, 240 220, 240 300 Z" fill="${featureColor}"/>
      <!-- Neck -->
      <rect x="135" y="170" width="30" height="45" rx="6" fill="#fba156"/>
      <!-- Face -->
      <ellipse cx="150" cy="130" rx="${isChild ? '46' : '42'}" ry="${isChild ? '50' : '56'}" fill="url(#f_${initials}_${age})"/>
      
      <!-- Hair -->
      ${gender === 'Female' ? 
        `<path d="M 98 135 C 98 75, 202 75, 202 135 C 205 180, 195 210, 185 225 C 180 180, 175 120, 150 115 C 125 120, 120 180, 115 225 C 105 210, 95 180, 98 135 Z" fill="#18181b"/>` :
        `<path d="M 104 125 C 104 70, 196 70, 196 125 C 196 100, 180 80, 150 80 C 120 80, 104 100, 104 125 Z" fill="${isElder ? '#94a3b8' : '#18181b'}"/>`
      }
      
      <!-- Eyes & Features -->
      <circle cx="132" cy="128" r="4.5" fill="#18181b"/>
      <circle cx="168" cy="128" r="4.5" fill="#18181b"/>
      <path d="M 148 136 Q 150 148 152 148" stroke="#d97706" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M 138 160 Q 150 168 162 160" stroke="#b45309" stroke-width="3" fill="none" stroke-linecap="round"/>
      
      <!-- Indian Bindi or Tilak / Feature if applicable -->
      ${gender === 'Female' ? `<circle cx="150" cy="112" r="2.5" fill="#dc2626"/>` : ''}
      ${isElder ? `<path d="M 120 115 Q 150 110 180 115 M 125 105 Q 150 100 175 105" stroke="#cbd5e1" stroke-width="1.5" fill="none" opacity="0.6"/>` : ''}
    </g>

    <!-- National ID Tag Overlay -->
    <rect x="18" y="258" width="110" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)"/>
    <text x="73" y="274" fill="#fbbf24" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">IND • ${age}Y • ${gender ? gender[0] : 'M'}</text>
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Pre-seeded Users (Strictly Admin Sujith; all public citizens must register)
const INITIAL_USERS = [
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

// Pre-seeded Missing Persons Cases
const INITIAL_CASES = [
  {
    id: "case_aarav",
    name: "Aarav Sharma",
    age: 8,
    gender: "Male",
    height: "124 cm (4'1\")",
    weight: "26 kg",
    complexion: "Wheatish / Fair",
    distinctiveMarks: "Small birthmark on left wrist, dimple on right cheek",
    clothingLastSeen: "Navy blue school uniform t-shirt, beige shorts, blue water bottle with superhero sticker",
    lastSeenState: "Delhi",
    lastSeenCity: "New Delhi",
    lastSeenLocation: "Outside Central Park Gate 2, Connaught Place, New Delhi",
    lastSeenDate: "2026-08-14",
    lastSeenTime: "16:45",
    description: "Went missing near the ice-cream kiosk while with his elder cousin. Speaks Hindi and basic English. Carries a blue backpack.",
    medicalConditions: "Suffers from mild asthma; requires inhaler if breathless.",
    status: "Found", // FOUND & REUNITED
    firNumber: "FIR-DL-2026-4402",
    policeStation: "Connaught Place Police Station, New Delhi",
    investigatingOfficer: "Sujith (National Super Admin)",
    officerId: "adm_sujith",
    reporterId: "usr_rahul",
    reporterName: "Rahul Sharma",
    reporterRelation: "Father",
    reporterPhone: "+91 98112 34567",
    reporterEmail: "rahul.sharma@example.in",
    reporterAddress: "Sector 14, Rohini, New Delhi - 110085",
    resolutionNotes: "Located safely at Rajiv Chowk Metro Station Concourse via 94.6% AI Facial Recognition match. Reunited with father Rahul Sharma. Case resolved and closed by National Administrator Sujith.",
    photos: [
      generateAvatarSvg("Aarav Sharma", "Male", 8, ["#1e3a8a", "#3b82f6"], "#1e40af")
    ],
    cctvFootage: "CP_Metro_Gate2_Cam4_1645.mp4",
    createdAt: "2026-08-14T17:30:00Z",
    updatedAt: "2026-08-17T15:00:00Z"
  },
  {
    id: "case_ananya",
    name: "Ananya Iyer",
    age: 19,
    gender: "Female",
    height: "162 cm (5'4\")",
    weight: "52 kg",
    complexion: "Fair",
    distinctiveMarks: "Small silver stud in left nose, black mole near collarbone",
    clothingLastSeen: "Maroon FabIndia Kurti with white palazzo pants and brown leather tote bag",
    lastSeenState: "Karnataka",
    lastSeenCity: "Bengaluru",
    lastSeenLocation: "Indiranagar 100ft Road near Metro Station Exit B, Bengaluru",
    lastSeenDate: "2026-08-15",
    lastSeenTime: "19:15",
    description: "College student at Mount Carmel College. Phone went unreachable after she boarded an auto-rickshaw towards Domlur.",
    medicalConditions: "No known medical issues.",
    status: "Found", // FOUND & REUNITED
    firNumber: "FIR-KA-2026-1092",
    policeStation: "Indiranagar Police Station, Bengaluru City",
    investigatingOfficer: "Sujith (National Super Admin)",
    officerId: "adm_sujith",
    reporterId: "usr_meenakshi",
    reporterName: "Meenakshi Iyer",
    reporterRelation: "Mother",
    reporterPhone: "+91 98450 12389",
    reporterEmail: "m.iyer@example.in",
    reporterAddress: "12th Main, HAL 2nd Stage, Indiranagar, Bengaluru - 560038",
    resolutionNotes: "Located safely at Indiranagar 12th Main Road following verified citizen sighting lead and smart CCTV verification. Reunited with mother Meenakshi Iyer. Case closed by National Administrator Sujith.",
    photos: [
      generateAvatarSvg("Ananya Iyer", "Female", 19, ["#831843", "#db2777"], "#be185d")
    ],
    cctvFootage: "Indiranagar_Metro_B_1915.mp4",
    createdAt: "2026-08-15T21:00:00Z",
    updatedAt: "2026-08-17T15:10:00Z"
  },
  {
    id: "case_rameshwar",
    name: "Rameshwar Patil",
    age: 71,
    gender: "Male",
    height: "168 cm (5'6\")",
    weight: "64 kg",
    complexion: "Medium / Dusky",
    distinctiveMarks: "Surgical scar on right knee, grey thick mustache",
    clothingLastSeen: "White cotton kurta pajama, brown Kolhapuri chappals, black framed reading glasses",
    lastSeenState: "Maharashtra",
    lastSeenCity: "Mumbai",
    lastSeenLocation: "Platform 3 Foot Overbridge, Dadar Railway Station, Mumbai",
    lastSeenDate: "2026-08-13",
    lastSeenTime: "08:30",
    description: "Was traveling with his grandson towards Pune. Got separated during morning crowd rush on platform. Speaks Marathi and Hindi.",
    medicalConditions: "Suffers from Alzheimer's / severe episodic memory loss. May appear disoriented.",
    status: "Found", // FOUND & REUNITED
    firNumber: "FIR-MH-2026-8831",
    policeStation: "Dadar Government Railway Police (GRP) Station, Mumbai",
    investigatingOfficer: "Sujith (National Super Admin)",
    officerId: "adm_sujith",
    reporterId: "usr_suresh",
    reporterName: "Suresh Patil",
    reporterRelation: "Son",
    reporterPhone: "+91 98201 44556",
    reporterEmail: "suresh.patil@example.in",
    reporterAddress: "Shivaji Park, Dadar West, Mumbai - 400028",
    resolutionNotes: "Located safely near Prabhadevi Junction help desk following high-accuracy GRP camera face recognition match. Safely reunited with son Suresh Patil. Case closed by National Administrator Sujith.",
    photos: [
      generateAvatarSvg("Rameshwar Patil", "Male", 71, ["#312e81", "#6366f1"], "#4338ca")
    ],
    cctvFootage: "Dadar_Plat3_FOB_0830.mp4",
    createdAt: "2026-08-13T10:15:00Z",
    updatedAt: "2026-08-17T15:15:00Z"
  },
  {
    id: "case_pooja",
    name: "Pooja Kumari",
    age: 14,
    gender: "Female",
    height: "148 cm (4'10\")",
    weight: "38 kg",
    complexion: "Wheatish",
    distinctiveMarks: "Small scar above left eyebrow",
    clothingLastSeen: "Yellow salwar suit with green dupatta, black slippers",
    lastSeenState: "Rajasthan",
    lastSeenCity: "Jaipur",
    lastSeenLocation: "Badi Chaupar, Hawa Mahal Market, Jaipur",
    lastSeenDate: "2026-08-16",
    lastSeenTime: "17:20",
    description: "Went to purchase groceries from local market with mother, lost in heavy festival crowd.",
    medicalConditions: "None",
    status: "Closed", // CLOSED & RESOLVED
    firNumber: "FIR-RJ-2026-1049",
    policeStation: "Manak Chowk Police Station, Jaipur",
    investigatingOfficer: "Sujith (National Super Admin)",
    officerId: "adm_sujith",
    reporterId: "usr_sunita",
    reporterName: "Sunita Devi",
    reporterRelation: "Mother",
    reporterPhone: "+91 94140 88219",
    reporterEmail: "sunita.devi@example.in",
    reporterAddress: "Ramganj Bazaar, Jaipur - 302003",
    resolutionNotes: "Located safely at Ramganj community center after taking shelter during festival rush. Reunited with mother Sunita Devi. Investigation formally closed by National Administrator Sujith.",
    photos: [
      generateAvatarSvg("Pooja Kumari", "Female", 14, ["#701a75", "#c026d3"], "#a21caf")
    ],
    cctvFootage: null,
    createdAt: "2026-08-16T18:45:00Z",
    updatedAt: "2026-08-17T15:20:00Z"
  },
  {
    id: "case_vikramaditya",
    name: "Vikramaditya Roy",
    age: 27,
    gender: "Male",
    height: "178 cm (5'10\")",
    weight: "74 kg",
    complexion: "Fair",
    distinctiveMarks: "Tattoo of an anchor on right forearm",
    clothingLastSeen: "Black polo t-shirt, blue denim jeans, Woodland brown trekking boots",
    lastSeenState: "West Bengal",
    lastSeenCity: "Kolkata",
    lastSeenLocation: "Howrah Station Old Complex Cab Road, Kolkata",
    lastSeenDate: "2026-08-12",
    lastSeenTime: "22:10",
    description: "Software professional. Last checked in after getting down from Vande Bharat express.",
    medicalConditions: "None",
    status: "Closed", // CLOSED & RESOLVED
    firNumber: "FIR-WB-2026-5521",
    policeStation: "Howrah GRP Station, Kolkata",
    investigatingOfficer: "Sujith (National Super Admin)",
    officerId: "adm_sujith",
    reporterId: "usr_debashis",
    reporterName: "Debashis Roy",
    reporterRelation: "Brother",
    reporterPhone: "+91 98310 99882",
    reporterEmail: "d.roy@example.in",
    reporterAddress: "Salt Lake Sector 5, Kolkata - 700091",
    resolutionNotes: "Contacted family directly after resolving delayed transit connectivity issues in Howrah. Verified safe and sound in Kolkata. Case formally closed by National Administrator Sujith.",
    photos: [
      generateAvatarSvg("Vikramaditya Roy", "Male", 27, ["#064e3b", "#059669"], "#047857")
    ],
    cctvFootage: "Howrah_CabRoad_2210.mp4",
    createdAt: "2026-08-13T08:00:00Z",
    updatedAt: "2026-08-17T15:25:00Z"
  },
  {
    id: "case_gurpreet",
    name: "Gurpreet Kaur",
    age: 22,
    gender: "Female",
    height: "165 cm (5'5\")",
    weight: "58 kg",
    complexion: "Fair",
    distinctiveMarks: "Gold kada in right arm, small cross pendant",
    clothingLastSeen: "Pink floral printed long dress, white sneakers, black backpack",
    lastSeenState: "Punjab",
    lastSeenCity: "Chandigarh",
    lastSeenLocation: "Sector 17 Plaza near Neelam Theatre, Chandigarh",
    lastSeenDate: "2026-08-15",
    lastSeenTime: "14:00",
    description: "Had gone to attend coaching class in Sector 17. Missed the evening bus home.",
    medicalConditions: "None",
    status: "Found", // FOUND & REUNITED
    firNumber: "FIR-PB-2026-3012",
    policeStation: "Sector 17 Central Police Station, Chandigarh",
    investigatingOfficer: "Sujith (National Super Admin)",
    officerId: "adm_sujith",
    reporterId: "usr_harpreet",
    reporterName: "Harpreet Singh",
    reporterRelation: "Spouse",
    reporterPhone: "+91 98765 43210",
    reporterEmail: "harpreet.singh@example.in",
    reporterAddress: "Phase 7, Mohali, Punjab - 160062",
    resolutionNotes: "Safely traced at Sector 17 Transit Lounge by security personnel and reunited with spouse Harpreet Singh. Case closed by National Administrator Sujith.",
    photos: [
      generateAvatarSvg("Gurpreet Kaur", "Female", 22, ["#4c1d95", "#8b5cf6"], "#6d28d9")
    ],
    cctvFootage: null,
    createdAt: "2026-08-15T16:20:00Z",
    updatedAt: "2026-08-17T15:30:00Z"
  },
  {
    id: "case_zaid",
    name: "Mohammed Zaid",
    age: 6,
    gender: "Male",
    height: "110 cm (3'7\")",
    weight: "19 kg",
    complexion: "Fair",
    distinctiveMarks: "Mole on left chin",
    clothingLastSeen: "Green cartoon t-shirt and blue denim shorts",
    lastSeenState: "Telangana",
    lastSeenCity: "Hyderabad",
    lastSeenLocation: "Near Lad Bazaar, Charminar, Hyderabad",
    lastSeenDate: "2026-08-08",
    lastSeenTime: "18:00",
    description: "Separated from parents near Charminar night market.",
    medicalConditions: "None",
    status: "Found", // FOUND & REUNITED
    firNumber: "FIR-TS-2026-0914",
    policeStation: "Charminar Police Station, Hyderabad City",
    investigatingOfficer: "Sujith (National Super Admin)",
    officerId: "adm_sujith",
    reporterId: "usr_farhan",
    reporterName: "Farhan Zaid",
    reporterRelation: "Father",
    reporterPhone: "+91 99890 12345",
    reporterEmail: "farhan.zaid@example.in",
    reporterAddress: "Old City, Hyderabad - 500002",
    resolutionNotes: "Recovered safely within 18 hours at Kachiguda Railway Shelter and reunited with family. Case closed by National Administrator Sujith.",
    photos: [
      generateAvatarSvg("Mohammed Zaid", "Male", 6, ["#065f46", "#10b981"], "#047857")
    ],
    cctvFootage: null,
    createdAt: "2026-08-08T19:00:00Z",
    updatedAt: "2026-08-09T14:30:00Z"
  },
  {
    id: "case_savita",
    name: "Savita Devi",
    age: 68,
    gender: "Female",
    height: "152 cm (5'0\")",
    weight: "56 kg",
    complexion: "Wheatish",
    distinctiveMarks: "Tattoo 'Om' on right hand wrist",
    clothingLastSeen: "Orange cotton saree, rudraksha mala around neck",
    lastSeenState: "Uttar Pradesh",
    lastSeenCity: "Varanasi",
    lastSeenLocation: "Dashashwamedh Ghat Steps during Evening Aarti, Varanasi",
    lastSeenDate: "2026-08-05",
    lastSeenTime: "19:30",
    description: "Went to take holy dip and missed pilgrimage tour group.",
    medicalConditions: "Mild hearing impairment",
    status: "Closed", // CLOSED & RESOLVED
    firNumber: "FIR-UP-2026-7719",
    policeStation: "Dashashwamedh Police Station, Varanasi",
    investigatingOfficer: "Sujith (National Super Admin)",
    officerId: "adm_sujith",
    reporterId: "usr_amit",
    reporterName: "Amit Kumar",
    reporterRelation: "Son",
    reporterPhone: "+91 94500 66778",
    reporterEmail: "amit.k@example.in",
    reporterAddress: "Sigra, Varanasi - 221002",
    resolutionNotes: "Located at Annapurna Pilgrim Guest House after being sheltered by local temple volunteers. Reunited and case formally closed by National Administrator Sujith.",
    photos: [
      generateAvatarSvg("Savita Devi", "Female", 68, ["#78350f", "#d97706"], "#b45309")
    ],
    cctvFootage: null,
    createdAt: "2026-08-05T21:00:00Z",
    updatedAt: "2026-08-07T11:00:00Z"
  }
];

// Pre-seeded Sighting Reports
const INITIAL_SIGHTINGS = [
  {
    id: "sight_001",
    caseId: "case_aarav",
    caseName: "Aarav Sharma",
    sightingDate: "2026-08-16",
    sightingTime: "11:30",
    location: "Rajiv Chowk Metro Station Concourse, Gate 4, New Delhi",
    description: "Saw a young boy matching Aarav's exact description carrying a blue bag with a red superhero sticker, sitting near the customer service desk accompanied by a woman in yellow salwar.",
    witnessName: "Deepak Verma",
    witnessPhone: "+91 98101 22334",
    witnessEmail: "deepak.v@example.in",
    witnessLocation: "New Delhi",
    witnessPhoto: generateAvatarSvg("Aarav Sighting", "Male", 8, ["#1e293b", "#0284c7"], "#0369a1"),
    status: "Verified",
    timestamp: "2026-08-16T11:35:00Z"
  },
  {
    id: "sight_002",
    caseId: "case_ananya",
    caseName: "Ananya Iyer",
    sightingDate: "2026-08-16",
    sightingTime: "15:45",
    location: "12th Main Road Café Coffee Day, Indiranagar, Bengaluru",
    description: "Spotted someone resembling Ananya speaking on a borrowed phone near the café entrance.",
    witnessName: "Sneha Nair",
    witnessPhone: "+91 98440 99881",
    witnessEmail: "sneha.n@example.in",
    witnessLocation: "Bengaluru",
    witnessPhoto: generateAvatarSvg("Ananya Sighting", "Female", 19, ["#701a75", "#db2777"], "#be185d"),
    status: "Under Review",
    timestamp: "2026-08-16T16:00:00Z"
  },
  {
    id: "sight_003",
    caseId: "case_rameshwar",
    caseName: "Rameshwar Patil",
    sightingDate: "2026-08-14",
    sightingTime: "18:20",
    location: "Prabhadevi Railway Overbridge, Mumbai",
    description: "Elderly man in white kurta looking confused and asking for Pune train platform.",
    witnessName: "Kishore More",
    witnessPhone: "+91 98670 11223",
    witnessEmail: "kishore.m@example.in",
    witnessLocation: "Mumbai",
    witnessPhoto: generateAvatarSvg("Rameshwar Sighting", "Male", 71, ["#334155", "#64748b"], "#475569"),
    status: "Verified",
    timestamp: "2026-08-14T18:40:00Z"
  }
];

// Pre-seeded Facial Recognition Matches
const INITIAL_MATCHES = [
  {
    id: "match_001",
    caseId: "case_aarav",
    caseName: "Aarav Sharma",
    sourceType: "Delhi Metro CCTV Feed (Gate 4)",
    sourceCamera: "Delhi Metro DMRC Cam-4 #09",
    targetPhoto: generateAvatarSvg("Aarav Sharma", "Male", 8, ["#1e3a8a", "#3b82f6"], "#1e40af"),
    sightingPhoto: generateAvatarSvg("Aarav Sighting", "Male", 8, ["#1e293b", "#0284c7"], "#0369a1"),
    confidence: 94.6,
    landmarks: {
      faceBox: { x: 55, y: 35, width: 90, height: 110 },
      leftEye: { x: 80, y: 70 },
      rightEye: { x: 120, y: 70 },
      nose: { x: 100, y: 92 },
      leftMouth: { x: 85, y: 115 },
      rightMouth: { x: 115, y: 115 }
    },
    detectedLocation: "Rajiv Chowk Metro Station Concourse, Delhi",
    timestamp: "2026-08-16 11:35 AM",
    status: "Confirmed Positive Match",
    officerNotes: "High-probability facial structure match. Dispatching PCR van from Connaught Place Station."
  },
  {
    id: "match_002",
    caseId: "case_ananya",
    caseName: "Ananya Iyer",
    sourceType: "Commercial Smart Cam Feed",
    sourceCamera: "Indiranagar CCD Camera #02",
    targetPhoto: generateAvatarSvg("Ananya Iyer", "Female", 19, ["#831843", "#db2777"], "#be185d"),
    sightingPhoto: generateAvatarSvg("Ananya Sighting", "Female", 19, ["#701a75", "#db2777"], "#be185d"),
    confidence: 89.2,
    landmarks: {
      faceBox: { x: 55, y: 35, width: 90, height: 110 },
      leftEye: { x: 80, y: 70 },
      rightEye: { x: 120, y: 70 },
      nose: { x: 100, y: 92 },
      leftMouth: { x: 85, y: 115 },
      rightMouth: { x: 115, y: 115 }
    },
    detectedLocation: "Indiranagar 12th Main Road, Bengaluru",
    timestamp: "2026-08-16 04:00 PM",
    status: "Under Review by Police",
    officerNotes: "Subject resembles Ananya. Investigating CCTV timeline leading to Domlur."
  },
  {
    id: "match_003",
    caseId: "case_rameshwar",
    caseName: "Rameshwar Patil",
    sourceType: "GRP Surveillance Network",
    sourceCamera: "Dadar Station East Gate Cam-01",
    targetPhoto: generateAvatarSvg("Rameshwar Patil", "Male", 71, ["#312e81", "#6366f1"], "#4338ca"),
    sightingPhoto: generateAvatarSvg("Rameshwar Sighting", "Male", 71, ["#334155", "#64748b"], "#475569"),
    confidence: 91.8,
    landmarks: {
      faceBox: { x: 55, y: 35, width: 90, height: 110 },
      leftEye: { x: 80, y: 70 },
      rightEye: { x: 120, y: 70 },
      nose: { x: 100, y: 92 },
      leftMouth: { x: 85, y: 115 },
      rightMouth: { x: 115, y: 115 }
    },
    detectedLocation: "Prabhadevi Junction, Mumbai",
    timestamp: "2026-08-15 10:45 AM",
    status: "Confirmed Positive Match",
    officerNotes: "Facial contour matching above 90% threshold. Senior citizen recovered safely at community desk."
  }
];

// Pre-seeded Internal Case Chat Messages (Reporter <-> National Admin)
const INITIAL_MESSAGES = [
  {
    id: "msg_001",
    caseId: "case_aarav",
    senderId: "adm_sujith",
    senderName: "Sujith (National Administrator)",
    senderRole: "admin",
    text: "Namaste Mr. Rahul. I have registered and verified FIR-DL-2026-4402 on the national portal. We have broadcast Aarav's photograph across all Delhi Metro security gates and transport depots.",
    timestamp: "2026-08-14T18:00:00Z"
  },
  {
    id: "msg_002",
    caseId: "case_aarav",
    senderId: "usr_rahul",
    senderName: "Rahul Sharma (Father)",
    senderRole: "public",
    text: "Thank you Administrator. Please note he suffers from asthma and has his inhaler in the side pocket of his backpack. Please alert the local field desks.",
    timestamp: "2026-08-14T18:15:00Z"
  },
  {
    id: "msg_003",
    caseId: "case_aarav",
    senderId: "adm_sujith",
    senderName: "Sujith (National Administrator)",
    senderRole: "admin",
    text: "Noted with top priority. Medical alert has been tagged in the national dispatch system.",
    timestamp: "2026-08-14T18:20:00Z"
  },
  {
    id: "msg_004",
    caseId: "case_aarav",
    senderId: "adm_sujith",
    senderName: "Sujith (National Administrator)",
    senderRole: "admin",
    text: "URGENT UPDATE: Our AI Facial Recognition engine detected a 94.6% match at Rajiv Chowk Metro Station Cam #09. Please check your Facial Recognition tab immediately. A quick-reaction PCR team has reached the spot.",
    timestamp: "2026-08-16T11:40:00Z"
  }
];

// Pre-seeded Simulated Email Notifications
const INITIAL_EMAILS = [
  {
    id: "em_001",
    to: "rahul.sharma@example.in",
    subject: "🚨 [FINDME Alert] Facial Recognition 94.6% Match Detected for Case: Aarav Sharma",
    snippet: "High-confidence biometric facial match detected at Rajiv Chowk Metro Station CCTV Feed Cam #09. National Administrator Sujith has verified the lead.",
    caseId: "case_aarav",
    date: "16 Aug 2026, 11:36 AM",
    unread: true
  },
  {
    id: "em_002",
    to: "rahul.sharma@example.in",
    subject: "📋 [Official Notice] FIR Registered: DL-CR-2026-4402 - Connaught Place Police Station",
    snippet: "Your missing person report for Aarav Sharma has been formally accepted by the National Directorate. Admin: Sujith (DIR-SUJITH-01).",
    caseId: "case_aarav",
    date: "14 Aug 2026, 05:45 PM",
    unread: false
  },
  {
    id: "em_003",
    to: "m.iyer@example.in",
    subject: "👁️ [Sighting Update] New Public Sighting Logged for Ananya Iyer (FIR-KA-2026-1092)",
    snippet: "A citizen logged a sighting in Indiranagar 12th Main Road. Administrator Sujith has reviewed the lead with positive confidence.",
    caseId: "case_ananya",
    date: "16 Aug 2026, 04:20 PM",
    unread: true
  }
];

// Indian States & Major Cities for quick lookup
const INDIAN_STATES = [
  "All States",
  "Delhi",
  "Maharashtra",
  "Karnataka",
  "Uttar Pradesh",
  "West Bengal",
  "Tamil Nadu",
  "Rajasthan",
  "Telangana",
  "Gujarat",
  "Punjab",
  "Haryana",
  "Kerala",
  "Madhya Pradesh",
  "Bihar",
  "Odisha",
  "Assam",
  "Andhra Pradesh"
];
