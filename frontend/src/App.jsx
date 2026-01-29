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

const NotificationTester = () => {
  const { addNotification } = useNotification();
  return (
    <div style={{ position: 'fixed', bottom: 150, left: 20, zIndex: 9999, display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: '300px' }}>
      <button className="btn" onClick={() => addNotification('info', 'Information message')}>Info</button>
      <button className="btn" onClick={() => addNotification('success', 'Operation successful')}>Success</button>
      <button className="btn" onClick={() => addNotification('warning', 'Warning alert')}>Warning</button>
      <button className="btn" onClick={() => addNotification('error', 'Critical failure')}>Error</button>
    </div>
  );
};

function App() {
  const [activePage, setActivePage] = useState('feed');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // List of all pages
  const navPages = ['feed', 'ads', 'insights', 'channels', 'profile'];
  const secondaryPages = ['wallet', 'deals', 'details', 'post', 'list', 'offer', 'setting'];
  const allPages = [...navPages, ...secondaryPages];

  const renderPage = (id) => {
    if (id === 'feed') return <Feed key={id} activePage={activePage} />;
    if (id === 'ads') return <Ads key={id} activePage={activePage} />;
    if (id === 'insights') return <Insights key={id} activePage={activePage} />;
    if (id === 'profile') return <Profile key={id} activePage={activePage} />;
    if (id === 'channels') return <Channels key={id} activePage={activePage} />;
    return (
      <GenericPage
        key={id}
        id={id}
        activePage={activePage}
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

        {/* Navigation Layer */}
        <Navigation activePage={activePage} onNavigate={setActivePage} />

        {/* Debug Tester */}
        <NotificationTester />

        {/* Back button for secondary pages */}
        {!navPages.includes(activePage) && (
          <button
            className="btn"
            style={{ position: 'fixed', bottom: 100, right: 20, zIndex: 200 }}
            onClick={() => setActivePage('feed')} // simplified back
          >
            Back to Home
          </button>
        )}
      </div>
    </NotificationProvider>
  );
}

export default App;
