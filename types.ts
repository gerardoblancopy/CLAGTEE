import React from 'react';

export interface DesignSystem {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: {
      primary: string;
      secondary: string;
      link: string;
    };
  };
  typography: {
    fontFamily: {
      headings: string;
      body: string;
    };
    fontSizes: {
      h1: string;
      h2: string;
      h3: string;
      body: string;
      caption: string;
    };
    fontWeight: {
      light: number;
      regular: number;
      bold: number;
    };
  };
  components: {
    button: {
      base: React.CSSProperties;
      primary: React.CSSProperties;
      secondary: React.CSSProperties;
    };
    card: React.CSSProperties;
    navbar: React.CSSProperties;
  };
}

export interface NavItem {
  text: string;
  url: string;
}

export interface ImportantDate {
  event: string;
  date: string;
  highlight?: boolean;
}

export interface ThematicTrack {
  id: string;
  title: string;
  scope: string;
  topics: string[];
}

export interface BookCover {
  year: string;
  description: string;
  imageUrl: string;
}

export interface CallForPapersTemplate {
  label: string;
  href: string;
}

export interface CallForPapers {
  title: string;
  intro: string[];
  ieeeNotice?: string;
  submissionDates: {
    title: string;
    window: string;
    process: string;
    notification: string;
  };
  guidelines: {
    title: string;
    body: string[];
    structure: string[];
    translationNote: string;
  };
  reviewCriteria: {
    title: string;
    body: string;
    criteria: string[];
  };
  publicationConditions: {
    title: string;
    body: string;
  };
  styleInstructions: {
    title: string;
    body: string[];
    templates: CallForPapersTemplate[];
    footnote: string;
  };
}

export interface Content {
  conferenceTitle: string;
  navigation: NavItem[];
  sections: {
    hero: {
      title: string;
      subtitle: string;
      location: string;
      date: string;
    };
    presentation: {
      title: string;
      body: string[];
    };
    chronology: {
      title: string;
      events: string[];
    };
    importantDates: {
      title: string;
      dates: ImportantDate[];
    };
    thematicAxes: {
      title: string;
      tracks: ThematicTrack[];
    };
    callForPapers: CallForPapers;
    payments: {
      title: string;
      body: string;
    };
    registration: RegistrationContent;
    speakers: {
      title: string;
      list: any[]; // Empty list as per requirement
    };
    pastEditions: {
      title: string;
      editions: BookCover[];
    };
    committees: {
      organizer: {
        title: string;
        roles: { title: string; name: string; affiliation: string }[];
      };
      founder: {
        title: string;
        members: { name: string; affiliation: string }[];
      };
      localOrganizer: {
        title: string;
        members: { name: string; affiliation: string }[];
      };
    };
  };
}

export interface AppData {
  designSystem: DesignSystem;
  content: Content;
}

export type Language = 'es' | 'pt' | 'en';

export interface UIStrings {
  learnMore: string;
  contactTitle: string;
  contactDescription: string;
  copyright: string;
  paperManagement: string;
  ariaHome: string;
  ariaOpenMenu: string;
  ariaCloseMenu: string;
  speakersPlaceholder: string;
  deadlineBanner: string;
  venueTitle: string;
  venueCity: string;
  venueDescription: string;
  venueHotelName: string;
  venueAddress: string;
  venueRatesNote: string;
  venueBookingTitle: string;
  venueBookingIntro: string;
  venueBookingContactName: string;
  venueBookingContactRole: string;
  venueBookingPhone: string;
  venueBookingMobile: string;
  venueBookingEmail: string;
  venueBookingWarning: string;
  committeesTitle: string;
  photoPlaceholder: string;
  cmsAccessText: string;
  templateHeader: string;
  downloadLinkHeader: string;
  downloadLabel: string;
  editionPrefix: string;
}

export interface TranslationBundle {
  content: Content;
  ui: UIStrings;
}

// ---------------------------------------------------------------------------
// Registration (Inscripción) types
// ---------------------------------------------------------------------------

export type RegistrationCategory =
  | 'autor'
  | 'general'
  | 'estudiante'
  | 'paper-adicional'
  | 'cena-adicional';

export type RegistrationPhase = 'early-bird' | 'regular';

export type RegistrationStatus =
  | 'pre-registro-creado'
  | 'comprobante-recibido'
  | 'observado'
  | 'pago-validado'
  | 'confirmada'
  | 'cancelada';

export type PaperCoverage = 'principal' | 'adicional';
export type StudentType = 'autor' | 'asistente';
export type StudentLevel = 'pregrado' | 'magister' | 'doctorado';

/** Data the participant sends to create / complete a registration. */
export interface RegistrationInput {
  category: RegistrationCategory;
  // Comunes (todas las categorías)
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  affiliation: string;
  dietary?: string;
  couponCode?: string;
  // Autor / estudiante-autor / paper adicional
  cmsPaperId?: string;
  paperTitle?: string;
  presenterName?: string;
  cmsEmail?: string;
  coverage?: PaperCoverage;
  // Paper adicional
  mainRegistrationId?: string;
  mainAuthorEmail?: string;
  // Estudiante
  studentType?: StudentType;
  program?: string;
  level?: StudentLevel;
  studentProofFileKey?: string;
  studentProofUrl?: string;
  studentProofFileName?: string;
  // Cena de gala adicional
  mainParticipantName?: string;
  mainParticipantEmail?: string;
  ticketUserName?: string;
  ticketDietary?: string;
}

/** Full registration document as stored in Firestore / returned by the API. */
export interface RegistrationRecord extends RegistrationInput {
  id: string;
  token: string;
  phase: RegistrationPhase;
  amountUsd: number;
  currency: string;
  paymentUrl: string | null;
  status: RegistrationStatus;
  comprobanteFileKey?: string;
  comprobanteUrl?: string;
  comprobanteFileName?: string;
  transactionCode?: string;
  staffNote?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
  comprobanteAt?: string;
}

export interface RegistrationCategoryCopy {
  name: string;
  includes: string;
  note?: string;
}

/** Localized copy for the registration section. */
export interface RegistrationContent {
  title: string;
  intro: string;
  phaseNote: string;
  feesTitle: string;
  earlyBirdLabel: string;
  regularLabel: string;
  priceColumn: string;
  categoryColumn: string;
  includesColumn: string;
  categories: Record<RegistrationCategory, RegistrationCategoryCopy>;
  form: {
    selectLabel: string;
    sectionPersonal: string;
    sectionPaper: string;
    sectionStudent: string;
    sectionDinner: string;
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    affiliation: string;
    dietary: string;
    cmsPaperId: string;
    cmsPaperIdHint: string;
    paperTitle: string;
    presenterName: string;
    cmsEmail: string;
    coverage: string;
    coveragePrincipal: string;
    coverageAdicional: string;
    mainRegistrationId: string;
    mainAuthorEmail: string;
    mainEitherHint: string;
    studentType: string;
    studentTypeAutor: string;
    studentTypeAsistente: string;
    program: string;
    level: string;
    levelPregrado: string;
    levelMagister: string;
    levelDoctorado: string;
    studentProof: string;
    mainParticipantName: string;
    mainParticipantEmail: string;
    ticketUserName: string;
    ticketDietary: string;
    optional: string;
    couponLabel: string;
    couponPlaceholder: string;
    couponHint: string;
  };
  warnings: {
    studentNoDinner: string;
    dinnerNotRegistration: string;
    manualValidation: string;
  };
  buttons: {
    next: string;
    back: string;
    pay: string;
    submitComprobante: string;
    startOver: string;
  };
  summary: {
    title: string;
    idLabel: string;
    categoryLabel: string;
    amountLabel: string;
    payInstruction: string;
    resumeNote: string;
  };
  comprobante: {
    title: string;
    instruction: string;
    fileLabel: string;
    fileAccepted: string;
    codeLabel: string;
    eitherHint: string;
  };
  statuses: Record<RegistrationStatus, string>;
  messages: {
    creating: string;
    receiptSent: string;
    comprobanteSent: string;
    errorGeneric: string;
    requiredFields: string;
    loading: string;
    notFound: string;
    couponInvalid: string;
    couponNotApplicable: string;
    couponExhausted: string;
    couponConfirmed: string;
  };
}
