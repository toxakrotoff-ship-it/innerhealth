import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { SessionStrategy } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { verifyPassword, isBcryptHash } from '@/lib/password'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.trim().toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
        })
        if (!user) return null
        const valid = isBcryptHash(user.password)
          ? await verifyPassword(credentials.password, user.password)
          : user.password === credentials.password
        if (!valid) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? 'Admin User',
          role: user.role,
          mustChangePassword: user.mustChangePassword,
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
      }
      return token
    },
    async session({ session, token }) {
      const userId = token.id as string | undefined
      if (!userId) return session
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, mustChangePassword: true },
      })
      if (!user) {
        return { ...session, user: null as unknown as typeof session.user }
      }
      if (session.user) {
        session.user.id = userId
        session.user.email = token.email as string
        session.user.role = token.role as string
        session.user.mustChangePassword = user.mustChangePassword
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