import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import GenericPage from './pages/GenericPage';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Channels from './pages/Channels';
import Ads from './pages/Ads';
import Insights from './pages/Insights';

import { NotificationProvider, useNotification } from './context/NotificationContext';
import NotificationContainer from './components/Notification/NotificationContainer';
import Inbox from './pages/Inbox';
import Setting from './pages/Setting';
import WebApp from '@twa-dev/sdk';


function App() {
  const [activeNavPage, setActiveNavPage] = useState('feed'); // Tracks the bottom nav
  const [overlayPage, setOverlayPage] = useState(null);       // Tracks secondary pages (inbox, setting, etc)
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // List of all pages
  const navPages = ['feed', 'ads', 'insights', 'channels', 'profile'];
  const secondaryPages = ['wallet', 'deals', 'details', 'post', 'list', 'offer', 'setting', 'inbox'];
  const allPages = [...navPages, ...secondaryPages];

  // Helper to handle navigation
  const handleNavigate = (page) => {
    if (navPages.includes(page)) {
      setActiveNavPage(page);
      setOverlayPage(null); // Clear overlay when switching main tabs
    } else {
      setOverlayPage(page);
    }
  };

  // TELEGRAM BACK BUTTON LOGIC
  useEffect(() => {
    if (overlayPage) {
      WebApp.BackButton.show();
      const handleBack = () => {
        setOverlayPage(null); // Close overlay
      };
      WebApp.BackButton.onClick(handleBack);

      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    } else {
      WebApp.BackButton.hide();
    }
  }, [overlayPage]);

  const renderPage = (id) => {
    // Determine which "active" state this page cares about
    // Nav pages display if they equal activeNavPage
    // Secondary pages display if they equal overlayPage

    // PageContainer uses `activePage` prop to determine visibility/position.
    // For a Nav Page, we pass `activeNavPage` so it can position itself relative to other nav pages.
    // For a Secondary Page, we pass `overlayPage` so it shows if it matches.
    const relevantActivePage = navPages.includes(id) ? activeNavPage : overlayPage;

    if (id === 'feed') return <Feed key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'ads') return <Ads key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'insights') return <Insights key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'profile') return <Profile key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'channels') return <Channels key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'inbox') return <Inbox key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'setting') return <Setting key={id} activePage={relevantActivePage} onNavigate={handleNavigate} theme={theme} toggleTheme={toggleTheme} />;

    return (
      <GenericPage
        key={id}
        id={id}
        activePage={relevantActivePage}
        onNavigate={handleNavigate}
        title={id.charAt(0).toUpperCase() + id.slice(1)}
      />
    );
  };

  return (
    <NotificationProvider>
      <div className="app-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <NotificationContainer />

        {/* Render all pages */}
        {allPages.map(pageId => renderPage(pageId))}

        {/* Navigation Layer - Always reflects activeNavPage */}
        <Navigation activePage={activeNavPage} onNavigate={handleNavigate} />

      </div>
    </NotificationProvider>
  );
}

export default App;
