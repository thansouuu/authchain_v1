import { useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ProductionHubPage from './pages/ProductionHubPage';
import ClientPortalPage from './pages/ClientPortalPage';
import BrandPortalPage from './pages/BrandPortalPage';
import DriverPortal from './pages/DriverPortal';
import AdminPortalPage from './pages/AdminPortalPage';


export default function App() {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  // const endpoint = "http://127.0.0.1:8899";
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="manufacturer" element={<ProductionHubPage />} />
                <Route path="client" element={<ClientPortalPage />} />
                <Route path="brand" element={<BrandPortalPage />} />
                <Route path="driver" element={<DriverPortal />} />
                <Route path="admin" element={<AdminPortalPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}