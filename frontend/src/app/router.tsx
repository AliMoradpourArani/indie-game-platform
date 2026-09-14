import { createBrowserRouter } from 'react-router-dom';
import { AdminDashboard, AdminSubmissionDetail } from './admin';
import { AdminLoginPage, LoginPage, RegisterPage } from './authPages';
import { DeveloperDashboard, DeveloperGameDetail } from './developer';
import { BrowsePage, DeveloperPage, GamePage, LibraryPage } from './games';
import { AdminLayout, PublicLayout } from './layouts';
import { HomePage, NotFoundPage, PlaceholderPage } from './pages';
import { PurchasePage } from './purchase';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/browse', element: <BrowsePage /> },
      { path: '/games/:slug', element: <GamePage /> },
      { path: '/purchase/:slug', element: <PurchasePage /> },
      { path: '/developers/:id', element: <DeveloperPage /> },
      { path: '/library', element: <LibraryPage /> },
      { path: '/developer', element: <DeveloperDashboard /> },
      { path: '/developer/games/:id', element: <DeveloperGameDetail /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/about', element: <PlaceholderPage name="About" /> },
      { path: '/rules', element: <PlaceholderPage name="Rules" /> },
      { path: '/privacy', element: <PlaceholderPage name="Privacy" /> },
      { path: '/terms', element: <PlaceholderPage name="Terms" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { path: 'login', element: <AdminLoginPage /> },
      { path: '', element: <AdminDashboard /> },
      { path: 'submissions/:id', element: <AdminSubmissionDetail /> },
    ],
  },
]);
