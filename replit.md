# Project Documentation

## Overview

This is a Next.js web application built with TypeScript, React, and Tailwind CSS. The project includes modern UI components using Radix UI and provides a full-featured web development environment with theming support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Structure
- **Framework**: Next.js 15.3.3 with React 18.3.1
- **Language**: TypeScript
- **Styling**: Tailwind CSS with tailwindcss-animate
- **UI Components**: Radix UI primitives with custom styling
- **Development Server**: Runs on port 3000
- **Build Tool**: Next.js built-in build system

### Key Dependencies
- **Frontend**: React, Next.js, TypeScript
- **Styling**: Tailwind CSS, PostCSS, class-variance-authority
- **UI Components**: @radix-ui/react-dropdown-menu, @radix-ui/react-slot
- **Icons**: lucide-react
- **Theming**: next-themes
- **Utilities**: clsx, tailwind-merge

### Design Decisions
- **Modern Stack**: Uses latest Next.js with App Router architecture
- **Type Safety**: Full TypeScript implementation
- **Component Library**: Radix UI for accessible, headless components
- **Responsive Design**: Tailwind CSS for utility-first styling
- **Development Experience**: Hot reload and fast refresh enabled
- **Self-Contained Extraction**: Integrated custom Kwik link extractor to eliminate external API dependencies

## External Dependencies

The project uses multiple external packages for UI functionality, styling, and development tools. All dependencies are managed through npm and defined in package.json.

## Recent Changes

### AnimePahe Base URL Update (September 2025)
- Updated AnimePahe base URL from `animepahe.ru` to `animepahe.si`
- Made base URL configurable via `ANIMEPAHE_BASE_URL` environment variable
- Updated all references in `src/lib/consumet/anime/animepahe.ts` and `src/lib/consumet/extractors/kwik.ts`
- Added `.env.example` file to document configuration options
- Maintains backwards compatibility with default fallback to `https://animepahe.si`

### Kwik Link Extraction Integration (August 2025)
- Implemented custom Kwik link extractor to replace external API dependency
- Added `src/lib/kwik-extractor.ts` with TypeScript implementation
- Updated AnimepaHe service to use self-contained extraction logic
- Eliminated dependency on `https://access-kwik.apex-cloud.workers.dev/`
- Improved reliability and reduced external service dependencies