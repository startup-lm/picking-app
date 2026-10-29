/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                bg: "#F3F3F3",
                card: "#FFFFFF",
                border: "#BDBDBD",
                muted: "#9ca3af",
                accent: "#fde68a",
                yellow: "#FFD600",
                red: "#C62828",
                text: "#111827",
                danger: '#C0392B',
                success: '#2E7D32',
                bgInput: "#FFFFFF"
            }
        },
    },
    plugins: [],
};
