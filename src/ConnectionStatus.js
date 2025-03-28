import React, { useEffect, useState } from 'react';

const ConnectionStatus = () => {
  const [status, setStatus] = useState('Connected');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      if (!navigator.onLine) {
        setStatus('No internet connection');
        setShowBanner(true);
      } else {
        setStatus('Reconnecting...');
        setShowBanner(true);
        setTimeout(() => {
          setStatus('Connected');
          setShowBanner(false);
        }, 3000);
      }
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (!showBanner && status === 'Connected') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      width: '100%',
      backgroundColor: status === 'Connected' ? '#4caf50' : status === 'Reconnecting...' ? '#ffc107' : '#f44336',
      color: '#fff',
      textAlign: 'center',
      padding: '10px',
      fontSize: '16px',
      zIndex: 2000,
    }}>
      {status}
    </div>
  );
};

export default ConnectionStatus;
