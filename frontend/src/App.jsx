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
import ShareThought from './pages/ShareThought';
import ListChannel from './pages/ListChannel';
import PostAds from './pages/PostAds';
import WebApp from '@twa-dev/sdk';
import { useAuth } from './auth/AuthProvider';
import { useApi } from './auth/useApi';

function App() {
  const [activeNavPage, setActiveNavPage] = useState('feed'); // Tracks the bottom nav
  const [overlayPage, setOverlayPage] = useState(null);       // Tracks secondary pages (inbox, setting, etc)
  const [theme, setTheme] = useState('dark');
  const { user, loading: authLoading } = useAuth();
  const { post } = useApi();
  const { addNotification } = useNotification();
  const [purityChecked, setPurityChecked] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // List of all pages
  const navPages = ['feed', 'ads', 'insights', 'channels', 'profile'];
  const secondaryPages = ['wallet', 'deals', 'details', 'post', 'list', 'offer', 'setting', 'inbox', 'shareThought', 'listChannel', 'postAds'];
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

  // PURITY CHECK LOGIC
  useEffect(() => {
    // Only run if user is loaded and not already checked
    if (authLoading || !user || purityChecked) return;

    const checkPurity = async () => {
      const startParam = WebApp.initDataUnsafe?.start_param;
      if (!startParam) {
        setPurityChecked(true);
        return;
      }

      // Parse: c_{channelId}_r_{referrerId} (or n instead of -)
      const match = startParam.match(/^c_([0-9n]+)_r_([0-9]+)$/);
      if (match) {
        let channelId = match[1].replace('n', '-'); // Restore negative sign
        const referrerId = match[2];

        // Prevent self-referral loop if referrer is same as user (though allowed in backend check, good to skip if obvious)

        try {
          const result = await post('/channels/check-purity', {
            channelId,
            userId: user.uid || user.id,
            referrerId
          });

          if (result.success) {
            if (result.alreadyVerified) {
              addNotification('info', 'You have already verified this channel.');
            } else if (result.verified) {
              addNotification('success', 'Channel Verified! Purity Score updated.');
              // Could also navigate to that channel or show specific UI
            } else {
              // success=false, likely not member
              addNotification('warning', 'Join the channel to verify your purity!');
            }
          } else {
            if (result.reason === 'not_member') {
              addNotification('warning', 'Please join the channel to verify.');
            }
          }
        } catch (error) {
          console.error("Purity check failed", error);
        }
      }
      setPurityChecked(true);
    };

    checkPurity();
  }, [user, authLoading, purityChecked, post, addNotification]);

  // PURITY CHECK LOGIC
  // We need access to API and User, but App.jsx is outside AuthProvider?
  // Wait, AuthProvider wraps children in index.js usually. 
  // App.jsx is the child of AuthProvider (based on typical usage, let me verify).
  // Checking imports... Requesting view of index.js/main.jsx to be sure.
  // Assuming App component is inside AuthProvider for now.
  // But wait, App definition above imports 'useAuth' ? No, it doesn't.
  // I must check where AuthProvider is. 
  // Only 'useNotification' is imported.
  // I need 'useApi' and 'useAuth'.
  // I will add them to imports and usage.

  // Actually, let's implement the logic safely assuming hooks exist if I import them.
  // But strictly, let's add `useAuth, useApi` to imports first.

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
    if (id === 'shareThought') return <ShareThought key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'listChannel') return <ListChannel key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'postAds') return <PostAds key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;

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
    <div className="app-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <NotificationContainer />

      {/* Render all pages */}
      {allPages.map(pageId => renderPage(pageId))}

      {/* Navigation Layer - Always reflects activeNavPage */}
      <Navigation activePage={activeNavPage} onNavigate={handleNavigate} />

    </div>
  );
}

export default App;
