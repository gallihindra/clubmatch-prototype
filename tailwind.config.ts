import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211c",
        court: "#0f8a74",
        lime: "#d8f06f",
        mist: "#f4f8f4",
        clay: "#ef744b"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 33, 28, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
