import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Spotlight } from '../components/ui/spotlight';
import { BackgroundBeams } from '../components/ui/background-beams';
import AppHeader from '../components/AppHeader';
import AppNav from '../components/AppNav';
import HotspotDetailDrawer from '../components/HotspotDetailDrawer';
import StartupBanner from '../components/StartupBanner';
import { useApp } from '../context/AppContext';

export default function AppLayout() {
  const { id: hotspotIdParam } = useParams();
  const navigate = useNavigate();
  const { detailHotspotId, setDetailHotspotId } = useApp();

  useEffect(() => {
    if (hotspotIdParam) {
      setDetailHotspotId(hotspotIdParam);
    }
  }, [hotspotIdParam, setDetailHotspotId]);

  const closeDrawer = () => {
    setDetailHotspotId(null);
    if (hotspotIdParam) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] relative overflow-hidden">
      <BackgroundBeams className="z-0" />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#3b82f6" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <AppHeader />

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <AppNav />
        <StartupBanner />
        <Outlet />
      </main>

      <HotspotDetailDrawer hotspotId={detailHotspotId} onClose={closeDrawer} />
    </div>
  );
}
