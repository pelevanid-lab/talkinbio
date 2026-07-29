import React from 'react';

interface AgentIconProps {
  className?: string;
  size?: number;
}

export const SauleIcon = ({ className = '', size = 32 }: AgentIconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 108 108" 
    width={size} 
    height={size} 
    className={className}
    role="img" 
    aria-label="Assistant Agent"
  >
    <defs>
      <style>
        {`
          @keyframes dotBlink {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          @keyframes pillBreathe {
            0%, 100% { transform: scale(1); transform-origin: center; }
            50% { transform: scale(1.02); transform-origin: center; }
          }
          .saule-pill { animation: pillBreathe 3s ease-in-out infinite; }
          .saule-dot-1 { animation: dotBlink 1.5s infinite; animation-delay: 0s; }
          .saule-dot-2 { animation: dotBlink 1.5s infinite; animation-delay: 0.2s; }
          .saule-dot-3 { animation: dotBlink 1.5s infinite; animation-delay: 0.4s; }
        `}
      </style>
    </defs>
    
    <rect x="14" y="37" width="80" height="34" rx="17" fill="#FFFFFF" stroke="#FF6A5C" strokeWidth="1.5" className="saule-pill"/>
    <circle cx="34" cy="54" r="4.5" fill="#14231F" className="saule-dot-1"/>
    <circle cx="54" cy="54" r="4.5" fill="#14231F" className="saule-dot-2"/>
    <circle cx="74" cy="54" r="4.5" fill="#14231F" className="saule-dot-3"/>
  </svg>
);

export const BeiweIcon = ({ className = '', size = 32 }: AgentIconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 108 108" 
    width={size} 
    height={size} 
    className={className}
    role="img" 
    aria-label="Creative Agent"
  >
    <defs>
      <style>
        {`
          @keyframes dotBlinkBeiwe {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          @keyframes pillBreatheBeiwe {
            0%, 100% { transform: scale(1); transform-origin: center; }
            50% { transform: scale(1.02); transform-origin: center; }
          }
          .beiwe-pill { animation: pillBreatheBeiwe 3s ease-in-out infinite; animation-delay: 0.5s; }
          .beiwe-dot-1 { animation: dotBlinkBeiwe 1.5s infinite; animation-delay: 0.5s; }
          .beiwe-dot-2 { animation: dotBlinkBeiwe 1.5s infinite; animation-delay: 0.7s; }
          .beiwe-dot-3 { animation: dotBlinkBeiwe 1.5s infinite; animation-delay: 0.9s; }
        `}
      </style>
    </defs>
    
    <rect x="14" y="37" width="80" height="34" rx="17" fill="#FFFFFF" stroke="#50e3c2" strokeWidth="1.5" className="beiwe-pill"/>
    <circle cx="34" cy="54" r="4.5" fill="#14231F" className="beiwe-dot-1"/>
    <circle cx="54" cy="54" r="4.5" fill="#14231F" className="beiwe-dot-2"/>
    <circle cx="74" cy="54" r="4.5" fill="#14231F" className="beiwe-dot-3"/>
  </svg>
);
