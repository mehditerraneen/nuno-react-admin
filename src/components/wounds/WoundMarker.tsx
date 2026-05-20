import React, { useState } from 'react';
import { type WoundStatus } from '../../types/wounds';
import type { Wound } from '../../types';

/**
 * Props for WoundMarker component
 */
interface WoundMarkerProps {
  wound: Wound;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onRightClick?: () => void;
}

/**
 * Status color mapping (matching Django template colors)
 */
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#ff6b6b',    // Red - active wound
  HEALED: '#51cf66',    // Green - healed
  INFECTED: '#ffa500',  // Orange - infected
  IMPROVING: '#4dabf7', // Blue - improving
  STABLE: '#868e96',    // Gray - stable
  ARCHIVED: '#9e9e9e',  // Grey - archived
};

/**
 * WoundMarker Component
 *
 * Renders a circular marker on the body map SVG to indicate wound location.
 *
 * Features:
 * - Color-coded by wound status (matching Django template)
 * - Hover effects with scale animation
 * - Click handlers (single, double, right-click)
 * - Drop shadow for depth
 * - Shows wound ID
 */
export const WoundMarker = ({
  wound,
  onClick,
  onDoubleClick,
  onRightClick,
}: WoundMarkerProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const color = STATUS_COLORS[wound.status] || '#ff6b6b';
  const radius = isHovered ? 10 : 8;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDoubleClick) {
      onDoubleClick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRightClick) {
      onRightClick();
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <g
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      className="wound-marker"
    >
      {/* Main circle */}
      <circle
        cx={wound.x_position}
        cy={wound.y_position}
        r={radius}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        style={{
          filter: isHovered ? 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' : 'none',
          transition: 'all 0.2s ease'
        }}
      />

      {/* Wound ID text (visible at appropriate zoom levels) */}
      <text
        x={wound.x_position}
        y={wound.y_position + 20}
        textAnchor="middle"
        fill="#333"
        fontSize="10"
        fontWeight="500"
        fontFamily="Arial, sans-serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        #{wound.id}
      </text>
    </g>
  );
};

/**
 * Utility function to generate marker labels
 */
export function generateWoundMarkerLabels(woundCount: number): string[] {
  return Array.from({ length: woundCount }, (_, i) => (i + 1).toString());
}
