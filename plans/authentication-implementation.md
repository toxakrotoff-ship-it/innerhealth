# Authentication Implementation Plan

## Overview
Implement authentication system for the admin panel with the following requirements:
- Secure access to /admin routes
- User credentials: anton / test123!
- Session management
- Role-based access control

## Implementation Steps

### 1. Setup NextAuth.js
- Install NextAuth.js dependency
- Configure authentication provider
- Set up session management
- Create authentication callbacks

### 2. Create Login Page
- Create `/src/app/login/page.tsx`
- Implement login form with email/password
- Add validation and error handling
- Handle authentication flow

### 3. Create Authentication Context
- Implement authentication context for client-side
- Manage user session state
- Provide authentication hooks

### 4. Create Admin Middleware
- Protect admin routes with authentication middleware
- Redirect unauthorized users to login page
- Implement role-based access control

### 5. Create Admin Layout
- Create shared admin layout component
- Add navigation menu
- Implement logout functionality

## Technical Details

### Dependencies to Install
```bash
npm install next-auth
```

### Authentication Configuration (`/src/lib/auth.ts`)
```ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validate credentials
        if (credentials?.email === 'anton@test123!' && 
            credentials?.password === 'anton@test123!') {
          return {
            id: '1',
            email: 'anton@test123!',
            name: 'Admin User'
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
```

### Login Page (`/src/app/login/page.tsx`)
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Неверные учетные данные')
    } else {
      router.push('/admin/catalog')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Вход в админ панель
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

### Admin Middleware (`/src/middleware.ts`)
```ts
import NextAuth from 'next-auth'
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(request) {
    // Check if the user is accessing admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
      // The withAuth middleware will handle authentication
      // If user is not authenticated, they will be redirected to login
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Allow access to admin if user is authenticated
        return !!token
      }
    }
  }
)

export const config = {
  matcher: ['/admin/:path*']
}
```

### Admin Layout (`/src/app/admin/layout.tsx`)
```tsx
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Админ панель</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
```

## Security Considerations

1. **Password Security**: 
   - In production, passwords should be hashed with bcrypt
   - For this implementation, we're using plain text comparison for simplicity

2. **Session Management**:
   - JWT tokens with expiration
   - Secure cookie settings
   - Proper session invalidation

3. **Route Protection**:
   - Middleware protects all /admin routes
   - Redirects unauthorized users to login

4. **Input Validation**:
   - Validate all form inputs
   - Sanitize user data

## Testing Plan

1. Test successful login with correct credentials
2. Test failed login with incorrect credentials
3. Test access to protected admin routes without authentication
4. Test access to admin routes with valid authentication
5. Test logout functionality