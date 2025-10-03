# Components Structure

This folder contains all React components organized by functionality:

## 📁 Folder Structure

### `/video` - Video-related Components
- `MediaPlayer.tsx` - Video playback controls and timeline
- `VideoInfo.tsx` - Video timeline scrubber with thumbnail generation and trim mode

### `/audio` - Audio-related Components  
- `ContentViewer.tsx` - Audio variations display and management

### `/layout` - Layout & Navigation Components
- `SidePanel.tsx` - Main navigation sidebar
- `ChatBox.tsx` - Chat interface with responsive layout

### `/auth-components` - Authentication Components
- `AuthProvider.tsx` - Authentication context provider

### `/ui` - Reusable UI Components
*Currently empty - will contain shared UI elements*

## 📦 Usage

### Individual Imports
```tsx
import MediaPlayer from '../components/video/MediaPlayer';
import VideoInfo from '../components/video/VideoInfo';
import ContentViewer from '../components/audio/ContentViewer';
import SidePanel from '../components/layout/SidePanel';
import ChatBox from '../components/layout/ChatBox';
```

### Barrel Imports (Recommended)
```tsx
import { 
  MediaPlayer, 
  VideoInfo, 
  ContentViewer, 
  SidePanel, 
  ChatBox 
} from '../components';
```

## 🎯 Component Categories

- **Video**: Video upload, playback, trimming, timeline scrubbing
- **Audio**: Audio variations, playback, generation controls  
- **Layout**: Navigation, panels, responsive containers
- **Auth**: Authentication and session management
- **UI**: Shared buttons, inputs, modals (future)

## 🔧 Adding New Components

1. Place component in appropriate category folder
2. Add export to the folder's `index.ts` file
3. Component will be auto-exported from main `/components/index.ts`
