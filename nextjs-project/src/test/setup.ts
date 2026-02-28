import "@testing-library/jest-dom/vitest";

// Avoid Prisma/DB init errors when testing API routes that pull in server deps
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://fake:fake@localhost:5432/fake";
}
