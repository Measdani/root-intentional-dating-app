import React from 'react';
import rootedHeartsLogo from '@/assets/rooted-hearts-logo.png';

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  imageClassName = 'w-[120px] sm:w-[144px]',
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-[28px] border border-[#E8EDDF]/18 bg-white/95 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.28)] ${className}`}
    >
      <img
        src={rootedHeartsLogo}
        alt="Rooted Hearts logo"
        className={`h-auto ${imageClassName}`}
      />
    </div>
  );
};

export default BrandLogo;
