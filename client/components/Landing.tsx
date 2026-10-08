/**
 * Landing Page Component
 * Initial entry view with mode selector, 18+ compliance gate, and location permission prompt.
 */

import React, { useState } from 'react';
import {
  Radio,
  Video,
  MessageSquare,
  ShieldCheck,
  MapPin,
  Lock,
  ChevronRight,
  AlertTriangle,
  Compass
} from 'lucide-react';
import { ChatMode } from '../hooks/useMatchmaking.ts';
import { Coordinates, LocationStatus, TEST_LOCATIONS } from '../hooks/useLocation.ts';

interface LandingProps {
  coords: Coordinates | null;
  locationStatus: LocationStatus;
  locationError: string | null;
  onlineCount: number;
  onRequestLocation: () => Promise<Coordinates | null>;
  onSelectTestLocation: (testLoc: { name: string; lat: number; lng: number }) => void;
  onStart: (mode: ChatMode) => void;
}

export const Landing: React.FC<LandingProps> = ({
  coords,
  locationStatus,
  locationError,
  onlineCount,
  onRequestLocation,
  onSelectTestLocation,
  onStart
}) => {
  const [selectedMode, setSelectedMode] = useState<ChatMode>('text');
  const [is18Plus, setIs18Plus] = useState<boolean>(false);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showDevLocations, setShowDevLocations] = useState<boolean>(false);

  const canProceed = is18Plus && agreedTerms;

  const handleStartClick = async () => {
    if (!canProceed) return;

    if (!coords) {
      setIsLocating(true);
      const acquired = await onRequestLocation();
      setIsLocating(false);
      if (acquired) {
        onStart(selectedMode);
      }
    } else {
      onStart(selectedMode);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Simple Header */}
      <header className="h-16 border-b border-zinc-900 px-6 max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">NearChat</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Strict 30 km Proximity</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl mx-auto space-y-6">
          {/* Hero Section */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              Meet people <span className="text-emerald-400">near you</span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
              Omegle-style random matching exclusively with strangers within a{' '}
              <strong className="text-zinc-200">30 km radius</strong>. No accounts, no profiles,
              zero personal data saved.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setSelectedMode('text')}
              className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-medium text-sm transition-all active:scale-[0.98] ${
                selectedMode === 'text'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Text Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('video')}
              className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-medium text-sm transition-all active:scale-[0.98] ${
                selectedMode === 'video'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Video className="w-4 h-4 text-emerald-400" />
              <span>Video Chat</span>
            </button>
          </div>

          {/* Location Status Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>LOCATION STATUS</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDevLocations(!showDevLocations)}
                className="text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1 font-mono"
              >
                <Compass className="w-3 h-3" />
                <span>{showDevLocations ? 'Hide Test Locations' : '2-Tab Test Locations'}</span>
              </button>
            </div>

            {coords ? (
              <div className="flex items-center justify-between text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{coords.name || 'Location locked for 30 km radius'}</span>
                </span>
                <span className="text-zinc-500 font-mono text-[11px]">
                  ~{onlineCount} people active nearby
                </span>
              </div>
            ) : (
              <div className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                Browser location is strictly required to enforce the 30 km radius. Your exact
                coordinates are never shared with other users or stored on servers.
              </div>
            )}

            {/* Test locations selector for convenient 2-tab local testing */}
            {showDevLocations && (
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <p className="text-[11px] text-zinc-400 font-medium">
                  Select a test point to test matchmaking between 2 tabs:
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {TEST_LOCATIONS.map((loc) => (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => onSelectTestLocation(loc)}
                      className={`w-full text-left p-2 rounded-lg text-xs border transition-all flex items-center justify-between ${
                        coords?.name === loc.name
                          ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-300'
                          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="font-medium">{loc.name}</span>
                      <span className="text-[10px] text-zinc-500">{loc.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {locationError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{locationError}</p>
              </div>
            )}
          </div>

          {/* 18+ Age Gate & Terms */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3 text-xs">
            <label className="flex items-start gap-3 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={is18Plus}
                onChange={(e) => setIs18Plus(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 bg-zinc-900 border-zinc-700 focus:ring-emerald-500"
              />
              <span className="leading-tight">
                I confirm that I am at least <strong>18 years of age</strong>.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 bg-zinc-900 border-zinc-700 focus:ring-emerald-500"
              />
              <span className="leading-tight">
                I agree to the Terms of Service: no nudity, harassment, hate speech, or illegal
                content. 3 reports result in an automatic 24-hour IP ban.
              </span>
            </label>
          </div>

          {/* Start CTA Button */}
          <button
            type="button"
            onClick={handleStartClick}
            disabled={!canProceed || isLocating}
            className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] ${
              canProceed && !isLocating
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/40'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/40'
            }`}
          >
            {isLocating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Acquiring Location...</span>
              </span>
            ) : (
              <>
                <span>Start {selectedMode === 'video' ? 'Video' : 'Text'} Chat</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Privacy & Safety Badges */}
          <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-500 pt-2 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Zero logs or data saved</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Automated 24h report bans</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-zinc-900 px-6 max-w-6xl w-full mx-auto flex items-center justify-between text-xs text-zinc-500">
        <div>NearChat · Stranger Chat Within 30 km</div>
        <div className="flex items-center gap-4">
          <span>Peer-to-Peer WebRTC</span>
          <span>In-Memory Routing</span>
        </div>
      </footer>
    </div>
  );
};
