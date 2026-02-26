import CredentialsProvider from 'next-auth/providers/credentials'
import { SessionStrategy } from 'next-auth'
import { verifyPassword, isBcryptHash } from '@/lib/password'
import { consumeGrant } from '@/lib/two-factor'
import * as userService from '@/services/user.service'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        grantToken: { label: 'Grant Token', type: 'text' },
      },
      async authorize(credentials) {
        const grantToken = credentials?.grantToken as string | undefined
        if (grantToken?.trim()) {
          const result = await consumeGrant(grantToken.trim())
          if (!result) return null
          const user = await userService.findUserByIdForAuth(result.userId)
          if (!user) return null
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? 'Admin User',
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            isEmailVerified: Boolean(user.emailVerifiedAt),
          }
        }

        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.trim().toLowerCase()
        const user = await userService.findUserByEmail(email)
        if (!user) return null
        const valid = isBcryptHash(user.password)
          ? await verifyPassword(credentials.password, user.password)
          : user.password === credentials.password
        if (!valid) return null
        if (user.twoFactorEnabled) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? 'Admin User',
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          isEmailVerified: Boolean(user.emailVerifiedAt),
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = user.role
        token.mustChangePassword = user.mustChangePassword
        token.isEmailVerified = Boolean(user.isEmailVerified)
      }
      return token
    },
    async session({ session, token }) {
      const userId = token.id as string | undefined
      if (!userId) return session
      const user = await userService.findUserById(userId)
      if (!user) {
        return { ...session, user: null as unknown as typeof session.user }
      }
      if (session.user) {
        session.user.id = userId
        session.user.email = token.email as string
        session.user.role = token.role as string
        session.user.mustChangePassword = user.mustChangePassword
        session.user.isEmailVerified = Boolean(user.emailVerifiedAt)
        const fullName = [user.name, user.lastName].filter(Boolean).join(' ') || (token.email as string)
        session.user.name = fullName
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}