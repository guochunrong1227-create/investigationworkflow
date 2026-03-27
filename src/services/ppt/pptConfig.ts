/**
 * PPT Style Configuration
 * Default: Roland Berger Style
 */

export interface PPTStyle {
  name: string;
  colors: {
    primary: string;    // Roland Berger Dark Blue
    secondary: string;  // Light Blue/Gray
    accent: string;     // Highlight color
    text: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: {
    padding: number;
    titleSize: number;
    bodySize: number;
  };
}

export const ROLAND_BERGER_STYLE: PPTStyle = {
  name: "Roland Berger",
  colors: {
    primary: "003366",    // Deep Blue
    secondary: "E6EEF5",  // Very Light Blue
    accent: "FF6600",     // Orange accent (optional)
    text: "333333",
    background: "FFFFFF"
  },
  fonts: {
    heading: "Arial",
    body: "Arial"
  },
  layout: {
    padding: 0.5,
    titleSize: 28,
    bodySize: 14
  }
};

export const DEFAULT_STYLE = ROLAND_BERGER_STYLE;
