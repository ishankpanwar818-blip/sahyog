import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
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
} from 'lucide-react';
import { TacticalAnalyticsOverlay } from './TacticalAnalyticsOverlay';
import { WeatherLayer } from './WeatherLayer';
import { GoogleTacticalMap } from './GoogleTacticalMap';

export const TacticalMap: React.FC = () => {
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('google');
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
    mapMode,
    setMapMode,
    requestUserLocation,
    isLiveTracking,
    toggleLiveTracking,
    flyToLocation,
    setFlyToLocation,
    isOfflineDemo,
    activeAlert,
    isAnalyticsOverlayOpen,
    setIsAnalyticsOverlayOpen,
  } = useSahyog();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const checkpointMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeBadgeMarkerRef = useRef<L.Marker | null>(null);

  const [tileErrorCount, setTileErrorCount] = useState<number>(0);
  const [showTacticalGrid, setShowTacticalGrid] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapReady, setMapReady] = useState<L.Map | null>(null);

  // Find user's "You" coordinates
  const youMember = useMemo(
    () => members.find((m) => m.isCurrentUser) || members[0],
    [members]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [30.308, 78.042]; // Training area in Dun Valley / Rishikesh
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 5,
    });

    mapInstanceRef.current = map;
    setMapReady(map);

    // Default tile layer
    const tileUrl =
      mapMode === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
    });

    tiles.on('tileerror', () => {
      setTileErrorCount((prev) => prev + 1);
    });

    tiles.addTo(map);
    tileLayerRef.current = tiles;

    // Handle map click for Checkpoint Placement
    map.on('click', (e: L.LeafletMouseEvent) => {
      const isSetting = mapContainerRef.current?.getAttribute('data-setting-checkpoint') === 'true';
      if (isSetting) {
        setCheckpoint(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(null);
    };
  }, []);

  // Update tile layer on mapMode change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapMode === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newTiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
    });

    newTiles.on('tileerror', () => {
      setTileErrorCount((prev) => prev + 1);
    });

    newTiles.addTo(mapInstanceRef.current);
    tileLayerRef.current = newTiles;
  }, [mapMode]);

  // Sync isSettingCheckpoint attribute to container for click handler
  useEffect(() => {
    if (mapContainerRef.current) {
      mapContainerRef.current.setAttribute(
        'data-setting-checkpoint',
        isSettingCheckpoint ? 'true' : 'false'
      );
    }
  }, [isSettingCheckpoint]);

  // Handle flyToLocation
  useEffect(() => {
    if (flyToLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([flyToLocation.lat, flyToLocation.lng], 15, {
        duration: 1.2,
      });
      setFlyToLocation(null);
    }
  }, [flyToLocation, setFlyToLocation]);

  // Render & Update Team Member Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Keep track of existing IDs
    const currentMemberIds = new Set(members.map((m) => m.id));

    // Remove markers that no longer exist
    markersRef.current.forEach((marker, id) => {
      if (!currentMemberIds.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    members.forEach((m) => {
      const isSelected = selectedMemberId === m.id;
      const isEmergency = m.status === 'emergency';
      const isCaution = m.status === 'caution';
      const isYou = m.isCurrentUser;

      let iconHtml = '';

      if (isYou) {
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer select-none">
            <div class="absolute w-8 h-8 rounded-full bg-blue-500/20 pulse-location"></div>
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md border ${
              isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
            } bg-blue-600 text-white border-blue-400">
              <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span>You</span>
              <span class="text-[10px] text-blue-100 font-mono">${m.battery}%</span>
            </div>
          </div>
        `;
      } else if (isEmergency) {
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer select-none">
            <div class="absolute w-10 h-10 rounded-full bg-red-500/30 pulse-emergency"></div>
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-lg border ${
              isSelected ? 'ring-2 ring-red-400 ring-offset-2 scale-105' : ''
            } bg-red-600 text-white border-red-300">
              <svg class="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
              </svg>
              <span>${m.name.split(' ')[0]}</span>
              <span class="text-[10px] text-red-100 font-mono">${m.battery}%</span>
            </div>
          </div>
        `;
      } else if (isCaution) {
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer select-none">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md border ${
              isSelected ? 'ring-2 ring-amber-400 ring-offset-2 scale-105' : ''
            } bg-amber-500 text-white border-amber-300">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>${m.name.split(' ')[0]}</span>
              <span class="text-[10px] text-amber-100 font-mono">${m.battery}%</span>
            </div>
          </div>
        `;
      } else {
        // Safe (Green)
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer select-none">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md border ${
              isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 scale-105' : ''
            } bg-emerald-700 text-white border-emerald-500">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>${m.name.split(' ')[0]}</span>
              <span class="text-[10px] text-emerald-100 font-mono">${m.battery}%</span>
            </div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'sahyog-marker',
        iconSize: [110, 36],
        iconAnchor: [55, 18],
      });

      if (markersRef.current.has(m.id)) {
        const marker = markersRef.current.get(m.id)!;
        marker.setLatLng([m.lat, m.lng]);
        marker.setIcon(customIcon);
        marker.setZIndexOffset(isEmergency ? 1000 : isSelected ? 500 : isYou ? 300 : 100);
      } else {
        const marker = L.marker([m.lat, m.lng], {
          icon: customIcon,
          zIndexOffset: isEmergency ? 1000 : isSelected ? 500 : isYou ? 300 : 100,
        });

        marker.on('click', () => {
          setSelectedMemberId(m.id);
        });

        marker.addTo(map);
        markersRef.current.set(m.id, marker);
      }
    });
  }, [members, selectedMemberId, setSelectedMemberId]);

  // Render & Update Checkpoint Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!checkpoint) {
      if (checkpointMarkerRef.current) {
        map.removeLayer(checkpointMarkerRef.current);
        checkpointMarkerRef.current = null;
      }
      return;
    }

    const checkpointHtml = `
      <div class="relative flex items-center justify-center cursor-pointer select-none">
        <div class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md bg-slate-900 text-white border border-slate-700">
          <svg class="w-3.5 h-3.5 text-blue-400 fill-current" viewBox="0 0 24 24">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>${checkpoint.name.split(' (')[0]}</span>
        </div>
      </div>
    `;

    const checkpointIcon = L.divIcon({
      html: checkpointHtml,
      className: 'sahyog-marker',
      iconSize: [140, 36],
      iconAnchor: [70, 18],
    });

    if (checkpointMarkerRef.current) {
      checkpointMarkerRef.current.setLatLng([checkpoint.lat, checkpoint.lng]);
      checkpointMarkerRef.current.setIcon(checkpointIcon);
    } else {
      const marker = L.marker([checkpoint.lat, checkpoint.lng], {
        icon: checkpointIcon,
        zIndexOffset: 600,
      });

      marker.addTo(map);
      checkpointMarkerRef.current = marker;
    }
  }, [checkpoint]);

  // Render approximate straight-line route polyline to selected member or checkpoint
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Target to measure from "You"
    const target =
      selectedMember && selectedMember.id !== youMember.id
        ? { lat: selectedMember.lat, lng: selectedMember.lng, label: selectedMember.name }
        : checkpoint
        ? { lat: checkpoint.lat, lng: checkpoint.lng, label: checkpoint.name }
        : null;

    if (!target) {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (routeBadgeMarkerRef.current) {
        map.removeLayer(routeBadgeMarkerRef.current);
        routeBadgeMarkerRef.current = null;
      }
      return;
    }

    const latlngs: [number, number][] = [
      [youMember.lat, youMember.lng],
      [target.lat, target.lng],
    ];

    const distKm = calculateHaversineDistance(youMember, target);
    const distText = formatDistance(distKm);

    // Polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(latlngs);
    } else {
      const poly = L.polyline(latlngs, {
        color: selectedMember?.status === 'emergency' ? '#ef4444' : '#2563eb',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '8, 8',
      });
      poly.addTo(map);
      routePolylineRef.current = poly;
    }

    // Distance Callout Badge at midpoint
    const midLat = (youMember.lat + target.lat) / 2;
    const midLng = (youMember.lng + target.lng) / 2;

    const badgeHtml = `
      <div class="px-2 py-0.5 rounded bg-slate-900/90 text-white text-[11px] font-mono font-medium shadow-md border border-slate-700 whitespace-nowrap">
        ${distText} <span class="text-[9px] text-slate-400 font-sans">(approx)</span>
      </div>
    `;

    const badgeIcon = L.divIcon({
      html: badgeHtml,
      className: 'sahyog-marker',
      iconSize: [100, 24],
      iconAnchor: [50, 12],
    });

    if (routeBadgeMarkerRef.current) {
      routeBadgeMarkerRef.current.setLatLng([midLat, midLng]);
      routeBadgeMarkerRef.current.setIcon(badgeIcon);
    } else {
      const badge = L.marker([midLat, midLng], {
        icon: badgeIcon,
        zIndexOffset: 700,
        interactive: false,
      });
      badge.addTo(map);
      routeBadgeMarkerRef.current = badge;
    }
  }, [selectedMember, youMember, checkpoint]);

  // Recenter map helper
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (selectedMember) {
      mapInstanceRef.current.flyTo([selectedMember.lat, selectedMember.lng], 15, {
        duration: 0.8,
      });
    } else {
      const bounds = L.latLngBounds(members.map((m) => [m.lat, m.lng]));
      if (checkpoint) bounds.extend([checkpoint.lat, checkpoint.lng]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
    }
  };

  // If Google Maps engine is active, render GoogleTacticalMap as the primary tactical map
  if (mapEngine === 'google') {
    return (
      <div className="relative w-full h-full">
        <GoogleTacticalMap />
        <button
          onClick={() => setMapEngine('leaflet')}
          className="absolute bottom-3 right-16 z-30 bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-mono px-2.5 py-1.5 rounded-xl border border-slate-700 shadow-xl backdrop-blur-sm transition-colors flex items-center gap-1.5"
          title="Switch to Leaflet OpenStreetMap Engine"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Engine: Google Maps</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden flex flex-col">
      {/* Engine Switcher */}
      <button
        onClick={() => setMapEngine('google')}
        className="absolute bottom-3 right-16 z-[400] bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-mono px-2.5 py-1.5 rounded-xl border border-slate-700 shadow-xl backdrop-blur-sm transition-colors flex items-center gap-1.5"
        title="Switch to Google Maps Platform"
      >
        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
        <span>Engine: Leaflet (Switch to Google Maps)</span>
      </button>

      {/* Search & Top Action Bar over Map */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none gap-2">
        {/* Search location bar */}
        <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-sm shadow-sm border border-slate-200/80 rounded-lg px-3 py-1.5 w-72 max-w-[55vw]">
          <Crosshair className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search member, coordinate, or area..."
            value={searchQuery}
            onChange={(e) => {
              const q = e.target.value;
              setSearchQuery(q);
              const found = members.find(
                (m) =>
                  m.name.toLowerCase().includes(q.toLowerCase()) ||
                  m.callsign.toLowerCase().includes(q.toLowerCase())
              );
              if (found) {
                setSelectedMemberId(found.id);
                setFlyToLocation({ lat: found.lat, lng: found.lng });
              }
            }}
            className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 ml-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Shared Squad & Mission Context Badge */}
        <div className="hidden xl:flex pointer-events-auto items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-700 text-xs">
          <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{partyCode}</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-200 font-medium truncate max-w-[200px]">{missionName}</span>
        </div>

        {/* Map / Satellite & Tactical Grid Layer Switches + Live Tracking */}
        <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-sm shadow-sm border border-slate-200/80 rounded-lg p-1 gap-1">
          {/* Live GPS Tracking Toggle */}
          <button
            onClick={toggleLiveTracking}
            title={isLiveTracking ? 'Live Real-time GPS Tracking ACTIVE' : 'Enable Real-time GPS Tracking'}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-all flex items-center gap-1.5 ${
              isLiveTracking
                ? 'bg-emerald-600 text-white shadow-xs animate-pulse ring-2 ring-emerald-300'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLiveTracking ? 'text-white' : 'text-emerald-600'}`} />
            <span>{isLiveTracking ? 'Tracking Live' : 'Live Tracking'}</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5"></div>

          <button
            onClick={() => setMapMode('osm')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              mapMode === 'osm'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              mapMode === 'satellite'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setShowTacticalGrid((prev) => !prev)}
            title="Toggle tactical grid & contour guide"
            className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
              showTacticalGrid
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5"></div>

          {/* Dedicated Analytical Overlay Toggle Button */}
          <button
            onClick={() => setIsAnalyticsOverlayOpen(!isAnalyticsOverlayOpen)}
            title="Open Dedicated Analytical Telemetry Overlay"
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors flex items-center gap-1.5 shadow-2xs ${
              isAnalyticsOverlayOpen
                ? 'bg-slate-900 text-emerald-400 ring-2 ring-emerald-400/40'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Crosshair Checkpoint Placement Indicator Banner */}
      {isSettingCheckpoint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[500] bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2.5 animate-bounce">
          <Flag className="w-4 h-4 text-blue-400" />
          <span>Click anywhere on the map to place Assembly Checkpoint</span>
          <button
            onClick={() => setIsSettingCheckpoint(false)}
            className="ml-2 text-slate-400 hover:text-white underline text-[11px]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Offline Grid Overlay if enabled or tiles fail */}
      {showTacticalGrid && (
        <div className="absolute inset-0 z-[350] pointer-events-none opacity-20 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:40px_40px]">
          <div className="absolute bottom-14 left-4 text-[10px] font-mono text-slate-800 bg-white/80 px-2 py-1 rounded">
            TACTICAL MGRS GRID REF: 43RFP 882 524 · ELEVATION: 440m - 1800m
          </div>
        </div>
      )}

      {/* Dedicated Tactical Analytical Overlay */}
      <TacticalAnalyticsOverlay />

      {/* Real-time Rescue Weather Layer (Precipitation Radar & Wind Telemetry) */}
      <WeatherLayer map={mapReady} />

      {/* Main Map Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full relative ${
          isSettingCheckpoint ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Floating Map Controls (Right Side) */}
      <div className="absolute right-3 bottom-8 z-[400] flex flex-col gap-1.5 shadow-sm">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          title="Zoom in"
          className="w-8 h-8 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-md flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-bold text-sm shadow-xs transition-colors"
        >
          +
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          title="Zoom out"
          className="w-8 h-8 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-md flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-bold text-sm shadow-xs transition-colors"
        >
          −
        </button>
        <button
          onClick={handleRecenter}
          title="Recenter view on team"
          className="w-8 h-8 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-md flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => requestUserLocation()}
          title="Lock live GPS with permission"
          className="w-8 h-8 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-md flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 shadow-xs transition-colors"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Scale & Training Zone Label (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded px-2 py-0.5 text-[10px] text-slate-600 font-mono shadow-xs flex items-center gap-1.5">
          <div className="w-12 h-1 bg-slate-800 rounded-xs"></div>
          <span>1 km</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Dun Valley Exercise Zone</span>
        </div>
      </div>

      {/* Mini Legend (Bottom Center) */}
      <div className="hidden lg:flex absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-full px-3 py-1 shadow-xs items-center gap-3 text-[11px] text-slate-600 pointer-events-none">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>You</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
          <span>Safe</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Caution</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-600"></span>
          <span>Emergency</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-900"></span>
          <span>Checkpoint</span>
        </div>
      </div>
    </div>
  );
};
