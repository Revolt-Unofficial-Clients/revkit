export interface ThemeSettings {
  accent?: string;
  background?: string;
  block?: string;
  error?: string;
  foreground?: string;
  hover?: string;
  mention?: string;
  "message-box"?: string;
  "primary-background"?: string;
  "primary-header"?: string;
  "scrollbar-thumb"?: string;
  "secondary-background"?: string;
  "secondary-foreground"?: string;
  "secondary-header"?: string;
  "status-away"?: string;
  "status-busy"?: string;
  "status-invisible"?: string;
  "status-online"?: string;
  success?: string;
  "tertiary-background"?: string;
  "tertiary-foreground"?: string;
  warning?: string;
  tooltip?: string;
  "scrollbar-track"?: string;
  "status-focus"?: string;
  "status-streaming"?: string;
  light?: boolean;
}

export const DEFAULT_THEME: ThemeSettings = {
  accent: "#FD6671",
  background: "#191919",
  foreground: "#F6F6F6",
  block: "#2D2D2D",
  "message-box": "#363636",
  mention: "rgba(251, 255, 0, 0.06)",
  success: "#65E572",
  warning: "#FAA352",
  tooltip: "#000000",
  error: "#ED4245",
  hover: "rgba(0, 0, 0, 0.1)",
  "scrollbar-thumb": "#CA525A",
  "scrollbar-track": "transparent",
  "primary-background": "#242424",
  "primary-header": "#363636",
  "secondary-background": "#1E1E1E",
  "secondary-foreground": "#C8C8C8",
  "secondary-header": "#2D2D2D",
  "tertiary-background": "#4D4D4D",
  "tertiary-foreground": "#848484",
  "status-online": "#3ABF7E",
  "status-away": "#F39F00",
  "status-focus": "#4799F0",
  "status-busy": "#F84848",
  "status-streaming": "#977EFF",
  "status-invisible": "#A5A5A5",
  light: false,
};
