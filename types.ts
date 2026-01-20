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
