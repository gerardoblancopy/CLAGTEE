import { DesignSystem, AppData } from '../types';
import { contentES } from './translations/es';

export const designSystem: DesignSystem = {
  "colors": {
    "primary": "#0D2C54",
    "secondary": "#2A9D8F",
    "accent": "#F4A261",
    "background": "#FFFFFF",
    "text": {
      "primary": "#333333",
      "secondary": "#FFFFFF",
      "link": "#2A9D8F"
    }
  },
  "typography": {
    "fontFamily": {
      "headings": "'Montserrat', sans-serif",
      "body": "'Roboto', sans-serif"
    },
    "fontSizes": {
      "h1": "2.5rem",
      "h2": "2rem",
      "h3": "1.75rem",
      "body": "1rem",
      "caption": "0.875rem"
    },
    "fontWeight": {
      "light": 300,
      "regular": 400,
      "bold": 700
    }
  },
  "components": {
    "button": {
      "base": {
        "padding": "12px 24px",
        "borderRadius": "8px",
        "border": "2px solid transparent",
        "fontWeight": 700,
        "cursor": "pointer",
        "textTransform": "uppercase"
      },
      "primary": {
        "backgroundColor": "#0D2C54",
        "color": "#FFFFFF"
      },
      "secondary": {
        "backgroundColor": "transparent",
        "color": "#0D2C54",
        "borderColor": "#0D2C54"
      }
    },
    "card": {
      "backgroundColor": "#FFFFFF",
      "borderRadius": "12px",
      "boxShadow": "0 4px 12px rgba(0,0,0,0.1)",
      "padding": "24px"
    },
    "navbar": {
      "backgroundColor": "rgba(255, 255, 255, 0.9)",
      "boxShadow": "0 2px 8px rgba(0,0,0,0.07)",
      "padding": "16px 32px"
    }
  }
};

/** @deprecated Use `designSystem` + `useLanguage()` instead */
export const appData: AppData = {
  designSystem,
  content: contentES,
};
