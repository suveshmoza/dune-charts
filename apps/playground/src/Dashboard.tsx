import { DuneChartProvider, type PixelWaveFill, type DuneTheme } from '@suveshmoza/dune-charts';
import { useEffect, useState } from 'react';

import { AppSidebar } from './dashboard/AppSidebar';
import { ChartAreaInteractive } from './dashboard/ChartAreaInteractive';
import { DataTable } from './dashboard/DataTable';
import { SectionCards } from './dashboard/SectionCards';
import { SiteHeader, type PixelSize } from './dashboard/SiteHeader';

import './Dashboard.css';

const MOBILE_MQ = '(max-width: 900px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export default function Dashboard() {
  const [theme, setTheme] = useState<DuneTheme>('dune');
  const [fill, setFill] = useState<PixelWaveFill>('dither');
  const [pixel, setPixel] = useState<PixelSize>(2);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? !window.matchMedia(MOBILE_MQ).matches : true,
  );

  useEffect(() => {
    // Close drawer when crossing into mobile; restore open on desktop.
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isMobile, sidebarOpen]);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  return (
    <DuneChartProvider theme={theme}>
      <div
        className={`db db--${theme}${sidebarOpen ? ' is-sidebar-open' : ' is-sidebar-collapsed'}`}
      >
        <div className="db-provider">
          <div
            className="db-sidebar-backdrop"
            hidden={!isMobile || !sidebarOpen}
            onClick={closeSidebar}
            aria-hidden
          />
          <AppSidebar open={sidebarOpen} onClose={closeSidebar} />
          <div className="db-inset">
            <SiteHeader
              sidebarOpen={sidebarOpen}
              onToggleSidebar={toggleSidebar}
              theme={theme}
              fill={fill}
              pixel={pixel}
              loading={loading}
              onThemeChange={setTheme}
              onFillChange={setFill}
              onPixelChange={setPixel}
              onLoadingChange={setLoading}
            />
            <div className="db-main">
              <SectionCards />
              <div className="db-main__chart">
                <ChartAreaInteractive fill={fill} pixel={pixel} loading={loading} />
              </div>
              <DataTable />
            </div>
          </div>
        </div>
      </div>
    </DuneChartProvider>
  );
}
