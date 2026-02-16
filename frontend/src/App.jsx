import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import GenericPage from './pages/GenericPage';
import Feed from './pages/Feed';

import Profile from './pages/Profile';
import Channels from './pages/Channels';
import Ads from './pages/Ads';

import { NotificationProvider, useNotification } from './context/NotificationContext';
import NotificationContainer from './components/Notification/NotificationContainer';
import Inbox from './pages/Inbox';
import Setting from './pages/Setting';

import ListChannel from './pages/ListChannel';
import PostAds from './pages/PostAds';
import RequestDeal from './pages/RequestDeal';
import OfferDetails from './pages/OfferDetails';
import WebApp from '@twa-dev/sdk';
import { useAuth } from './auth/AuthProvider';
import { useApi } from './auth/useApi';
import { TelegramProvider, useTelegram } from './context/TelegramContext';

const AppContent = () => {
  const [activeNavPage, setActiveNavPage] = useState('feed'); // Tracks the bottom nav
  const [overlayPage, setOverlayPage] = useState(null);       // Tracks secondary pages (inbox, setting, etc)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const { user, loading: authLoading } = useAuth();
  const { post } = useApi();
  const { addNotification } = useNotification();
  const [purityChecked, setPurityChecked] = useState(false);

  // TELEGRAM BACK BUTTON LOGIC (App Level Overlay - Layer 20)
  const { registerBackHandler } = useTelegram();
  useEffect(() => {
    if (overlayPage) {
      return registerBackHandler(20, () => setOverlayPage(null));
    }
  }, [overlayPage, registerBackHandler]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // List of all pages
  const navPages = ['feed', 'ads', 'channels', 'profile'];
  const secondaryPages = ['wallet', 'deals', 'details', 'post', 'list', 'offer', 'setting', 'inbox', 'listChannel', 'postAds', 'requestDeal', 'offerDetails'];
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

  // FULLSCREEN LOGIC
  useEffect(() => {
    try {
      WebApp.requestFullscreen();
      // Ensure expand too just in case
      WebApp.expand();
    } catch (e) {
      console.log('Fullscreen/Expand failed (likely not in TWA)', e);
    }
  }, []);

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

  const renderPage = (id) => {
    const relevantActivePage = navPages.includes(id) ? activeNavPage : overlayPage;

    if (id === 'feed') return <Feed key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'ads') return <Ads key={id} activePage={relevantActivePage} onNavigate={handleNavigate} isOverlayOpen={!!overlayPage} />;
    if (id === 'profile') return <Profile key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'channels') return <Channels key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'inbox') return <Inbox key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'setting') return <Setting key={id} activePage={relevantActivePage} onNavigate={handleNavigate} theme={theme} toggleTheme={toggleTheme} />;
    if (id === 'listChannel') return <ListChannel key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'postAds') return <PostAds key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'requestDeal') return <RequestDeal key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;
    if (id === 'offerDetails') return <OfferDetails key={id} activePage={relevantActivePage} onNavigate={handleNavigate} />;

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
};

const App = () => {
  return (
    <TelegramProvider>
      <AppContent />
    </TelegramProvider>
  );
};

export default App;
