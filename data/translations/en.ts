import { Content, UIStrings } from '../../types';

export const contentEN: Content = {
  "conferenceTitle": "Latin American Congress on Electricity Generation and Transmission 2026",
  "navigation": [
    { "text": "Home", "url": "#inicio" },
    { "text": "About", "url": "#acerca-de" },
    { "text": "New Dates", "url": "#fechas" },
    { "text": "Tracks", "url": "#ejes" },
    { "text": "Submissions", "url": "#envio" },
    { "text": "Registration", "url": "#inscripcion" },
    { "text": "Sponsorship", "url": "#patrocinio" },
    { "text": "Speakers", "url": "#conferencistas" },
    { "text": "Venue", "url": "#sede" },
    { "text": "Past Editions", "url": "#ediciones" },
    { "text": "Committees", "url": "#comites" },
    { "text": "Contact", "url": "#contacto" }
  ],
  "sections": {
    "hero": {
      "title": "XVI CLAGTEE 2026",
      "subtitle": "XVI Latin American Congress on Electricity Generation and Transmission",
      "location": "Santiago, Chile",
      "date": "October 28, 29, and 30, 2026"
    },
    "presentation": {
      "title": "About CLAGTEE",
      "body": [
        "The growing demand for electrical energy in Latin American countries requires a sustained improvement in service quality and in the efficiency of technical-economic operations. This reality imposes the need to permanently optimize growth planning at all levels of electrical system operation. Such planning must integrate both economic and technical factors as well as the environmental impacts associated with the installation of new power plants, along with the incorporation of emerging technologies, advanced control systems, and reinforced safety measures.",
        "In this context, a process of regional integration has been gradually consolidated, motivated by the similarity of energy needs among Latin American countries, including their generation infrastructures.",
        "Based on these premises, the Pontificia Universidad Católica de Valparaíso (Chile), the São Paulo State University (UNESP, Brazil), and the National University of Mar del Plata (Argentina) have joined forces to organize a biennial congress that promotes the exchange of knowledge regarding analysis methodologies, operational planning, and technological incorporation, aimed at strengthening electricity generation and transmission systems. This meeting space has been institutionalized over more than three decades, taking place in different cities across the continent.",
        "The first edition of the Latin American Congress on Generation, Transmission, and Distribution was held in 1993. Since then, the congress has served as a fundamental forum for dialogue between academia and industry, promoting the exchange of knowledge and experiences regarding the challenges and advances in electrical system operation."
      ]
    },
    "chronology": {
      "title": "Chronological Summary",
      "events": [
        "I CLAGTEE: October 1993 - Viña del Mar, Chile",
        "II CLAGTEE: November 1995 - Mar del Plata, Argentina",
        "III CLAGTEE: November 1997 - Campos do Jordão, São Paulo State, Brazil",
        "IV CLAGTEE: November 2000 - Viña del Mar, Chile",
        "V CLAGTEE: November 2003 - São Pedro, São Paulo State, Brazil",
        "VI CLAGTEE: November 2005 - Mar del Plata, Argentina",
        "VII CLAGTEE: October 2007 - Valparaíso, Chile",
        "VIII CLAGTEE: October 2009 - Ubatuba, Brazil",
        "IX CLAGTEE: November 2011 - Mar del Plata, Argentina",
        "X CLAGTEE: October 2013 - Viña del Mar, Chile",
        "XI CLAGTEE: November 2015 - São José dos Campos, Brazil",
        "XII CLAGTEE: November 2017 - Mar del Plata, Argentina",
        "XIII CLAGTEE: October 2019 - Santiago, Chile",
        "XIV CLAGTEE: November 2022 - Rio de Janeiro, Brazil",
        "XV CLAGTEE: November 2024 - Mar del Plata, Argentina",
        "XVI CLAGTEE: October 2026 - Santiago, Chile"
      ]
    },
    "importantDates": {
      "title": "Important Dates",
      "dates": [
        { "event": "Launch and opening for full paper submissions", "date": "May 1, 2026" },
        { "event": "New deadline for full paper submissions", "date": "August 22, 2026", "highlight": true },
        { "event": "New notification date of full paper acceptance", "date": "September 21, 2026", "highlight": true },
        { "event": "Pre-Conference", "date": "October 27, 2026" },
        { "event": "Conference Opening", "date": "October 28, 2026" },
        { "event": "Conference Closing", "date": "October 30, 2026" }
      ]
    },
    "thematicAxes": {
      "title": "Thematic Tracks",
      "tracks": [
        {
          "id": "Track 1",
          "title": "Power System Planning, Operation, and Reliability",
          "scope": "Robust planning, secure operation, and risk management in electrical systems under uncertainty and new technical constraints.",
          "topics": [
            "Power system planning and expansion",
            "Real-time secure operation and optimal dispatch",
            "Asset management, reliability, and resilience",
            "Blackout prevention and extreme event management",
            "Operational flexibility and ancillary services",
            "System control, protection, and automation",
            "AC, HVDC transmission corridors and hybrid AC–DC architectures",
            "Smart distribution and advanced grid management"
          ]
        },
        {
          "id": "Track 2",
          "title": "Renewable Energy Integration, DER, and Storage",
          "scope": "Transformation of the electrical system due to variable renewables, electromobility, and distributed resources.",
          "topics": [
            "Massive integration of renewables and distributed energy resources",
            "Energy storage strategies and technologies",
            "Grid-forming and grid-following converters",
            "Power quality in systems with high renewable penetration",
            "Multi-energy systems and sector coupling",
            "Stability and control related to renewables and DER"
          ]
        },
        {
          "id": "Track 3",
          "title": "Power Electronics and Energy Conversion",
          "scope": "Advances in converters and power electronics control for transmission, distribution, electric mobility, and microgrids.",
          "topics": [
            "Advanced converters for transmission and distribution",
            "Converter control in weak grids",
            "Resonances, stability, and harmonic mitigation",
            "FACTS and next-generation HVDC systems",
            "Power electronics for renewables and electric mobility",
            "Power quality and active filtering"
          ]
        },
        {
          "id": "Track 4",
          "title": "Sensors, Metrology, and Advanced Monitoring",
          "scope": "Intelligent instrumentation and state-of-the-art measurement systems for electrical system diagnostics.",
          "topics": [
            "PMU, µPMU, and FDR: phasor and frequency measurement",
            "Distributed, optical, and photonic sensors",
            "Condition monitoring and predictive maintenance",
            "Advanced diagnostics and signal processing",
            "Sensing for control, protection, and automation"
          ]
        },
        {
          "id": "Track 5",
          "title": "Telecommunications, Digital Networks, and Cybersecurity",
          "scope": "Critical digital infrastructure for the operation, protection, and automation of the electrical system.",
          "topics": [
            "IEC 61850 and substation automation architectures",
            "WAMS/WAMPAC and communications for control centers",
            "Cybersecurity and resilience of cyber-physical systems",
            "Networks and protocols for DER and microgrids",
            "Advanced automation and mission-critical telecommunications"
          ]
        },
        {
          "id": "Track 6",
          "title": "Data Science, AI, and Advanced Computing",
          "scope": "Use of advanced algorithms, optimization, and intensive computing to improve the design and operation of the electrical system.",
          "topics": [
            "AI and machine learning for operation and control",
            "Statistical modeling, forecasting, and big data",
            "Distributed and high-performance computing",
            "Optimization and stochastic processes",
            "Digital twins and autonomous grids"
          ]
        },
        {
          "id": "Track 7",
          "title": "Electricity Markets, Economics, Regulation, and Energy Transition",
          "scope": "Institutional, economic, and strategic dimensions of electrical systems transitioning toward carbon neutrality.",
          "topics": [
            "Electricity market design and operation",
            "Regulation, tariffs, and remuneration mechanisms",
            "Financial evaluation and risk management",
            "Energy planning and public policy",
            "Regional integration and economic resilience"
          ]
        },
        {
          "id": "Track 8",
          "title": "Electrical Machines, Drives, and Actuators",
          "scope": "Development, modeling, control, and operation of electrical machines and advanced drive systems, fundamental for generation, industry, and electric mobility.",
          "topics": [
            "Synchronous, induction, and permanent magnet machines",
            "Design, multiphysics modeling, and advanced simulation",
            "Electric drives and motor control techniques",
            "Drives for electric mobility, traction, industry, and microgrids",
            "Faults, diagnostics, monitoring, and predictive maintenance",
            "Machine–converter–grid interaction",
            "Efficiency, thermal performance, and energy optimization"
          ]
        },
        {
          "id": "Track 9",
          "title": "Conventional Power Plants and Components",
          "scope": "Developments and optimization in power generation through traditional sources and their main components.",
          "topics": [
            "Thermoelectric power plants",
            "Thermonuclear power plants",
            "Hydroelectric power plants"
          ]
        },
        {
          "id": "Track 10",
          "title": "Alternative Power Plants and Components",
          "scope": "Integration and technology of renewable and non-conventional energy sources, cogeneration systems, and waste valorization.",
          "topics": [
            "Renewable and non-conventional electric energy sources (fuel cells, solar, wind, biomass, etc.)",
            "Technical and economic aspects related to cogeneration systems",
            "Energy from waste"
          ]
        },
        {
          "id": "Track 11",
          "title": "Bioenergy and Hydrogen",
          "scope": "Advances in hydrogen production and the use of bioenergy for sustainable electricity generation.",
          "topics": [
            "Bioenergy for electricity generation",
            "Hydrogen production processes"
          ]
        },
        {
          "id": "Track 12",
          "title": "Social and Economic Issues",
          "scope": "Impact of the energy sector on quality of life, society, and the training of future professionals.",
          "topics": [
            "Relationship between electricity demand and quality of life",
            "Engineering education"
          ]
        },
        {
          "id": "Track 13",
          "title": "Environmental and Ecological Issues",
          "scope": "Management of environmental impacts, emissions, and carbon footprint associated with energy infrastructure.",
          "topics": [
            "Environmental issues in power plants",
            "Pollutant emissions and carbon footprint"
          ]
        }
      ]
    },
    "callForPapers": {
      "title": "CALL FOR PAPERS",
      "intro": [
        "We encourage the submission of papers addressing any of the topics included in the \"Discussion Topics\" list of CLAGTEE 2026.",
        "Please read the following guidelines carefully before submitting your paper:"
      ],
      "ieeeNotice": "This edition is technically co-sponsored by the IEEE Chile Section and the IEEE Chile Section CAS Chapter. Accepted papers will be submitted for inclusion in IEEE Xplore, subject to meeting IEEE Xplore's scope and quality requirements.",
      "submissionDates": {
        "title": "Submission Dates",
        "window": "The CLAGTEE 2026 Review Committee will accept papers for the review process from May 1, 2026 until August 22, 2026.",
        "process": "The submission process will be carried out through the Paper Management Platform and all communication with authors will be managed through the official CLAGTEE 2026 email. Papers submitted via email or any other electronic means will not be accepted.",
        "notification": "The new acceptance/rejection notification date to authors will be on September 21, 2026, and the final version (if changes were requested) of accepted papers must be submitted by October 15, 2026."
      },
      "guidelines": {
        "title": "Submission Guidelines",
        "body": [
          "Full papers may be written in English, Spanish, or Portuguese.",
          "Papers must not exceed 10 pages (including references and acknowledgments). Any paper exceeding this length will be immediately rejected.",
          "To prepare your paper, you must download an IEEE Conference Proceedings Template, available for Microsoft Word or LATEX. Download links can be found below on this page, in the paragraph titled Style Instructions.",
          "The following structure is suggested for papers and the use of the indicated sections will be positively valued:"
        ],
        "structure": [
          "Title",
          "Author name(s)",
          "Institution or company",
          "Contact address and email",
          "Abstract",
          "At least 5 keywords",
          "Introduction: specifying the problem studied and the state of the art with a bibliographic discussion.",
          "Materials and Methods: presenting the foundations supporting the study in a sequential and well-structured manner",
          "Results and discussion: showing numerical results through graphs or tables and evaluating their significance.",
          "Conclusions",
          "References",
          "Brief biographical sketch of the authors"
        ],
        "translationNote": "If your paper is written in Spanish or Portuguese, the following information must be provided in English: Title, Abstract, and Keywords, in specific fields designated for this purpose, in the \"Paper Submission Form\"."
      },
      "reviewCriteria": {
        "title": "Paper Review Criteria",
        "body": "Accepted papers must contain novel and significant results. Results may be theoretical or empirical. Results will be judged based on the degree to which they have been objectively established or their potential for scientific and technological impact. Papers will be evaluated on the following aspects:",
        "criteria": [
          "Relevance to the Conference.",
          "Contribution to academic debate.",
          "Paper structure.",
          "Clarity of writing.",
          "Methodology used.",
          "Relevance and clarity of figures and tables.",
          "Clear and precise abstract.",
          "Use and number of keywords.",
          "Clarity of results, discussion, and conclusions.",
          "Relevance of references used."
        ]
      },
      "publicationConditions": {
        "title": "Publication Conditions for Papers",
        "body": "Accepted papers will be published in the \"Book of Abstracts and Proceedings\" of CLAGTEE 2026, provided that the publication fee payment is completed by October 15, 2026 as the deadline."
      },
      "styleInstructions": {
        "title": "Style Instructions",
        "body": [
          "Papers must be written following the format of the IEEE Conference Proceedings Template.",
          "In the following table, download the template of your preference by clicking on its download link."
        ],
        "templates": [
          {
            "label": "Plantilla IEEE A4 para Microsoft Word versiones recientes (.DOCX)",
            "href": "Templates/CLAGTEE2026_IEEE_WORD_conference_template_a4.docx"
          },
          {
            "label": "Plantilla IEEE A4 para LATEX (.ZIP)",
            "href": "Templates/CLAGTEE2026_IEEE-LATEX_conference_template_a4.zip"
          }
        ],
        "footnote": "The paper must be formatted according to the downloaded template and must be submitted as a .PDF and .DOCX file. Papers written in any other format or file type will not be accepted."
      }
    },
    "payments": {
      "title": "Registration and Payments",
      "body": "Information about registration fees and payment methods will be available soon."
    },
    "registration": {
      "title": "Registration and Payments",
      "intro": "Registration for CLAGTEE 2026 is completed in two stages: first fill in the registration form, then make the payment on the PUCV platform corresponding to your category. Because the payment platform operates externally, after paying you must return to the form and enter the transaction number or attach the payment receipt. Your registration will be confirmed by email once the organizing team validates the information.",
      "phaseNote": "Early Bird and Regular fees depend on the payment date. The Early Bird rate applies until Monday, October 5, 2026.",
      "feesTitle": "Categories and fees",
      "earlyBirdLabel": "Early Bird",
      "regularLabel": "Regular",
      "priceColumn": "Fee",
      "categoryColumn": "Category",
      "includesColumn": "Includes",
      "categories": {
        "autor": {
          "name": "Author",
          "includes": "Presentation of 1 paper, full access, coffee breaks, certificate and gala dinner."
        },
        "general": {
          "name": "General participant",
          "includes": "Full access, coffee breaks, certificate and gala dinner."
        },
        "estudiante": {
          "name": "Student (author or attendee)",
          "includes": "Full access, coffee breaks and certificate.",
          "note": "Gala dinner not included. If you need the dinner, purchase an additional dinner ticket."
        },
        "paper-adicional": {
          "name": "Additional paper",
          "includes": "Additional paper from the same registered author. Must be linked to a valid main registration."
        },
        "cena-adicional": {
          "name": "Additional gala dinner",
          "includes": "Additional ticket for the gala dinner.",
          "note": "Does not constitute conference registration."
        },
        "empresa-stand": {
          "name": "Companies (Exhibition Stand)",
          "includes": "2x2 m² space, table, chairs. Two representatives per stand with full conference access plus one invitation to the gala dinner.",
          "note": "Dedicated space for companies to showcase products and services, generate business contacts, and present solutions to attendees."
        }
      },
      "companyBanner": {
        "badge": "Corporate Opportunity",
        "title": "Exhibition Stand for Companies at CLAGTEE 2026",
        "desc": "A premium space for companies to showcase products and services, forge strategic connections, and present solutions to leaders in the power and energy sector.",
        "includesTitle": "Each exhibition stand includes:",
        "includesList": [
          "Allocated 2x2 m² booth space in prime exhibition area",
          "Standard furnishings provided: 1 table and chairs",
          "Full conference credentials for two (2) representatives with access to all keynotes, technical tracks, and coffee breaks",
          "One (1) official invitation to the Gala Dinner"
        ],
        "price": "USD 800",
        "action": "Register Company Stand"
      },
      "form": {
        "selectLabel": "Registration type",
        "sectionPersonal": "Personal information",
        "sectionPaper": "Paper information",
        "sectionStudent": "Student information",
        "sectionDinner": "Additional gala dinner",
        "sectionCompany": "Company information",
        "companyName": "Company name / Legal business name",
        "contactPhone": "Contact phone / WhatsApp",
        "billingTaxId": "Tax ID / VAT / Registration number (optional)",
        "representative1Title": "Representative 1 (Primary contact)",
        "representative2Title": "Representative 2 (Second attendee)",
        "representative2Name": "Name of representative 2",
        "representative2Email": "Email address of representative 2",
        "sectionStandDinner": "Gala dinner (1 pass included)",
        "dinnerAttendeeName": "Name of attendee for the gala dinner",
        "standNotes": "Special requests or notes for the stand",
        "standDetailsTitle": "Company Exhibition Stand",
        "standDetailsSpace": "2x2 m² space, equipped with table and chairs in prime area.",
        "standDetailsIncludes": "Includes full conference access for two (2) representatives plus one (1) gala dinner invitation.",
        "firstName": "First name",
        "lastName": "Last name",
        "email": "Email",
        "country": "Country",
        "affiliation": "Institution / Affiliation",
        "dietary": "Dietary restrictions",
        "cmsPaperId": "Paper No. (CMS ID)",
        "cmsPaperIdHint": "Use the official submission system ID (CMS Paper ID / Submission ID).",
        "paperTitle": "Exact paper title",
        "presenterName": "Presenting author name",
        "cmsEmail": "Email used in the CMS",
        "coverage": "This registration covers",
        "coveragePrincipal": "Main paper",
        "coverageAdicional": "Additional paper",
        "mainRegistrationId": "Main registration No.",
        "mainAuthorEmail": "Email of the already-registered author",
        "mainEitherHint": "Provide the main registration number or the email of the already-registered author.",
        "studentType": "Student type",
        "studentTypeAutor": "Student author",
        "studentTypeAsistente": "Student attendee",
        "program": "Program / Degree",
        "level": "Level",
        "levelPregrado": "Undergraduate",
        "levelMagister": "Master's",
        "levelDoctorado": "Doctorate",
        "studentProof": "Proof of current student status (enrollment or regular-student certificate)",
        "mainParticipantName": "Associated main participant name",
        "mainParticipantEmail": "Associated main participant email",
        "ticketUserName": "Name of the person using the ticket (if different)",
        "ticketDietary": "Dietary restrictions for the additional ticket",
        "optional": "optional",
        "couponLabel": "Discount coupon",
        "couponPlaceholder": "Enter your coupon code",
        "couponHint": "If you have a valid coupon, your registration will be confirmed immediately, with no payment required."
      },
      "warnings": {
        "studentNoDinner": "The student fee does not include the gala dinner. If you need the dinner, you must pay for an additional dinner ticket.",
        "dinnerNotRegistration": "The additional dinner ticket does not constitute conference registration.",
        "manualValidation": "Your registration is subject to manual validation by the organizing team. The acknowledgment email is not the final confirmation."
      },
      "buttons": {
        "next": "Next",
        "back": "Back",
        "pay": "Pay on the PUCV platform",
        "submitComprobante": "Submit receipt",
        "startOver": "Start over"
      },
      "summary": {
        "title": "Pre-registration summary",
        "idLabel": "Pre-registration No.",
        "categoryLabel": "Category",
        "amountLabel": "Amount to pay",
        "payInstruction": "Step 1: pay on the PUCV platform corresponding to your category (opens in a new tab).",
        "resumeNote": "We sent you an email with a link to resume this pre-registration later.",
        "participantNote": "If you lose this link, request access from \"Already started your registration?\" in the form: we will send you the link and a temporary CMS password.",
        "profileNote": "If you have an author account in the CMS, you can also resume it from your profile (sign in with the same email).",
        "profileLink": "Go to my profile"
      },
      "resumeBanner": {
        "title": "Already started your registration?",
        "desc": "If you already filled out this form (for example, you still need to pay or upload the receipt), do not fill it out again. Resume your pre-registration from your CMS profile or from the link in your confirmation email. If you have no account or lost the link, enter your email and we will send you the link and your CMS access.",
        "action": "Go to my CMS profile",
        "recoverLabel": "Email used in the registration",
        "recoverButton": "Send me access",
        "recoverSending": "Sending…",
        "recoverSent": "If there is a pending registration with that email, we sent you a message with the link to complete it and your CMS access. Please also check your spam folder."
      },
      "comprobante": {
        "title": "Step 2: payment receipt",
        "instruction": "After paying, attach the payment receipt (PDF or image). It is required; if you have it, also add the transaction number.",
        "fileLabel": "Attach receipt",
        "fileAccepted": "Accepted formats: PDF, JPG or PNG.",
        "codeLabel": "Transaction number / code"
      },
      "statuses": {
        "pre-registro-creado": "Status: pre-registration created (payment pending).",
        "comprobante-recibido": "Status: receipt received (validation pending).",
        "observado": "Status: flagged (please review the submitted data).",
        "pago-validado": "Status: payment validated.",
        "confirmada": "Status: registration confirmed.",
        "cancelada": "Status: registration cancelled."
      },
      "messages": {
        "creating": "Submitting…",
        "receiptSent": "Pre-registration created. We sent you an email with payment instructions.",
        "comprobanteSent": "Receipt received. We will validate your payment and send the final confirmation by email.",
        "errorGeneric": "An error occurred. Please try again.",
        "requiredFields": "Please complete the required fields before continuing.",
        "loading": "Loading…",
        "notFound": "We could not find the indicated pre-registration.",
        "couponInvalid": "The coupon code entered is not valid.",
        "couponNotApplicable": "This coupon does not apply to the selected registration category.",
        "couponExhausted": "This coupon has reached its usage limit.",
        "couponConfirmed": "Your registration was confirmed with a courtesy coupon. No payment is required.",
        "confirmStartOver": "Pre-registration {id} will be cancelled so you can start over. Do you want to continue?",
        "duplicateRegistration": "There is already an active registration ({id}) for this email. Resume it from the link in your pre-registration email or from your author profile in the CMS.",
        "duplicateLinkResent": "We have resent the link to your email.",
        "duplicatePaper": "This paper is already covered by registration {id}. If you are a co-author and will attend, please register in the General category. If you think this is a mistake, contact the organizers."
      }
    },
    "sponsorship": {
      "title": "Sponsorship & Auspices",
      "subtitle": "Corporate Sponsorship & Exhibition Opportunities at CLAGTEE 2026",
      "intro": "Below are the sponsorship tiers available for CLAGTEE 2026, designed to provide varying levels of visibility and participation throughout the conference.",
      "vatNote": "Note: All values expressed in Chilean Pesos exclude VAT (19%).",
      "tiersTitle": "Corporate Sponsorship Tiers",
      "tiersSubtitle": "Connect your organization with the leading scientific, industrial, and government community in electrical energy across Latin America.",
      "tiers": [
        {
          "id": "oro",
          "name": "GOLD",
          "badge": "1 Exclusive Slot",
          "price": "$5,000,000 CLP",
          "priceNote": "+ VAT (19%)",
          "slots": "1 (Exclusive)",
          "description": "Maximum visibility during the event, with prime brand exposure, prominent spaces, participation in promotion and networking sessions, and the option to deliver a technical presentation.",
          "complimentaryRegistrations": "6 complimentary registrations",
          "exhibitionSpace": "6 m²",
          "programAdvertising": "Full page",
          "technicalLecture": true,
          "merchandisingLogo": true,
          "pressMention": true,
          "dinnerSpeech": true,
          "dinnerBanner": true
        },
        {
          "id": "plata",
          "name": "SILVER",
          "badge": "3 Slots Available",
          "price": "$4,000,000 CLP",
          "priceNote": "+ VAT (19%)",
          "slots": "3 slots",
          "description": "Aimed at organizations seeking primarily to present their products, services, or technological solutions to a specialized audience.",
          "complimentaryRegistrations": "4 complimentary registrations",
          "exhibitionSpace": "4 m²",
          "programAdvertising": "Half page",
          "technicalLecture": true,
          "merchandisingLogo": false,
          "pressMention": false,
          "dinnerSpeech": false,
          "dinnerBanner": true
        },
        {
          "id": "bronce",
          "name": "BRONZE",
          "badge": "Subject to availability",
          "price": "$2,000,000 CLP",
          "priceNote": "+ VAT (19%)",
          "slots": "Subject to availability",
          "description": "An accessible option to support scientific and technological exchange while providing visibility for your organization before a specialized audience.",
          "complimentaryRegistrations": "2 complimentary registrations",
          "exhibitionSpace": "4 m²",
          "programAdvertising": "Mention",
          "technicalLecture": false,
          "merchandisingLogo": false,
          "pressMention": false,
          "dinnerSpeech": false,
          "dinnerBanner": false
        }
      ],
      "tableTitle": "Comparative Benefits Matrix",
      "tableHeaders": {
        "feature": "Benefit / Feature",
        "oro": "GOLD ($5,000,000)",
        "plata": "SILVER ($4,000,000)",
        "bronce": "BRONZE ($2,000,000)"
      },
      "tableRows": [
        {
          "label": "Brief description",
          "oro": "Maximum visibility during the event, prime brand exposure, prominent spaces, networking participation, and technical presentation option.",
          "plata": "Aimed at organizations primarily seeking to showcase products, services, or technical solutions to a specialized audience.",
          "bronce": "An accessible option to support scientific and technological exchange while gaining organizational visibility."
        },
        {
          "label": "Contribution",
          "oro": "$5,000,000 CLP",
          "plata": "$4,000,000 CLP",
          "bronce": "$2,000,000 CLP"
        },
        {
          "label": "Slots",
          "oro": "1 (Exclusive)",
          "plata": "3",
          "bronce": "Subject to availability"
        },
        {
          "label": "Complimentary registrations",
          "oro": "6",
          "plata": "4",
          "bronce": "2"
        },
        {
          "label": "Exhibition Space",
          "oro": "6 m²",
          "plata": "4 m²",
          "bronce": "4 m²"
        },
        {
          "label": "Program Advertising",
          "oro": "Full page",
          "plata": "Half page",
          "bronce": "Mention"
        },
        {
          "label": "Technical presentation",
          "oro": "true",
          "plata": "true",
          "bronce": "false",
          "isBoolean": true
        },
        {
          "label": "Logo on Merchandising",
          "oro": "true",
          "plata": "false",
          "bronce": "false",
          "isBoolean": true
        },
        {
          "label": "Press Mention",
          "oro": "true",
          "plata": "false",
          "bronce": "false",
          "isBoolean": true
        },
        {
          "label": "Gala Dinner Speech",
          "oro": "true",
          "plata": "false",
          "bronce": "false",
          "isBoolean": true
        },
        {
          "label": "Gala Dinner Banner",
          "oro": "true",
          "plata": "true",
          "bronce": "false",
          "isBoolean": true
        }
      ],
      "standDetails": {
        "badge": "Commercial Exhibition",
        "title": "Company Exhibition Stand at CLAGTEE 2026",
        "price": "USD 800",
        "desc": "Dedicated space for companies to exhibit products and services, make strategic connections, and present solutions to the electrical engineering community and decision makers.",
        "includesTitle": "Each stand includes:",
        "includesList": [
          "Assigned 2x2 m² space in preferred exhibition area",
          "Standard furnishings provided: 1 table and chairs",
          "Full conference registration for two (2) representatives with access to keynote lectures, technical sessions, and coffee breaks",
          "One (1) official Gala Dinner invitation",
          "Access to the CMS conference portal with company credentials"
        ],
        "action": "Register Stand Online"
      },
      "termsTitle": "TERMS OF AGREEMENT AND CANCELLATION - CLAGTEE 2026",
      "terms": [
        {
          "number": "1",
          "title": "Allocation",
          "description": "Exhibition spaces and exclusivity levels are allocated on a strict first-come, first-served basis upon receipt of payment."
        },
        {
          "number": "2",
          "title": "Invoicing",
          "description": "Payment must be completed within a maximum period of 15 days following the signing of the acceptance form."
        },
        {
          "number": "3",
          "title": "Refund Policy",
          "description": "Cancellation more than 90 days prior: 50% refund. Cancellation less than 90 days prior: no refund."
        },
        {
          "number": "4",
          "title": "Advertising Material",
          "description": "Sponsors are responsible for delivering graphic material (high-resolution logos and press artwork) before the deadlines communicated by the organizing committee."
        }
      ],
      "preReservation": {
        "badge": "Strategic Partnerships",
        "title": "Acceptance Form (Pre-Reservation)",
        "desc": "If your institution wishes to join as a strategic partner of CLAGTEE 2026 or pre-reserve a sponsorship tier, please fill out the interest form below:",
        "action": "Complete Sponsor Form",
        "formTitle": "Sponsorship Pre-Reservation Request",
        "formDesc": "Provide your institution's contact details and desired sponsorship tier. An organizing coordinator will get in touch shortly.",
        "companyLabel": "Institution / Company",
        "companyPlaceholder": "e.g., Enel, Transelec, Siemens, ABB, etc.",
        "contactNameLabel": "Contact Full Name",
        "contactNamePlaceholder": "e.g., John Smith",
        "emailLabel": "Contact Email",
        "emailPlaceholder": "contact@company.com",
        "phoneLabel": "Contact Phone / WhatsApp",
        "phonePlaceholder": "+56 9 1234 5678",
        "tierLabel": "Tier of Interest",
        "tierOptions": [
          { "value": "oro", "label": "GOLD Sponsorship ($5,000,000 CLP + VAT - 1 Slot)" },
          { "value": "plata", "label": "SILVER Sponsorship ($4,000,000 CLP + VAT - 3 Slots)" },
          { "value": "bronce", "label": "BRONZE Sponsorship ($2,000,000 CLP + VAT)" },
          { "value": "stand", "label": "Commercial Exhibition Stand (USD 800)" },
          { "value": "personalizado", "label": "Custom Sponsorship Proposal / Other" }
        ],
        "notesLabel": "Comments or specific requirements (optional)",
        "notesPlaceholder": "Details about your interest, questions about invoicing or technical requests...",
        "submitButton": "Submit Sponsorship Pre-Reservation",
        "submittingButton": "Sending request...",
        "successTitle": "Pre-Reservation Request Submitted!",
        "successMessage": "We have received your institution's interest. The CLAGTEE 2026 Organizing Committee will contact you within the next 24 business hours to finalize the agreement and allocation.",
        "errorMessage": "There was a problem submitting your request. Please try again or write to us at clagtee2026@pucv.cl.",
        "sendAnother": "Submit another inquiry"
      },
      "contact": {
        "title": "Contact & Coordination",
        "intro": "For any inquiries, please check the information on our website or contact the CLAGTEE 2026 Organizing Committee directly through our official channels:",
        "webLabel": "Website",
        "webValue": "www.clagtee2026.org",
        "emailLabel": "Email",
        "emailValue": "clagtee2026@pucv.cl",
        "phoneLabel": "Phone",
        "phoneValue": "+56 32 227 3661"
      },
      "tabs": {
        "sponsorships": "Sponsorship Tiers",
        "standForm": "Stand Registration",
        "inquiryForm": "Sponsorship Pre-Reservation"
      }
    },
    "speakers": {
      "title": "Keynote Speakers & Panels",
      "subtitle": "Distinguished figures from science, technology, and industry will share their vision in keynote lectures and expert panels at CLAGTEE 2026.",
      "list": [
        {
          "id": "dr-jose-rodriguez",
          "name": "Dr. José Rodríguez",
          "badge": "Confirmed Keynote Speaker",
          "typeLabel": "Keynote Lecture",
          "title": "“The role of Power Electronics in the energy transition toward a more sustainable world”",
          "tagline": "The most cited Chilean researcher in the world",
          "date": "October 28, 2026",
          "imageUrl": "/speakers/keynote-jose-rodriguez.png",
          "description": "IEEE Life Fellow, member of the Chilean Academy of Engineering, 2014 National Prize for Applied Sciences and Technologies, and #1 Researcher in Chile in the 2025 Stanford University Ranking."
        },
        {
          "id": "panel-operacion-sistemas-electricos",
          "name": "Power Systems Operation",
          "badge": "Confirmed Expert Panel",
          "typeLabel": "Expert Panel",
          "title": "“Power Systems Operation”",
          "tagline": "Industry and academic leaders debate the future of the electric power sector",
          "date": "October 28, 2026",
          "imageUrl": "/speakers/panel-operacion-sistemas-electricos.jpg",
          "description": "High-level discussion panel on operational and regulatory challenges in modern power grids with leaders from transmission, regulation, and academia.",
          "panelists": [
            {
              "name": "Jaime Acevedo",
              "role": "Transmission Manager",
              "affiliation": "Chilquinta Energía S.A."
            },
            {
              "name": "Jaime Peralta",
              "role": "Board Member",
              "affiliation": "Coordinador Eléctrico Nacional"
            },
            {
              "name": "Paola Hartung",
              "role": "Director of Regulatory Affairs",
              "affiliation": "AES Andes"
            },
            {
              "name": "Jorge Mendoza",
              "role": "Vice Rector of Development",
              "affiliation": "PUCV"
            }
          ]
        },
        {
          "id": "panel-especial-motores",
          "name": "Electric Propulsion Systems Design",
          "badge": "Special Motors Panel",
          "typeLabel": "Special Panel",
          "title": "“Design of electric propulsion systems for heavy-duty vehicles: Topologies, design, robust optimization and control”",
          "tagline": "Innovation and electromobility for heavy-duty commercial vehicles",
          "date": "October 29, 2026",
          "imageUrl": "/speakers/panel-especial-motores.jpg",
          "description": "Specialized panel focused on topologies, advanced design methodologies, and robust control for heavy-duty electric vehicle propulsion.",
          "panelists": [
            {
              "name": "Juan A. Tapia",
              "role": "PhD Electrical Eng.",
              "affiliation": "Full Professor UdeC · Director Anillo Project ACT250005"
            },
            {
              "name": "Álvaro Hoffer",
              "role": "PhD Electrical Eng.",
              "affiliation": "Researcher CTE-USS · Assistant Professor USS"
            },
            {
              "name": "Carlos Madariaga",
              "role": "PhD Electrical Eng.",
              "affiliation": "Assistant Professor UdeC"
            },
            {
              "name": "Werner Jara",
              "role": "PhD Engineering Sciences",
              "affiliation": "Associate Professor PUCV"
            }
          ]
        }
      ]
    },
    "pastEditions": {
      "title": "Past Editions",
      "editions": [
        { "year": "2024", "description": "XV CLAGTEE - Mar del Plata, Argentina", "imageUrl": "/bookcovers/clagtee2024_portada_book.png" },
        { "year": "2022", "description": "XIV CLAGTEE - Rio de Janeiro, Brazil", "imageUrl": "/bookcovers/clagtee2022_portada_book.png" },
        { "year": "2019", "description": "XIII CLAGTEE - Santiago, Chile", "imageUrl": "/bookcovers/clagtee2019_portada_book.png" },
        { "year": "2017", "description": "XII CLAGTEE - Mar del Plata, Argentina", "imageUrl": "/bookcovers/clagtee2017_portada_book.png" },
        { "year": "2015", "description": "XI CLAGTEE - São José dos Campos, Brazil", "imageUrl": "/bookcovers/clagtee2015_portada_book.png" },
        { "year": "2013", "description": "X CLAGTEE - Viña del Mar, Chile", "imageUrl": "/bookcovers/clagtee2013_portada_book.png" },
        { "year": "2011", "description": "IX CLAGTEE - Mar del Plata, Argentina", "imageUrl": "/bookcovers/clagtee2011_portada_book.jpg" },
        { "year": "2009", "description": "VIII CLAGTEE - Ubatuba, Brazil", "imageUrl": "/bookcovers/clagtee2009_portada_book.jpg" },
        { "year": "2007", "description": "VII CLAGTEE - Valparaíso, Chile", "imageUrl": "/bookcovers/clagtee2007_portada_book.jpg" },
        { "year": "2005", "description": "VI CLAGTEE - Mar del Plata, Argentina", "imageUrl": "/bookcovers/clagtee2005_portada_book.jpg" },
        { "year": "2003", "description": "V CLAGTEE - São Pedro, Brazil", "imageUrl": "/bookcovers/clagtee2003_portada_book.jpg" },
        { "year": "1997", "description": "III CLAGTEE - Campos do Jordão, Brazil", "imageUrl": "/bookcovers/clagtee1997_portada_book.jpg" },
        { "year": "1995", "description": "II CLAGTEE - Mar del Plata, Argentina", "imageUrl": "/bookcovers/clagtee1995_portada_book.jpg" },
        { "year": "1993", "description": "I CLAGTEE - Viña del Mar, Chile", "imageUrl": "/bookcovers/clagtee1993_portada_book.jpg" }
      ]
    },
    "committees": {
      "organizer": {
        "title": "Organizing Committee",
        "roles": [
          { "title": "Chairman", "name": "Prof. Jorge Mendoza Baeza", "affiliation": "PUCV (Chile)" },
          { "title": "Co-chairman", "name": "Prof. Justo José Roberts", "affiliation": "UNMdP (Argentina)" },
          { "title": "Co-chairman", "name": "Prof. Celso Eduardo Tuna", "affiliation": "UNESP (Brazil)" }
        ]
      },
      "founder": {
        "title": "Founding Committee",
        "members": [
          { "name": "Prof. Juan Antonio Suárez", "affiliation": "UNMdP (Argentina)" },
          { "name": "Prof. Patricio Robles Calderon", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Claudio Oscar Dimenna", "affiliation": "UNMdP (Argentina)" },
          { "name": "Prof. Paulino Alonso Rivas", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. José Luz Silveira", "affiliation": "UNESP (Brazil)" }
        ]
      },
      "localOrganizer": {
        "title": "Local Organizing Committee",
        "members": [
          { "name": "Prof. Gonzalo Farías", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Héctor Vargas", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Carlos Reusser", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Werner Jara", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Gabriel Hermosilla", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Pedro Escarate", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Miguel López", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Gerardo Blanco", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Martin Okoye", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Mauricio Rodriguez", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Ariel Leiva", "affiliation": "PUCV (Chile)" },
          { "name": "Prof. Diego Altamirano", "affiliation": "PUCV (Chile)" }
        ]
      }
    }
  }
};

export const uiEN: UIStrings = {
  learnMore: "Learn More",
  contactTitle: "Contact",
  contactDescription: "For any inquiries about the congress, please contact us at the following email address.",
  copyright: "School of Electrical Engineering - PUCV. All rights reserved.",
  paperManagement: "Paper Management",
  ariaHome: "XVI CLAGTEE 2026, go to top",
  ariaOpenMenu: "Open navigation menu",
  ariaCloseMenu: "Close navigation menu",
  speakersPlaceholder: "More keynote speakers and panels will be announced soon.",
  deadlineBanner: "Early Bird registration rate until Monday, October 5, 2026",
  venueTitle: "Event Venue",
  venueCity: "Providencia, Santiago, Chile",
  venueHotelName: "MR. Hotel (former Hotel Neruda)",
  venueAddress: "Av. Pedro de Valdivia 164, Providencia, Santiago",
  venueDescription: "MR. Hotel is a distinguished four-star hotel located in the heart of the Providencia neighborhood, one of Santiago's most attractive and dynamic areas. Its prime location offers easy access to many points of interest: just an 18-minute walk from Costanera Center and MUT, and one block from the Pedro de Valdivia metro station. Its rooms are spacious and elegant, featuring a queen bed, air conditioning, heating, flat-screen cable TV, minibar, coffee set and safe. The hotel offers free wifi throughout, private parking (subject to availability), buffet breakfast included in the rate, a restaurant, gym and heated pool, with 24-hour reception.",
  venueRatesNote: "Congress attendees staying at MR. Hotel have access to the corporate rate arranged with Pontificia Universidad Católica de Valparaíso.",
  venueBookingTitle: "Booking with the Corporate Rate",
  venueBookingIntro: "To request the corporate rate, please contact the person below directly and provide: the congress name (XVI CLAGTEE 2026), stay dates, guest name, and payment method.",
  venueBookingContactName: "Enrique Carrasco V.",
  venueBookingContactRole: "Corporate Accounts Director, MR. Hoteles",
  venueBookingPhone: "Phone: +56 2 2663 3154",
  venueBookingMobile: "Mobile: +56 9 6303 9720",
  venueBookingEmail: "ventas3@mrhoteles.cl",
  venueBookingWarning: "Important: the corporate rate only applies to bookings made directly through this contact. Reservations made through other channels (e.g., Booking.com) are not eligible for any discount or rate match.",
  committeesTitle: "Committees",
  photoPlaceholder: "Photo",
  cmsAccessText: "Access the CMS for paper submissions at",
  templateHeader: "Template",
  downloadLinkHeader: "Download Link",
  downloadLabel: "DOWNLOAD",
  editionPrefix: "Edition",
};
