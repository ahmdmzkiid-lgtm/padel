const LogoIcon = ({ className = "w-10 h-10" }) => {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Outer loop */}
      <path d="M14 10C14 7.79086 15.7909 6 18 6H28C35.732 6 42 12.268 42 20C42 27.732 35.732 34 28 34H18C15.7909 34 14 32.2091 14 30V10Z" fill="url(#grad1)" fillOpacity="0.9"/>
      
      {/* Inner accent loop */}
      <path d="M14 20C14 17.7909 15.7909 16 18 16H24C28.4183 16 32 19.5817 32 24C32 28.4183 28.4183 32 24 32H18C15.7909 32 14 30.2091 14 28V20Z" fill="url(#grad2)"/>
      
      {/* Stem */}
      <rect x="6" y="6" width="8" height="36" rx="4" fill="url(#grad3)"/>
      
      {/* Subtle details (like padel holes) */}
      <circle cx="34" cy="20" r="1.5" fill="white" fillOpacity="0.8" />
      <circle cx="28" cy="14" r="1.5" fill="white" fillOpacity="0.8" />
      <circle cx="28" cy="26" r="1.5" fill="white" fillOpacity="0.8" />

      <defs>
        <linearGradient id="grad1" x1="14" y1="6" x2="42" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" /> {/* emerald-500 */}
          <stop offset="1" stopColor="#047857" /> {/* emerald-700 */}
        </linearGradient>
        <linearGradient id="grad2" x1="14" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A7F3D0" /> {/* emerald-200 */}
          <stop offset="1" stopColor="#10B981" /> {/* emerald-500 */}
        </linearGradient>
        <linearGradient id="grad3" x1="6" y1="6" x2="14" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" /> {/* emerald-400 */}
          <stop offset="1" stopColor="#059669" /> {/* emerald-600 */}
        </linearGradient>
      </defs>
    </svg>
  );
};

export default LogoIcon;
