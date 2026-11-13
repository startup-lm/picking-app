/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                bg: "#F3F4F6",
                card: "#FFFFFF",
                border: "#BDBDBD",
                muted: "#9ca3af",
                primary: "var(--color-primary)",
                accent: "var(--color-accent)",
                accentSoft: "var(--color-accent-soft)",
                text: "#111827",
                danger: "#C0392B",
                success: "#2E7D32",
                bgInput: "#FFFFFF"
            }
        },
    },
    plugins: [],
};
