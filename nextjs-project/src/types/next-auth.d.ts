import 'next-auth'

declare module 'next-auth' {
  interface User {
    id?: string
    /** USER | WRITER | ADMIN | PARTNER */
    role?: string
    mustChangePassword?: boolean
    isEmailVerified?: boolean
  }

  interface Session {
    user: {
      id?: string
      email?: string | null
      name?: string | null
      image?: string | null
      role?: string
      lastLogin?: string
      mustChangePassword?: boolean
      isEmailVerified?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    email?: string
    role?: string
    mustChangePassword?: boolean
    isEmailVerified?: boolean
  }
}
