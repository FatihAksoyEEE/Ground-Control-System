
import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issues in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Plane Icon (SVG)
const planeIcon = new L.DivIcon({
    html: `<svg viewBox="0 0 24 24" fill="cyan" stroke="black" stroke-width="1.5" style="filter: drop-shadow(0 0 5px cyan);">
          <path d="M12 2L2 22l10-3 10 3L12 2z"/>
         </svg>`,
    className: 'plane-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

// Numbered Icons for Waypoints
const createWpIcon = (number, isSelected) => new L.DivIcon({
    html: `<div style="
        background-color: ${isSelected ? '#FFD700' : '#2ecc71'};
        color: black;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-weight: bold;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
    ">${number}</div>`,
    className: 'wp-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});


// Component to handle map clicks
function MapEvents({ onClick }) {
    useMapEvents({
        click(e) {
            onClick(e.latlng);
        },
    });
    return null;
}

// Component to rotate the plane marker
function RotatedMarker({ position, rotation, icon }) {
    const markerRef = useRef(null);

    useEffect(() => {
        if (markerRef.current) {
            const el = markerRef.current.getElement();
            if (el) {
                // Apply rotation to the icon wrapper
                const iconDiv = el.querySelector('div') || el;
                iconDiv.style.transform = `rotate(${rotation}deg)`;
                iconDiv.style.transition = 'transform 0.2s linear';
            }
        }
    }, [rotation]);

    return <Marker ref={markerRef} position={position} icon={icon} />;
}

// Draggable Waypoint Marker
function DraggableMarker({ wp, index, onDragEnd, isSelected, onClick }) {
    const markerRef = useRef(null);
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker) {
                    onDragEnd(wp.id, marker.getLatLng());
                }
            },
            click() {
                onClick && onClick(wp.id);
            }
        }),
        [wp.id, onDragEnd, onClick]
    );

    return (
        <Marker
            draggable={!!onDragEnd}
            eventHandlers={eventHandlers}
            position={[wp.lat, wp.lon]}
            icon={createWpIcon(index + 1, isSelected)}
            ref={markerRef}
        >
            <Popup>
                <b>WP {index + 1}</b><br />
                Alt: {wp.alt}m<br />
                CMD: {wp.cmd}
            </Popup>
        </Marker>
    );
}


// Component to handle map resize and invalidation
function MapController() {
    const map = useMap();
    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });
        resizeObserver.observe(map.getContainer());
        return () => resizeObserver.disconnect();
    }, [map]);
    return null;
}

const MissionMap = ({
    heading = 0,
    lat = 41.0082,
    lon = 28.9784,
    waypoints = [],
    selectedWpId = null,
    onMapClick,
    onWpDragEnd,
    onWpClick
}) => {
    const position = [lat, lon];

    // Calculate polyline coordinates from waypoints
    const routeLine = waypoints.map(wp => [wp.lat, wp.lon]);

    return (
        <MapContainer
            center={position}
            zoom={15}
            style={{ height: '100%', width: '100%', background: '#222' }}
            zoomControl={false}
            attributionControl={false}
        >
            <MapController />
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Plane Marker */}
            <RotatedMarker position={position} rotation={heading} icon={planeIcon} />

            {/* Waypoints & Route */}
            {waypoints.map((wp, idx) => (
                <DraggableMarker
                    key={wp.id}
                    wp={wp}
                    index={idx}
                    onDragEnd={onWpDragEnd}
                    isSelected={wp.id === selectedWpId}
                    onClick={onWpClick}
                />
            ))}

            {routeLine.length > 1 && (
                <Polyline positions={routeLine} color="#2ecc71" dashArray="5, 10" weight={3} />
            )}

            {/* Click Handler (Only active if onMapClick is provided) */}
            {onMapClick && <MapEvents onClick={onMapClick} />}

        </MapContainer>
    );
};

export default MissionMap;
