import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout, PublicLayout } from './layouts';
import { AdminLoginPage, HomePage, PlaceholderPage } from './pages';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/browse', element: <PlaceholderPage name="Browse" /> },
      { path: '/games/:slug', element: <PlaceholderPage name="Game" /> },
      { path: '/library', element: <PlaceholderPage name="Library" /> },
      { path: '/developer', element: <PlaceholderPage name="Developer dashboard" /> },
      { path: '/login', element: <PlaceholderPage name="Login" /> },
      { path: '/about', element: <PlaceholderPage name="About" /> },
      { path: '/rules', element: <PlaceholderPage name="Rules" /> },
      { path: '/privacy', element: <PlaceholderPage name="Privacy" /> },
      { path: '/terms', element: <PlaceholderPage name="Terms" /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [{ path: 'login', element: <AdminLoginPage /> }],
  },
]);
