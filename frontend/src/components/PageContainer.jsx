import React, { useMemo } from 'react';

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
  const style = useMemo(() => {
    const baseStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflowY: 'auto', // Internal scroll
      paddingBottom: 'var(--nav-height)', // Space for Nav
      transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease',
      willChange: 'transform',
      backgroundColor: 'var(--bg-dark)', // Ensure opaque formatting
      // Hide scrollbar for this container specifically
      scrollbarWidth: 'none',
    };

    if (isNavPage) {
      // It's a Nav Page: participate in the Horizontal Strip
      // If we are currently looking at a Secondary page, we generally want the "Last Active Nav Page" to stay put? 
      // Or if checking logic: The Active Page might be 'wallet'.
      // If Active Page is 'wallet', activeIndex is -1.
      // We need to know which Nav Page is separate from Active Page.
      // For simplicity: If activePage is NOT a nav page, we froze the Nav Strip?
      // Let's assume strict Horizontal Strip Logic only applies when switching BETWEEN Nav pages.

      let targetX = 0;

      if (activeIndex !== -1) {
        // We are on a nav page
        targetX = (myIndex - activeIndex) * 100;
      } else {
        // We are on a secondary page.
        // The nav pages should sit in background.
        // Usually we want them to stay where they were?
        // Limitation: We don't know "Previous Nav Page".
        // Hack: All Nav pages sit at 0? No, that overlaps them.
        // Let's hide them or keep them stationary? 
        // For now, let's keep them at scale 0.95 or similar to show depth?
        // Or actually, user didn't ask for depth.
        // Default: If invalid active index, treat as index 2 (Middle) or just hide?
        // Better: We will pass "lastActiveNavIndex" from App if needed.
        // For this specific 'Side by Side' requirement, I will calculate shift.
        targetX = (myIndex - (activeIndex === -1 ? 0 : activeIndex)) * 100; // Fallback 0 is weird.
      }

      return {
        ...baseStyle,
        transform: `translate3d(${targetX}%, 0, 0)`,
        zIndex: 1,
        opacity: Math.abs(targetX) > 100 ? 0 : 1, // Optimization: Hide if far away
        pointerEvents: isActive ? 'auto' : 'none',
      };
    } else {
      // Secondary Page
      // Enter from Right (standard mobile detail) or Bottom?
      // User said "Side by Side" "Base will move".
      // Maybe Secondary pages are also on the right?
      // Let's make them Slide Up for distinct feel, or Slide In Right.
      // Slide In Right feels cleaner for "Drilling down".
      // If active, 0. If not, 100% (Right).
      return {
        ...baseStyle,
        transform: isActive ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)',
        zIndex: 20, // Above Nav
        paddingBottom: 0, // Cover Nav? Usually details cover nav.
        opacity: isActive ? 1 : 0,
        pointerEvents: isActive ? 'auto' : 'none',
      };
    }
  }, [activeIndex, myIndex, isNavPage, isActive]);

  return (
    <div className={`page-container ${className}`} style={style}>
      {children}
    </div>
  );
};

export default PageContainer;
