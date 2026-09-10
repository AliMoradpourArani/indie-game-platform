import { createBrowserRouter } from 'react-router-dom';
import { AdminDashboard, AdminSubmissionDetail } from './admin';
import { AdminLoginPage, LoginPage, RegisterPage } from './authPages';
import { DeveloperDashboard, DeveloperGameDetail } from './developer';
import { AdminLayout, PublicLayout } from './layouts';
import { HomePage, PlaceholderPage } from './pages';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/browse', element: <PlaceholderPage name="Browse" /> },
      { path: '/games/:slug', element: <PlaceholderPage name="Game" /> },
      { path: '/library', element: <PlaceholderPage name="Library" /> },
      { path: '/developer', element: <DeveloperDashboard /> },
      { path: '/developer/games/:id', element: <DeveloperGameDetail /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/about', element: <PlaceholderPage name="About" /> },
      { path: '/rules', element: <PlaceholderPage name="Rules" /> },
      { path: '/privacy', element: <PlaceholderPage name="Privacy" /> },
      { path: '/terms', element: <PlaceholderPage name="Terms" /> },
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
