import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  MapControl,
  ControlPosition,
  Polyline,
  Circle,
  useMap,
} from '@vis.gl/react-google-maps';
import { useSahyog } from '../context/SahyogContext';
import { calculateHaversineDistance, formatDistance } from '../utils/haversine';
import {
  Compass,
  Layers,
  MapPin,
  Crosshair,
  Maximize2,
  AlertTriangle,
  Flag,
  Battery,
  ShieldAlert,
  BarChart3,
  CloudSun,
  Navigation,
  Car,
  Search,
  Radio,
  CheckCircle2,
  UserCheck,
  Share2,
  Globe,
} from 'lucide-react';
import { TacticalAnalyticsOverlay } from './TacticalAnalyticsOverlay';
import { WeatherLayer } from './WeatherLayer';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC7hgJp8ih_b2m4rVFPWHxC4jASRRUfkNA';

// Component to handle Google Traffic Layer toggling
const TrafficLayerComponent: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const map = useMap();
  const trafficLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;
    if (!trafficLayerRef.current && typeof window !== 'undefined' && (window as any).google?.maps?.TrafficLayer) {
      trafficLayerRef.current = new (window as any).google.maps.TrafficLayer();
    }

    if (enabled) {
      trafficLayerRef.current.setMap(map);
    } else {
      trafficLayerRef.current.setMap(null);
    }

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, enabled]);

  return null;
};

// Component to handle Camera Pans and Follow Mode
const CameraController: React.FC<{
  targetCoords: { lat: number; lng: number } | null;
  autoTrack: boolean;
  userCoords: { lat: number; lng: number } | null;
}> = ({ targetCoords, autoTrack, userCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (targetCoords) {
      map.panTo(targetCoords);
      map.setZoom(16);
    }
  }, [map, targetCoords]);

  useEffect(() => {
    if (!map || !autoTrack || !userCoords) return;
    map.panTo(userCoords);
  }, [map, autoTrack, userCoords]);

  return null;
};

export const GoogleTacticalMap: React.FC = () => {
  const {
    partyCode,
    missionName,
    members,
    selectedMemberId,
    setSelectedMemberId,
    selectedMember,
    checkpoint,
    isSettingCheckpoint,
    setIsSettingCheckpoint,
    setCheckpoint,
    userLocation,
    requestUserLocation,
    isLiveTracking,
    toggleLiveTracking,
    flyToLocation,
    setFlyToLocation,
    activeAlert,
    isAnalyticsOverlayOpen,
    setIsAnalyticsOverlayOpen,
    liveTelemetry,
    isLiveGPSActive,
    dataSourceMode,
    setDataSourceMode,
  } = useSahyog();

  // Map state
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [autoTrack, setAutoTrack] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [infoWindowMember, setInfoWindowMember] = useState<string | null>(null);
  const [showWeatherOverlay, setShowWeatherOverlay] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Fallback center if user location not ready yet (Dehradun tactical region or default)
  const defaultCenter = useMemo(() => {
    if (userLocation) return { lat: userLocation.lat, lng: userLocation.lng };
    return { lat: 30.308, lng: 78.042 };
  }, [userLocation]);

  // Current user's operative record
  const youMember = useMemo(
    () => members.find((m) => m.isCurrentUser) || members[0],
    [members]
  );

  // Distance from current user to Checkpoint
  const checkpointDistance = useMemo(() => {
    if (!youMember || !checkpoint) return null;
    return calculateHaversineDistance(
      { lat: youMember.lat, lng: youMember.lng },
      { lat: checkpoint.lat, lng: checkpoint.lng }
    );
  }, [youMember, checkpoint]);

  // Distance from current user to Selected Member
  const selectedMemberDistance = useMemo(() => {
    if (!youMember || !selectedMember || selectedMember.id === youMember.id) return null;
    return calculateHaversineDistance(
      { lat: youMember.lat, lng: youMember.lng },
      { lat: selectedMember.lat, lng: selectedMember.lng }
    );
  }, [youMember, selectedMember]);

  // Handle map click for placing checkpoint
  const handleMapClick = (e: any) => {
    if (isSettingCheckpoint && e.detail?.latLng) {
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      setCheckpoint(lat, lng, `Rendezvous Point (${partyCode})`);
      setIsSettingCheckpoint(false);
    }
  };

  // Search places via Geocoder
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !(window as any).google?.maps?.Geocoder) return;

    setIsSearching(true);
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results: any[], status: string) => {
      setIsSearching(false);
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        const lat = loc.lat();
        const lng = loc.lng();
        setFlyToLocation({ lat, lng });
        setAutoTrack(false);
      }
    });
  };

  // Copy shareable join link
  const handleCopyShareLink = () => {
    const url = `${window.location.origin}?party=${partyCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-900">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultCenter={defaultCenter}
          defaultZoom={15}
          gestureHandling="greedy"
          mapTypeId={mapType}
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
          onClick={handleMapClick}
        >
          {/* Traffic Layer */}
          <TrafficLayerComponent enabled={showTraffic} />

          {/* Camera Panning Controller */}
          <CameraController
            targetCoords={flyToLocation}
            autoTrack={autoTrack}
            userCoords={userLocation}
          />

          {/* Live GPS Accuracy Halo around current user */}
          {userLocation && (
            <Circle
              center={{ lat: userLocation.lat, lng: userLocation.lng }}
              radius={liveTelemetry?.accuracy || 25}
              strokeColor="#0284c7"
              strokeOpacity={0.6}
              strokeWeight={1.5}
              fillColor="#0ea5e9"
              fillOpacity={0.12}
            />
          )}

          {/* Distance Polyline to Checkpoint */}
          {youMember && checkpoint && (
            <Polyline
              path={[
                { lat: youMember.lat, lng: youMember.lng },
                { lat: checkpoint.lat, lng: checkpoint.lng },
              ]}
              strokeColor="#10b981"
              strokeOpacity={0.85}
              strokeWeight={3}
            />
          )}

          {/* Distance Polyline to Selected Member */}
          {youMember && selectedMember && selectedMember.id !== youMember.id && (
            <Polyline
              path={[
                { lat: youMember.lat, lng: youMember.lng },
                { lat: selectedMember.lat, lng: selectedMember.lng },
              ]}
              strokeColor="#f59e0b"
              strokeOpacity={0.75}
              strokeWeight={2.5}
            />
          )}

          {/* ============================================================== */}
          {/* REAL ACTIVE TEAM MEMBERS MARKERS                              */}
          {/* ============================================================== */}
          {members.map((member) => {
            const isSelected = member.id === selectedMemberId;
            const isYou = member.isCurrentUser;
            const isEmergency = member.status === 'emergency';
            const isCaution = member.status === 'caution';

            const statusBg = isEmergency
              ? 'bg-rose-600'
              : isCaution
              ? 'bg-amber-500'
              : 'bg-emerald-600';

            const statusBorder = isEmergency
              ? 'border-rose-400'
              : isCaution
              ? 'border-amber-300'
              : 'border-emerald-300';

            return (
              <React.Fragment key={member.id}>
                <AdvancedMarker
                  position={{ lat: member.lat, lng: member.lng }}
                  onClick={() => {
                    setSelectedMemberId(member.id);
                    setInfoWindowMember(member.id);
                  }}
                  title={`${member.callsign} - ${member.name}`}
                >
                  <div className="relative group cursor-pointer flex flex-col items-center">
                    {/* Live Pulsing Beacon for Emergency or Current User */}
                    {(isEmergency || isYou) && (
                      <span
                        className={`absolute -inset-2 rounded-full animate-ping opacity-60 ${
                          isEmergency ? 'bg-rose-500' : 'bg-sky-400'
                        }`}
                      />
                    )}

                    {/* Operative Tactical Badge */}
                    <div
                      className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border-2 text-white transition-transform ${
                        isSelected ? 'scale-110 ring-4 ring-sky-400 ring-opacity-60' : 'hover:scale-105'
                      } ${statusBg} ${statusBorder}`}
                    >
                      {/* Heading Arrow if available */}
                      {typeof member.heading === 'number' && member.heading >= 0 && (
                        <Navigation
                          className="w-3.5 h-3.5 text-white transform"
                          style={{ transform: `rotate(${member.heading}deg)` }}
                        />
                      )}

                      {/* Operative Callsign */}
                      <span className="text-xs font-black tracking-wide">
                        {isYou ? 'YOU (LEAD)' : member.callsign}
                      </span>

                      {/* Battery Badge */}
                      <div className="flex items-center text-[10px] font-mono bg-black/30 px-1 rounded">
                        <span>{member.battery}%</span>
                      </div>
                    </div>

                    {/* Pointer Triangle */}
                    <div
                      className={`w-0 h-0 border-x-4 border-x-transparent border-t-6 ${
                        isEmergency
                          ? 'border-t-rose-600'
                          : isCaution
                          ? 'border-t-amber-500'
                          : 'border-t-emerald-600'
                      }`}
                    />

                    {/* Member Name on Hover */}
                    <span className="mt-0.5 bg-slate-900/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                      {member.name}
                    </span>
                  </div>
                </AdvancedMarker>

                {/* Interactive InfoWindow on Marker Click */}
                {infoWindowMember === member.id && (
                  <InfoWindow
                    position={{ lat: member.lat, lng: member.lng }}
                    onCloseClick={() => setInfoWindowMember(null)}
                  >
                    <div className="p-2 max-w-xs text-slate-800">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              member.status === 'emergency'
                                ? 'bg-rose-600 animate-pulse'
                                : member.status === 'caution'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-bold text-sm text-slate-900">
                            {member.callsign}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-600">
                          {member.status}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-700">{member.name}</p>
                      <p className="text-[11px] text-slate-500 mb-1">{member.role}</p>

                      <div className="grid grid-cols-2 gap-1 text-[11px] bg-slate-50 p-1.5 rounded mb-2 font-mono">
                        <div>
                          <span className="text-slate-400">Battery:</span>{' '}
                          <span className="font-semibold text-slate-800">{member.battery}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400">GPS Acc:</span>{' '}
                          <span className="font-semibold text-slate-800">
                            ±{Math.round(member.accuracy || 10)}m
                          </span>
                        </div>
                        <div className="col-span-2 truncate">
                          <span className="text-slate-400">Coords:</span>{' '}
                          <span>{member.lat.toFixed(5)}, {member.lng.toFixed(5)}</span>
                        </div>
                      </div>

                      {member.note && (
                        <p className="text-[11px] text-slate-600 italic bg-amber-50/70 p-1 rounded border border-amber-200/50 mb-2">
                          "{member.note}"
                        </p>
                      )}

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMemberId(member.id);
                            setFlyToLocation({ lat: member.lat, lng: member.lng });
                          }}
                          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold py-1 px-2 rounded transition-colors"
                        >
                          Focus Telemetry
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </React.Fragment>
            );
          })}

          {/* ============================================================== */}
          {/* CHECKPOINT MARKER                                              */}
          {/* ============================================================== */}
          {checkpoint && (
            <AdvancedMarker
              position={{ lat: checkpoint.lat, lng: checkpoint.lng }}
              title={checkpoint.name}
            >
              <div className="relative group cursor-pointer flex flex-col items-center">
                <span className="absolute -inset-2 rounded-full bg-emerald-400/40 animate-ping" />
                <div className="relative bg-emerald-700 text-white p-2 rounded-xl border-2 border-emerald-300 shadow-xl flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-emerald-200 fill-emerald-200" />
                  <span className="text-xs font-black tracking-wide">
                    {checkpoint.name.split(' ')[0]}
                  </span>
                </div>
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-emerald-700" />

                {checkpointDistance && (
                  <span className="mt-1 bg-black/80 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
                    {formatDistance(checkpointDistance)} to You
                  </span>
                )}
              </div>
            </AdvancedMarker>
          )}

          {/* Weather & Radar Overlay */}
          {showWeatherOverlay && (
            <WeatherLayer map={null} />
          )}
        </Map>
      </APIProvider>

      {/* ============================================================== */}
      {/* TACTICAL MAP CONTROLS OVERLAY (Header & HUD)                    */}
      {/* ============================================================== */}

      {/* Top Search & Mission Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Search Bar & Mission Tag */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 rounded-xl overflow-hidden px-2.5 py-1.5 text-xs text-slate-800 w-56 sm:w-72"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search place, city, or coordinates..."
              className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-400"
            />
            {isSearching && (
              <span className="text-[10px] text-sky-600 font-medium animate-pulse ml-1">
                Searching...
              </span>
            )}
          </form>

          {/* Party Code Pill with Share */}
          <button
            onClick={handleCopyShareLink}
            title="Click to copy party invite link"
            className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 text-white text-xs font-mono px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-bold">{partyCode}</span>
            <Share2 className="w-3 h-3 text-slate-400 ml-1" />
            {copiedLink && (
              <span className="text-[10px] text-emerald-400 font-bold ml-1">Copied!</span>
            )}
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-200/80">
          {/* Data Source Mode Toggle: Live GPS Responders vs Scenario */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => setDataSourceMode('live_gps')}
              className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                dataSourceMode === 'live_gps'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Real Live GPS Telemetry from connected devices (No Dummy Data)"
            >
              <Crosshair className="w-3 h-3" />
              <span>Live GPS Only</span>
            </button>
            <button
              onClick={() => setDataSourceMode('training_scenario')}
              className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                dataSourceMode === 'training_scenario'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Simulation & Exercise Scenario Squad"
            >
              <Globe className="w-3 h-3" />
              <span>Training Squad</span>
            </button>
          </div>

          {/* Map Type Dropdown / Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-2 py-1 rounded-md transition-all ${
                mapType === 'roadmap' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2 py-1 rounded-md transition-all ${
                mapType === 'satellite' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
              }`}
            >
              Sat
            </button>
            <button
              onClick={() => setMapType('terrain')}
              className={`px-2 py-1 rounded-md transition-all ${
                mapType === 'terrain' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
              }`}
            >
              Terrain
            </button>
          </div>

          {/* Traffic Layer Toggle */}
          <button
            onClick={() => setShowTraffic((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-medium ${
              showTraffic
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Live Google Traffic Layer"
          >
            <Car className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Traffic</span>
          </button>

          {/* Weather & Radar Toggle */}
          <button
            onClick={() => setShowWeatherOverlay((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-medium ${
              showWeatherOverlay
                ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Weather Radar Overlay"
          >
            <CloudSun className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Weather</span>
          </button>

          {/* Tactical Analytics Overlay Toggle */}
          <button
            onClick={() => setIsAnalyticsOverlayOpen(!isAnalyticsOverlayOpen)}
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-medium ${
              isAnalyticsOverlayOpen
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Tactical Analytics Overlay (Battery Depletion & Condition Trends)"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Analytics</span>
          </button>
        </div>
      </div>

      {/* Floating Tactical Telemetry HUD (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-20 pointer-events-auto bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 text-xs w-72">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-bold tracking-wider text-[11px] text-emerald-400 uppercase">
              {isLiveGPSActive ? 'LIVE GPS ACTIVE' : 'TELEMETRY ONLINE'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {members.length} {members.length === 1 ? 'Responder' : 'Responders'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-2.5">
          <div className="bg-slate-800/70 p-1.5 rounded-lg">
            <div className="text-[10px] text-slate-400">LAT / LNG</div>
            <div className="font-semibold truncate text-slate-200">
              {youMember ? `${youMember.lat.toFixed(4)}, ${youMember.lng.toFixed(4)}` : 'Scanning...'}
            </div>
          </div>
          <div className="bg-slate-800/70 p-1.5 rounded-lg">
            <div className="text-[10px] text-slate-400">ACCURACY</div>
            <div className="font-semibold text-emerald-300">
              ±{Math.round(liveTelemetry?.accuracy || 8)}m
            </div>
          </div>
          <div className="bg-slate-800/70 p-1.5 rounded-lg">
            <div className="text-[10px] text-slate-400">BATTERY</div>
            <div className="font-semibold text-sky-300 flex items-center gap-1">
              <Battery className="w-3 h-3 text-sky-400" />
              <span>{youMember?.battery || 95}%</span>
            </div>
          </div>
          <div className="bg-slate-800/70 p-1.5 rounded-lg">
            <div className="text-[10px] text-slate-400">SPEED / HDG</div>
            <div className="font-semibold text-slate-200">
              {liveTelemetry?.speed ? `${(liveTelemetry.speed * 3.6).toFixed(1)} km/h` : 'Stationary'}
            </div>
          </div>
        </div>

        {/* Checkpoint Distance Summary */}
        {checkpoint && checkpointDistance && (
          <div className="bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 p-1.5 rounded-lg text-[11px] flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 font-sans">
              <Flag className="w-3 h-3 text-emerald-400" />
              <span className="truncate max-w-[130px] font-medium">{checkpoint.name}</span>
            </div>
            <span className="font-mono font-bold text-emerald-300">
              {formatDistance(checkpointDistance)}
            </span>
          </div>
        )}

        {/* Quick GPS Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAutoTrack(true);
              requestUserLocation();
            }}
            className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-medium py-1.5 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Center on Me</span>
          </button>

          <button
            onClick={() => setIsSettingCheckpoint(!isSettingCheckpoint)}
            className={`py-1.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow ${
              isSettingCheckpoint
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Click to drop an Assembly / Rendezvous Checkpoint on the map"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{isSettingCheckpoint ? 'Click Map' : 'Set Rendezvous'}</span>
          </button>
        </div>
      </div>

      {/* Floating Tactical Analytics Overlay */}
      {isAnalyticsOverlayOpen && (
        <div className="absolute inset-0 z-30 pointer-events-none p-4 flex items-center justify-center">
          <div className="pointer-events-auto max-w-4xl w-full">
            <TacticalAnalyticsOverlay />
          </div>
        </div>
      )}

      {/* Checkpoint Placement Indicator Banner */}
      {isSettingCheckpoint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs border border-amber-300 animate-bounce">
          <Flag className="w-4 h-4 fill-slate-950" />
          <span>Click anywhere on the Google Map to deploy the Squad Rendezvous Checkpoint</span>
          <button
            onClick={() => setIsSettingCheckpoint(false)}
            className="ml-2 bg-slate-950 text-white text-[10px] px-2 py-0.5 rounded-full"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
