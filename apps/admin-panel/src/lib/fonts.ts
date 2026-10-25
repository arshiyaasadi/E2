// Self-hosted fonts — no Google Fonts fetch at build time (Docker / offline safe).
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

/** CSS class hooks kept for compatibility with layout markup. */
export const vazirmatn = { variable: "font-[family-name:Vazirmatn]" };
export const inter = { variable: "font-[family-name:Inter]" };
