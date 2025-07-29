import { ReactNode } from 'react';
import { useAdaptiveDensity, DensityLevel } from '../../hooks/useAdaptiveDensity';

interface AdaptiveDensityProviderProps {
  children: ReactNode;
  userPreference?: DensityLevel;
  className?: string;
}

/**
 * Componente wrapper para aplicar densidade adaptativa
 */
export function AdaptiveDensityProvider({
  children,
  userPreference,
  className = '',
}: AdaptiveDensityProviderProps) {
  const { classes, cssVariables } = useAdaptiveDensity(userPreference);

  return (
    <div
      className={`${classes} ${className}`}
      style={cssVariables as React.CSSProperties}
    >
      {children}
    </div>
  );
}