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
                primary: "#0F4C5C",
                accent: "#F2A541",
                accentSoft: "#FCE7C8",
                text: "#111827",
                danger: "#C0392B",
                success: "#2E7D32",
                bgInput: "#FFFFFF"
            }
        },
    },
    plugins: [],
};
