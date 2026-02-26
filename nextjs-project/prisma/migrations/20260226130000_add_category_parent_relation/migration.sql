-- Add nullable self-reference for hierarchical categories (adjacency list)
ALTER TABLE "Category"
ADD COLUMN "parentId" TEXT;

ALTER TABLE "Category"
ADD CONSTRAINT "Category_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Category"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
