# Admin Catalog Page Plan

## Overview
Create a comprehensive admin catalog page that displays products and allows importing from CSV.

## Page Structure
- Main catalog page at `/admin/catalog`
- Product listing table with filtering and sorting
- Import functionality from CSV file
- Product management actions (edit, delete, etc.)

## Features to Implement

### 1. Product Listing
- Display products in a responsive table
- Columns: ID, Name, Price, Stock, Category, Actions
- Filtering by category, price range, stock status
- Sorting by various columns
- Pagination support

### 2. CSV Import Functionality
- Upload CSV file from local machine
- Parse CSV data according to provided format
- Validate data before import
- Handle image URLs from static.* domain
- Download images and store locally
- Update database with imported products

### 3. Image Handling
- Process image URLs from static.* domain
- Download images to local uploads directory
- Store images in `uploads/{product-name}` folders
- Link images to products in database

### 4. Database Integration
- Use Prisma ORM to interact with PostgreSQL
- Handle product creation/update
- Manage relationships between products and images
- Support for all CSV fields mapping to database columns

## Technical Requirements
- TypeScript for type safety
- Next.js Server Components for data fetching
- Tailwind CSS for styling
- Responsive design for all devices
- Proper error handling and validation

## Implementation Approach
1. Create the main catalog page component
2. Implement data fetching from database
3. Add CSV import functionality with file upload
4. Create image processing pipeline
5. Implement product management actions
6. Add filtering and sorting capabilities