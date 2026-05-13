// src/router/AppRouter.jsx
// Hybrid router: react-router for public Curated Expeditions URLs,
// catch-all "*" delegates to LegacyApp's state-view switch.
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import LegacyApp from '../LegacyApp';

const Explore = lazy(() => import('../pages/Explore'));
const ExploreTheme = lazy(() => import('../pages/ExploreTheme'));
const ExpeditionDetail = lazy(() => import('../pages/ExpeditionDetail'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore/:theme" element={<ExploreTheme />} />
          <Route path="/expedition/:slug" element={<ExpeditionDetail />} />
          <Route path="*" element={<LegacyApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
