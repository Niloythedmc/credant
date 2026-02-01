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

    const runVerificationParams = async () => {
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

        try {
          const result = await post('/channels/check-purity', {
            channelId,
            userId: user.uid || user.id,
            referrerId
          });
          console.log("Check-purity result:", result); // DEBUG

          if (result.success) {
            if (result.alreadyVerified || result.verified) {
              // If verified (even if already), start tracking interaction
              // We store channelId in state to track interaction
              setTrackingStart({ channelId: channelId, time: Date.now() });
              addNotification('success', 'Verification started! Explore the app.');
            } else {
              addNotification('warning', 'Please join the channel to verify.');
            }
          } else {
            if (result.reason === 'not_member') {
              addNotification('warning', 'Please join the channel to verify.');
            }
          }
        } catch (error) {
          console.error("Purity check failed", error);
        }
      } else {
        console.warn("start_param did not match regex format");
      }
      setPurityChecked(true);
    };

    runVerificationParams();
  }, [user, authLoading, purityChecked, post, addNotification]);

  // INTERACTION TRACKER LOGIC
  const [trackingStart, setTrackingStart] = useState(null); // { channelId, time }
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    if (!trackingStart) return;

    const handleClick = () => {
      setClickCount(prev => {
        const newCount = prev + 1;
        // Check thresholds: 5 clicks
        if (newCount >= 5) {
          const duration = Date.now() - trackingStart.time;
          // Check duration: 20s (20000ms)
          if (duration >= 20000) {
            // Check Username
            const tgUser = WebApp.initDataUnsafe?.user;
            const hasUsername = (user.username) || (tgUser && tgUser.username) || (user.wallet && user.wallet.address);

            if (hasUsername) {
              post('/channels/mark-pure', {
                channelId: trackingStart.channelId,
                userId: user.uid || user.id
              })
                .then(() => {
                  setTrackingStart(null); // Stop tracking
                })
                .catch(err => console.error("Mark Pure Failed", err));
            }
          }
        }
        return newCount;
      });
    };

    // Also check time interval purely? 
    // The user wants "stay... 20s AND clicks...". 
    // So we check on every click, but what if they click 10 times in 5s then wait 20s?
    // We need a timer to check after 20s if clicks are satisfied?
    // Or check on click if time satisfied.
    // Let's check on click. If they click active, they are active.
    // If they click 5 times quickly, they have clicks. Wait for 20s.
    // Better: when clicks >= 5, set a timeout to check time?
    // Simplest: Check on every click. If time not passed, wait for next click?
    // Risk: User clicks 5 times then stops clicking. 20s passes. No event triggers.
    // Fix: Set an interval to check actively if clicks met.

    const interval = setInterval(() => {
      if (clickCount >= 5) {
        const duration = Date.now() - trackingStart.time;
        if (duration >= 20000) {
          const hasUsername = user.username; // Strict TG username
          if (hasUsername) {
            post('/channels/mark-pure', {
              channelId: trackingStart.channelId,
              userId: user.uid || user.id
            })
              .then(() => {
                addNotification('success', 'You are marked as a Pure User! 🌟');
                setTrackingStart(null);
                setClickCount(0);
              })
              .catch(console.error);
          }
        }
      }
    }, 5000); // Check every 5s

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      clearInterval(interval);
    };
  }, [trackingStart, clickCount, user, post, addNotification]);

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
