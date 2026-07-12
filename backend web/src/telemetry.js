import db from './db.js';

// Pre-defined geometric waypoint tracks, keyed by "source-destination" (lowercased).
// Coordinates roughly trace the real highway corridors between the cities.
const ROUTE_TRACKS = {
  'mumbai-pune': [
    [19.076, 72.8777], [19.033, 73.0297], [18.9894, 73.1175], [18.8987, 73.2648],
    [18.7862, 73.3421], [18.7546, 73.4062], [18.7351, 73.5372], [18.7292, 73.6763],
    [18.6668, 73.7597], [18.5913, 73.7389], [18.5204, 73.8567],
  ],
  'delhi-jaipur': [
    [28.6139, 77.209], [28.4595, 77.0266], [28.3336, 76.9203], [28.2039, 76.7927],
    [28.0459, 76.6076], [27.8917, 76.2837], [27.702, 76.1998], [27.5537, 76.1355],
    [27.3921, 75.9625], [27.1329, 75.8703], [26.9124, 75.7873],
  ],
  'bengaluru-chennai': [
    [12.9716, 77.5946], [13.0091, 77.7107], [13.0707, 77.7981], [13.1362, 78.1291],
    [13.2064, 78.4671], [13.2172, 79.1003], [12.9349, 79.3327], [12.9165, 79.5333],
    [12.9675, 79.9442], [13.048, 80.1094], [13.0827, 80.2707],
  ],
  'pune-nashik': [
    [18.5204, 73.8567], [18.7606, 73.8636], [18.867, 73.8887], [19.004, 73.9435],
    [19.1004, 73.9707], [19.3273, 74.1804], [19.5771, 74.2115], [19.8477, 74.0089],
    [19.9975, 73.7898],
  ],
  'chennai-coimbatore': [
    [13.0827, 80.2707], [12.6921, 79.9789], [12.2508, 79.6529], [11.9401, 79.4861],
    [11.6905, 79.0316], [11.6643, 78.146], [11.4441, 77.6813], [11.1926, 77.2673],
    [11.0168, 76.9558],
  ],
};

// Resolve a track for a trip; supports reverse direction (e.g. "Pune-Mumbai")
// by flipping a known forward track. Returns null when no route is defined.
function resolveTrack(source, destination) {
  const forward = `${source}-${destination}`.toLowerCase().trim();
  if (ROUTE_TRACKS[forward]) return ROUTE_TRACKS[forward];
  const reverse = `${destination}-${source}`.toLowerCase().trim();
  if (ROUTE_TRACKS[reverse]) return [...ROUTE_TRACKS[reverse]].reverse();
  return null;
}

const activeTripsStmt = db.prepare(`
  SELECT t.id AS trip_id, t.source, t.destination,
         v.name AS vehicle_name, v.reg_no
  FROM trips t
  JOIN vehicles v ON v.id = t.vehicle_id
  WHERE t.status = 'Dispatched'
`);

// In-memory per-trip waypoint cursor: trip_id -> index into its track
const tripPositions = new Map();
// Trips warned about once, so missing route definitions don't spam the log
const warnedRoutes = new Set();

function buildTelemetryFrame() {
  const trips = activeTripsStmt.all();
  const frame = [];
  const liveIds = new Set();

  for (const trip of trips) {
    const track = resolveTrack(trip.source, trip.destination);
    if (!track || track.length === 0) {
      if (!warnedRoutes.has(trip.trip_id)) {
        warnedRoutes.add(trip.trip_id);
        console.warn(`[telemetry] No waypoint track for trip #${trip.trip_id} (${trip.source} -> ${trip.destination}); skipping`);
      }
      continue;
    }

    liveIds.add(trip.trip_id);
    const lastIndex = track.length - 1;
    const prev = tripPositions.get(trip.trip_id);
    // Advance one waypoint per cycle; hold at the destination once reached
    const index = prev == null ? 0 : Math.min(prev + 1, lastIndex);
    tripPositions.set(trip.trip_id, index);

    const [lat, lng] = track[index];
    frame.push({
      trip_id: trip.trip_id,
      vehicle_name: trip.vehicle_name,
      reg_no: trip.reg_no,
      route: `${trip.source} → ${trip.destination}`,
      lat,
      lng,
      arrived: index === lastIndex,
    });
  }

  // Drop cursor state for trips that completed / were cancelled
  for (const id of tripPositions.keys()) {
    if (!liveIds.has(id)) {
      tripPositions.delete(id);
      warnedRoutes.delete(id);
    }
  }

  return frame;
}

export function startTelemetryLoop(io, intervalMs = 2000) {
  const tick = () => {
    try {
      io.emit('fleet:telemetry', buildTelemetryFrame());
    } catch (err) {
      console.error('[telemetry] simulation tick failed:', err);
    }
  };

  // Give late joiners an immediate frame instead of waiting a full cycle
  io.on('connection', (socket) => {
    socket.emit('fleet:telemetry', buildTelemetryFrame());
  });

  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  console.log(`[telemetry] Fleet simulation broadcasting every ${intervalMs / 1000}s on 'fleet:telemetry'`);
  return timer;
}
