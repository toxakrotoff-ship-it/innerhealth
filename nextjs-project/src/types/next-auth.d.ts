import 'next-auth'

declare module 'next-auth' {
  interface User {
    id?: string
    role?: string
    mustChangePassword?: boolean
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
    }
  }
}
