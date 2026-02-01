import React, { useMemo } from 'react';
import styles from './PageContainer.module.css';

/**
 * PageContainer
 * Handles the "Side by Side" positioning logic.
 * 
 * @param {string} id - The unique identifier for the page.
 * @param {string} activePage - The currently active page ID.
 * @param {number} index - The horizontal order index (0-4) for Nav pages. Undefined for Secondary.
 * @param {number} zIndex - Custom z-index for layering.
 * @param {React.ReactNode} children - Page content.
 */
const PageContainer = ({ id, activePage, index, children, className = '' }) => {

  // Define the order of main pages for calculation
  const NAV_ORDER = ['feed', 'ads', 'insights', 'channels', 'profile'];

  const activeIndex = NAV_ORDER.indexOf(activePage);
  const myIndex = NAV_ORDER.indexOf(id);

  const isNavPage = myIndex !== -1;
  const isActive = id === activePage;

  // Style Calculation
  const dynamicStyle = useMemo(() => {
    // Dynamic styles that depend on state logic
    if (isNavPage) {
      // It's a Nav Page: participate in the Horizontal Strip
      let targetX = 0;

      if (activeIndex !== -1) {
        // We are on a nav page
        targetX = (myIndex - activeIndex) * 100;
      } else {
        // We are on a secondary page.
        // For this specific 'Side by Side' requirement, I will calculate shift.
        targetX = (myIndex - (activeIndex === -1 ? 0 : activeIndex)) * 100;
      }

      return {
        transform: `translate3d(${targetX}%, 0, 0)`,
        zIndex: 1,
        opacity: Math.abs(targetX) > 100 ? 0 : 1, // Optimization
        pointerEvents: isActive ? 'auto' : 'none',
      };
    } else {
      // Secondary Page
      return {
        transform: isActive ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)',
        opacity: isActive ? 1 : 0,
        pointerEvents: isActive ? 'auto' : 'none',
        zIndex: 2000 // Ensure it covers the Bottom Nav
      };
    }
  }, [activeIndex, myIndex, isNavPage, isActive]);

  const containerClass = `${styles.pageContainer} ${!isNavPage ? styles.secondaryPage : ''} ${className}`;

  return (
    <div className={containerClass} style={dynamicStyle}>
      {children}
    </div>
  );
};

export default PageContainer;
