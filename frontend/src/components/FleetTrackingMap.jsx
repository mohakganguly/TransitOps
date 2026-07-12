import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet's default icon URLs break under bundlers; point them at the
// module assets so markers render instead of broken image boxes.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const INDIA_CENTER = [21.5, 78.5];

const isValidTelemetry = (t) =>
  t && t.trip_id != null && Number.isFinite(t.lat) && Number.isFinite(t.lng);

// Keeps the viewport fitted around every live marker as trucks travel.
function AutoFitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds.pad(0.25), { animate: true, maxZoom: 11 });
  }, [map, positions]);
  return null;
}

export default function FleetTrackingMap() {
  // Normalized telemetry state keyed by trip_id: { [trip_id]: payload }
  const [fleet, setFleet] = useState({});
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Same-origin connection; Vite proxies /socket.io to the API in dev
    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('fleet:telemetry', (frame) => {
      if (!Array.isArray(frame)) return;
      // Each frame is a full snapshot, so rebuilding the index also
      // removes trips that completed or were cancelled.
      setFleet(
        Object.fromEntries(
          frame.filter(isValidTelemetry).map((t) => [t.trip_id, t])
        )
      );
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const vehicles = useMemo(() => Object.values(fleet), [fleet]);
  const positions = useMemo(() => vehicles.map((v) => [v.lat, v.lng]), [vehicles]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Live Fleet Tracking</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time positions of dispatched vehicles, updated every 2 seconds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {vehicles.length} active {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
          </span>
          <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? 'animate-pulse bg-emerald-500' : 'bg-red-500'
              }`}
            />
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="relative z-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-800">
        <MapContainer
          center={INDIA_CENTER}
          zoom={5}
          scrollWheelZoom
          className="h-[65vh] min-h-[420px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <AutoFitBounds positions={positions} />
          {vehicles.map((v) => (
            <Marker key={v.trip_id} position={[v.lat, v.lng]}>
              <Popup>
                <div className="min-w-[170px] space-y-1 text-sm">
                  <div className="font-semibold">{v.vehicle_name}</div>
                  <div className="text-slate-600">Reg: {v.reg_no}</div>
                  <div className="text-slate-600">Route: {v.route}</div>
                  <div className={v.arrived ? 'font-medium text-emerald-600' : 'text-blue-600'}>
                    {v.arrived ? '✓ Arrived at destination' : 'En route'}
                  </div>
                  <div className="text-xs text-slate-400">Trip #{v.trip_id}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {vehicles.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
            <div className="rounded-lg bg-white/90 px-5 py-3 text-sm font-medium text-slate-600 shadow dark:bg-slate-900/90 dark:text-slate-300">
              {connected
                ? 'No dispatched trips right now — dispatch a trip to see it move.'
                : 'Connecting to telemetry stream…'}
            </div>
          </div>
        )}
      </div>

      {vehicles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <div
              key={v.trip_id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{v.vehicle_name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    v.arrived
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}
                >
                  {v.arrived ? 'Arrived' : 'En route'}
                </span>
              </div>
              <div className="text-xs text-slate-400">Trip #{v.trip_id}</div>
              <div className="text-slate-500 dark:text-slate-400">{v.reg_no}</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300">{v.route}</div>
              <div className="mt-1 font-mono text-xs text-slate-400">
                {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
