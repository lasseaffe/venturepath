import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

const Explore = lazy(() => import('../../pages/Explore'));
const ExploreTheme = lazy(() => import('../../pages/ExploreTheme'));
const ExpeditionDetail = lazy(() => import('../../pages/ExpeditionDetail'));

function Tree({ path }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<div data-testid="suspense">loading</div>}>
        <Routes>
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore/:theme" element={<ExploreTheme />} />
          <Route path="/expedition/:slug" element={<ExpeditionDetail />} />
        </Routes>
      </Suspense>
    </MemoryRouter>
  );
}

describe('AppRouter route table', () => {
  it('renders the Explore stub at /explore', async () => {
    render(<Tree path="/explore" />);
    expect(
      await screen.findByText(/VentureVault — Discovery/i)
    ).toBeInTheDocument();
  });

  it('echoes the theme param at /explore/:theme', async () => {
    render(<Tree path="/explore/movie" />);
    expect(await screen.findByText(/THEME: movie/i)).toBeInTheDocument();
  });

  it('flags unknown themes', async () => {
    render(<Tree path="/explore/banana" />);
    expect(
      await screen.findByText(/UNKNOWN THEME: banana/i)
    ).toBeInTheDocument();
  });

  it('echoes the slug param at /expedition/:slug', async () => {
    render(<Tree path="/expedition/lord-of-the-rings-nz" />);
    expect(
      await screen.findByText(/EXPEDITION: lord-of-the-rings-nz/i)
    ).toBeInTheDocument();
  });
});
