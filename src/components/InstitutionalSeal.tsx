import React from 'react';

export interface InstitutionalSealProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  ariaLabel?: string;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

export const InstitutionalSeal: React.FC<InstitutionalSealProps> = ({
  className = '',
  size = 'md',
  ariaLabel = 'IGNOU Study Centre 2033 Academic Seal',
}) => {
  const sizeClass = typeof size === 'string' ? sizeMap[size] || sizeMap.md : '';
  const inlineStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${sizeClass} ${className}`}
      style={inlineStyle}
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <svg
        viewBox="0 0 512 512"
        className="w-full h-full drop-shadow-xs"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="compSealNavy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="50%" stopColor="#0A192F" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="compGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="compGoldLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="compBookLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="85%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>
          <linearGradient id="compBookRight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="15%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="compRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#991B1B" />
            <stop offset="50%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
        </defs>

        {/* Outer Base & Navy Disc with Gold Border */}
        <circle
          cx="256"
          cy="256"
          r="240"
          fill="url(#compSealNavy)"
          stroke="url(#compGoldGradient)"
          strokeWidth="12"
        />

        {/* Concentric Beaded Rings */}
        <circle
          cx="256"
          cy="256"
          r="222"
          fill="none"
          stroke="url(#compGoldGradient)"
          strokeWidth="3"
          strokeDasharray="6,4"
          opacity="0.85"
        />
        <circle
          cx="256"
          cy="256"
          r="208"
          fill="#0A192F"
          stroke="url(#compGoldGradient)"
          strokeWidth="4"
        />

        {/* Top Arc Inscription */}
        <path id="sealTopPath" d="M 96 256 A 160 160 0 0 1 416 256" fill="none" />
        <text
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="20"
          fontWeight="800"
          fill="url(#compGoldLight)"
          letterSpacing="4"
        >
          <textPath href="#sealTopPath" startOffset="50%" textAnchor="middle">
            INDIRA GANDHI NATIONAL OPEN UNIV
          </textPath>
        </text>

        {/* Lower Arc Inscription */}
        <path id="sealBottomPath" d="M 416 256 A 160 160 0 0 1 96 256" fill="none" />
        <text
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="22"
          fontWeight="800"
          fill="url(#compGoldLight)"
          letterSpacing="4"
        >
          <textPath href="#sealBottomPath" startOffset="50%" textAnchor="middle">
            STUDY CENTRE 2033
          </textPath>
        </text>

        {/* Inner Medallion */}
        <circle cx="256" cy="256" r="162" fill="none" stroke="url(#compGoldGradient)" strokeWidth="4" />
        <circle
          cx="256"
          cy="256"
          r="154"
          fill="url(#compSealNavy)"
          stroke="url(#compGoldLight)"
          strokeWidth="1.5"
        />

        {/* Academic Stars */}
        <g fill="url(#compGoldLight)">
          <polygon
            points="256,122 260,132 271,133 263,140 265,150 256,145 247,150 249,140 241,133 252,132"
            transform="scale(0.8) translate(64, 30)"
          />
          <polygon
            points="226,128 230,138 241,139 233,146 235,156 226,151 217,156 219,146 211,139 222,138"
            transform="scale(0.7) translate(95, 52)"
          />
          <polygon
            points="286,128 290,138 301,139 293,146 295,156 286,151 277,156 279,146 271,139 282,138"
            transform="scale(0.7) translate(130, 52)"
          />
        </g>

        {/* Laurel Wreath */}
        <g fill="url(#compGoldGradient)" opacity="0.9">
          <path d="M 172 320 C 158 300 156 280 162 264 C 160 274 162 292 172 320 Z" />
          <path d="M 184 340 C 168 328 162 312 168 298 C 168 308 174 324 184 340 Z" />
          <path d="M 204 362 C 188 356 180 342 184 328 C 186 338 194 352 204 362 Z" />
          <path d="M 230 376 C 212 376 202 368 204 354 C 208 362 218 372 230 376 Z" />
          <path d="M 340 320 C 354 300 356 280 350 264 C 352 274 350 292 340 320 Z" />
          <path d="M 328 340 C 344 328 350 312 344 298 C 344 308 338 324 328 340 Z" />
          <path d="M 308 362 C 324 356 332 342 328 328 C 326 338 318 352 308 362 Z" />
          <path d="M 282 376 C 300 376 310 368 308 354 C 304 362 294 372 282 376 Z" />
        </g>

        {/* Open Book of Knowledge */}
        <g transform="translate(0, -8)">
          <path
            d="M 160 296 C 204 286 244 294 256 304 C 268 294 308 286 352 296 L 358 302 C 314 292 270 300 256 312 C 242 300 198 292 154 302 Z"
            fill="#92400E"
          />
          <path
            d="M 166 210 C 206 200 242 206 256 218 L 256 296 C 242 284 206 278 166 288 Z"
            fill="url(#compBookLeft)"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
          <path d="M 182 226 C 208 220 232 224 244 231" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 182 242 C 208 236 232 240 244 247" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 182 258 C 208 252 232 256 244 263" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 182 274 C 208 268 232 272 244 279" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />

          <path
            d="M 346 210 C 306 200 270 206 256 218 L 256 296 C 270 284 306 278 346 288 Z"
            fill="url(#compBookRight)"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
          <path d="M 268 231 C 280 224 304 220 330 226" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 268 247 C 280 240 304 236 330 242" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 268 263 C 280 256 304 252 330 258" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 268 279 C 280 272 304 268 330 274" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />

          <path d="M 254 216 L 258 216 L 258 310 L 254 310 Z" fill="#B45309" />
          <path
            d="M 255 218 C 255 250 258 280 262 316 L 256 322 L 250 316 C 253 280 255 250 255 218 Z"
            fill="url(#compRibbon)"
          />
        </g>

        {/* Golden Assessment Feather Quill Pen */}
        <g transform="rotate(-36 256 256)">
          <path
            d="M 256 128 C 242 160 236 200 244 246 C 248 240 252 238 256 236 C 260 238 264 240 268 246 C 276 200 270 160 256 128 Z"
            fill="url(#compGoldGradient)"
          />
          <path d="M 248 168 L 240 160 M 246 188 L 236 182 M 247 208 L 238 204" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          <path d="M 264 168 L 272 160 M 266 188 L 276 182 M 265 208 L 274 204" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          <path d="M 256 124 L 256 280" stroke="#FEF08A" strokeWidth="3" strokeLinecap="round" />
          <path d="M 254 278 L 258 278 L 257 302 L 256 304 L 255 302 Z" fill="#D97706" stroke="#B45309" strokeWidth="1" />
          <line x1="256" y1="288" x2="256" y2="303" stroke="#0F172A" strokeWidth="1.2" />
        </g>

        {/* Base Foundation Ribbon */}
        <g transform="translate(0, 8)">
          <path d="M 194 382 L 318 382 L 308 406 L 204 406 Z" fill="#0A192F" stroke="url(#compGoldGradient)" strokeWidth="2.5" />
          <text
            x="256"
            y="400"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="14"
            fontWeight="900"
            fill="url(#compGoldLight)"
            textAnchor="middle"
            letterSpacing="3"
          >
            ESTD 2033
          </text>
        </g>
      </svg>
    </div>
  );
};
