import type { Config } from "tailwindcss";

const config: Config = {
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ["var(--font-geist-sans)"],
  			mono: ["var(--font-geist-mono)"],
  		},
  		fontSize: {
  			'xs': '0.75rem',    // 12px
  			'sm': '0.875rem',   // 14px
  			'base': '0.9375rem', // 15px
  			'lg': '1.0625rem',  // 17px
  			'xl': '1.125rem',   // 18px
  			'2xl': '1.375rem',  // 22px
  			'3xl': '1.75rem',   // 28px
  			'4xl': '2.25rem',   // 36px
  			'5xl': '2.75rem',   // 44px
  		},
  		animation: {
  			'gradient': 'gradient 8s linear infinite',
  			'float': 'float 3s ease-in-out infinite',
  			'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'shine': 'shine 1.5s linear infinite',
        'heartbeat': 'heartbeat 0.5s ease-in-out',
        'bounce': 'bounce 0.5s ease-in-out',
  		},
  		keyframes: {
  			gradient: {
  				'0%, 100%': {
  					'background-size': '200% 200%',
  					'background-position': 'left center',
  				},
  				'50%': {
  					'background-size': '200% 200%',
  					'background-position': 'right center',
  				},
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0)',
  				},
  				'50%': {
  					transform: 'translateY(-10px)',
  				},
  			},
  			shine: {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(100%)' },
  			},
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.25)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
  		},
  		scale: {
  			'102': '1.02',
  		},
  	}
  },
  plugins: [],
};
export default config;
