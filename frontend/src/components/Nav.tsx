// src/components/Nav.tsx
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Nav() {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // On mount, grab the token (if any)
  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <nav className="flex items-center justify-between p-4 bg-gray-100">
      <Link href="/" className="font-semibold hover:underline">
        Home
      </Link>

      <div className="space-x-4">
        {token ? (
          <button
            onClick={handleLogout}
            className="font-semibold hover:underline"
          >
            Logout
          </button>
        ) : (
          <>
            {pathname !== '/login' && (
              <Link href="/login" className="font-semibold hover:underline">
                Login
              </Link>
            )}
            {pathname !== '/signup' && (
              <Link href="/signup" className="font-semibold hover:underline">
                Sign Up
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

