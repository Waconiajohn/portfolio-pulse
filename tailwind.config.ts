import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1400px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'DM Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'metric': ['2.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        'metric-sm': ['1.75rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        status: {
          good: "hsl(var(--status-good))",
          warning: "hsl(var(--status-warning))",
          critical: "hsl(var(--status-critical))",
          "good-bg": "hsl(var(--status-good) / 0.1)",
          "warning-bg": "hsl(var(--status-warning) / 0.1)",
          "critical-bg": "hsl(var(--status-critical) / 0.1)",
        },
        finance: {
          positive: "hsl(var(--finance-positive))",
          negative: "hsl(var(--finance-negative))",
          neutral: "hsl(var(--finance-neutral))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
          6: "hsl(var(--chart-6))",
        },
        // Origin-inspired premium colors
        partner: {
          DEFAULT: "hsl(280, 60%, 60%)",
          foreground: "hsl(280, 60%, 98%)",
          muted: "hsl(280, 40%, 95%)",
        },
        premium: {
          gold: "hsl(45, 93%, 47%)",
          silver: "hsl(210, 10%, 70%)",
          bronze: "hsl(30, 50%, 50%)",
        },
      },
      borderRadius: {
        'lg': "var(--radius)",
        'md': "calc(var(--radius) - 2px)",
        'sm': "calc(var(--radius) - 4px)",
        'xl': "calc(var(--radius) + 4px)",
        '2xl': "calc(var(--radius) + 8px)",
        '3xl': "1.5rem",
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.05)',
        'soft-md': '0 4px 12px -4px rgba(0, 0, 0, 0.08), 0 8px 24px -8px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 8px 24px -8px rgba(0, 0, 0, 0.1), 0 16px 48px -16px rgba(0, 0, 0, 0.08)',
        'glow-green': '0 0 20px -5px hsl(var(--status-good) / 0.3)',
        'glow-yellow': '0 0 20px -5px hsl(var(--status-warning) / 0.3)',
        'glow-red': '0 0 20px -5px hsl(var(--status-critical) / 0.3)',
        'card-hover': '0 8px 30px -10px rgba(0, 0, 0, 0.15)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'status-good-gradient': 'linear-gradient(135deg, hsl(var(--status-good) / 0.1) 0%, transparent 50%)',
        'status-warning-gradient': 'linear-gradient(135deg, hsl(var(--status-warning) / 0.1) 0%, transparent 50%)',
        'status-critical-gradient': 'linear-gradient(135deg, hsl(var(--status-critical) / 0.1) 0%, transparent 50%)',
        'primary-gradient': 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "bounce-x": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(4px)" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        // Origin-inspired animations
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "number-count": {
          from: { opacity: "0.5" },
          to: { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 currentColor" },
          "50%": { boxShadow: "0 0 20px -5px currentColor" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "progress-stripe": {
          from: { backgroundPosition: "1rem 0" },
          to: { backgroundPosition: "0 0" },
        },
        "confetti": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(-100vh) rotate(720deg)", opacity: "0" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-1deg)" },
          "50%": { transform: "rotate(1deg)" },
        },
        "ring-pulse": {
          "0%": { strokeDashoffset: "283" },
          "100%": { strokeDashoffset: "var(--target-offset, 0)" },
        },
        "card-entrance": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "hero-number": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "bounce-x": "bounce-x 1s ease-in-out infinite",
        "fade-out": "fade-out 1.5s ease-out forwards",
        // New animations
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "fade-in-down": "fade-in-down 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "slide-in-left": "slide-in-left 0.4s ease-out",
        "number-count": "number-count 0.6s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "progress-stripe": "progress-stripe 1s linear infinite",
        "confetti": "confetti 3s ease-out forwards",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
        "wiggle": "wiggle 0.3s ease-in-out",
        "ring-pulse": "ring-pulse 1s ease-out forwards",
        "card-entrance": "card-entrance 0.5s ease-out forwards",
        "hero-number": "hero-number 0.8s ease-out forwards",
        // Stagger delays
        "stagger-1": "fade-in-up 0.4s ease-out 0.1s forwards",
        "stagger-2": "fade-in-up 0.4s ease-out 0.2s forwards",
        "stagger-3": "fade-in-up 0.4s ease-out 0.3s forwards",
        "stagger-4": "fade-in-up 0.4s ease-out 0.4s forwards",
        "stagger-5": "fade-in-up 0.4s ease-out 0.5s forwards",
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
