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
    <div className={`inline-flex items-center justify-center ${className}`}>
      <img
        src={rootedHeartsLogo}
        alt="Rooted Hearts logo"
        className={`h-auto drop-shadow-[0_14px_30px_rgba(0,0,0,0.34)] ${imageClassName}`}
      />
    </div>
  );
};

export default BrandLogo;
