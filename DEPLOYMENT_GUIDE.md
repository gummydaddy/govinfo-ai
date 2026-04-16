# GovInfo AI Deployment Guide

## Overview
This document explains all the changes made to fix CORS and backend connectivity issues, and provides step-by-step instructions for deploying the GovInfo AI project with frontend on Vercel and backend on Render.

## Issues Fixed
1. **CORS Errors**: Frontend deployed on Vercel couldn't access backend on localhost
2. **Hardcoded URLs**: Background crawler service was hardcoded to use localhost
3. **Missing Environment Configuration**: No way to configure backend URL dynamically

## Changes Made

### 1. Backend Server (`server.js`)
**File**: `server.js`

**Changes**:
- Enhanced CORS middleware to allow requests from multiple origins:
  - `http://localhost:3000` (Angular dev)
  - `http://localhost:4200` (Alternative dev port)
  - `https://govinfo-ai.vercel.app` (Vercel frontend)
  - `https://govinfo-ai.onrender.com` (Render backend itself)
- Added root endpoint (`/`) for basic health checking
- Updated startup messages to show correct URL based on environment

### 2. Background Crawler Service
**File**: `src/services/background-crawler.service.ts`

**Changes**:
- Replaced hardcoded `http://localhost:3001` with dynamic URL configuration
- Added support for `window.BACKEND_URL` environment variable
- Fallback to `https://govinfo-ai.onrender.com` if not set
- Fixed TypeScript errors with proper window typing

### 3. Frontend Configuration
**File**: `index.html`

**Changes**:
- Added script tag to set `window.BACKEND_URL` for production
- Points to `https://govinfo-ai.onrender.com` (Render backend)

### 4. Documentation Updates
**File**: `README.md`

**Changes**:
- Updated documentation to reflect correct backend URL
- Changed references from `localhost:3001` to `https://govinfo-ai.onrender.com`

## Deployment Steps

### Backend Deployment (Render)

1. **Create Render Account**
   - Sign up at https://render.com
   - Create a new Web Service

2. **Configure Backend Service**
   - Connect your GitHub repository
   - Set build command: `npm install`
   - Set start command: `npm run server`
   - Set environment variables:
     - `NODE_ENV`: `production` (optional, defaults to production)
     - `PORT`: Render will set this automatically (don't set manually)

3. **Deploy**
   - Render will automatically detect your Node.js project
   - It will install dependencies and start the server
   - Your backend will be available at: `https://your-service-name.onrender.com`

4. **Verify Backend Deployment**
   - Check health endpoint: `https://your-service-name.onrender.com/api/health`
   - Should return: `{"status":"ok","timestamp":<epoch_ms>}`
   - Check root endpoint: `https://your-service-name.onrender.com/`
   - Should return basic server info

### Frontend Deployment (Vercel)

1. **Create Vercel Account**
   - Sign up at https://vercel.com
   - Import your GitHub repository

2. **Configure Frontend Project**
   - Vercel should automatically detect Angular project
   - Build command: `npm run build`
   - Output directory: `dist/govinfo-ai` or `dist` (depending on your setup)
   - No additional environment variables needed for frontend

3. **Deploy**
   - Vercel will build and deploy your Angular app
   - Your frontend will be available at: `https://your-project-name.vercel.app`

4. **Verify Frontend-Backend Communication**
   - After deployment, test the scraping functionality
   - Check browser console for any CORS errors
   - Verify that background crawler can access the backend

### Environment Variables Summary

| Location | Variable | Value | Required |
|----------|----------|-------|----------|
| Backend (Render) | NODE_ENV | production | Optional |
| Backend (Render) | PORT | Auto-set by Render | No (let Render handle) |
| Frontend (Vercel) | None | N/A | No |

### Important Notes

1. **Backend URL Consistency**: 
   - Make sure the `window.BACKEND_URL` in `index.html` matches your actual Render deployment URL
   - If you change your Render service name, update the URL in index.html

2. **Local Development**:
   - For local development, you can run both frontend and backend locally
   - Backend: `npm run server` (runs on localhost:3001)
   - Frontend: `npm run dev` (runs on localhost:3000 or 4200)
   - The CORS configuration allows localhost requests

3. **Production Considerations**:
   - The backend will automatically detect production mode via `NODE_ENV`
   - CORS origins are configured to allow both development and production domains
   - No additional backend configuration needed beyond standard Node.js deployment

4. **Troubleshooting**:
   - If you see CORS errors, check that your frontend domain is in the allowed origins list
   - Verify backend is actually running at the URL specified in `window.BACKEND_URL`
   - Check Render logs for any backend startup issues
   - Verify that the `/api/health` endpoint is accessible from your frontend's network tab

## Verification Checklist

After deployment, verify:

### Backend
- [ ] Server starts successfully on Render
- [ ] Health endpoint responds: `https://your-backend-url/api/health`
- [ ] Root endpoint responds: `https://your-backend-url/`
- [ ] Scrape endpoint accessible: `https://your-backend-url/api/scrape?url=...`

### Frontend
- [ ] App loads successfully on Vercel
- [ ] No CORS errors in browser console
- [ ] Background crawler can access backend
- [ ] Manual scrape operations work
- [ ] Knowledge base functions properly

### Integration
- [ ] Frontend can communicate with backend
- [ ] Background crawling works with production URLs
- [ ] All API endpoints accessible from frontend
- [ ] No mixed content warnings (all HTTPS)

## Rollback Procedure

If issues occur after deployment:

1. **Backend Issues**:
   - Check Render deployment logs
   - Rollback to previous deployment in Render dashboard
   - Verify local server.js works before redeploying

2. **Frontend Issues**:
   - Check Vercel deployment logs
   - Rollback to previous deployment in Vercel dashboard
   - Verify index.html changes don't break local development

3. **Communication Issues**:
   - Double-check `window.BACKEND_URL` in deployed index.html
   - Verify CORS settings in server.js include your frontend domain
   - Test backend accessibility directly from browser: `https://your-backend-url/api/health`

## Local Testing Before Deployment

To test changes locally before deploying:

1. Start backend: `npm run server`
2. Start frontend: `npm run dev`
3. Visit: `http://localhost:3000` (or whatever port Angular uses)
4. Test scraping functionality
5. Check for console errors
6. Verify background crawler works

Once local testing passes, deploy to production services.
