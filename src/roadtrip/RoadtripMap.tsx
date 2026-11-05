import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type { RoadtripPlace } from './types';

type Props = {
  places: RoadtripPlace[];
  picking: boolean;
  onSelect: (place: RoadtripPlace) => void;
  onPick: (lat: number, lng: number) => void;
  onCancelPick: () => void;
};

const JAPAN_BOUNDS = L.latLngBounds([24, 122], [46, 146]);

type StatusMarker = L.Marker & { rtStatus?: 'planned' | 'visited' };

export function RoadtripMap({ places, picking, onSelect, onPick, onCancelPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  const pickingRef = useRef(picking);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    pickingRef.current = picking;
    if (mapRef.current) {
      mapRef.current.getContainer().classList.toggle('is-picking', picking);
    }
    if (clusterRef.current) {
      (clusterRef.current.options as L.MarkerClusterGroupOptions).zoomToBoundsOnClick = !picking;
    }
  }, [picking]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [36.7, 137.0],
      zoom: 5,
      minZoom: 3,
      maxZoom: 17,
      maxBounds: [
        [22, 120],
        [48, 150],
      ],
      maxBoundsViscosity: 0.75,
      zoomControl: false,
    });

    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 30,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (group) => {
        const children = group.getAllChildMarkers() as StatusMarker[];
        const plannedOnly =
          children.length > 0 && children.every((marker) => marker.rtStatus === 'planned');
        return L.divIcon({
          className: 'rt-cluster-wrap',
          html: `<span class="rt-cluster${plannedOnly ? ' rt-cluster--planned' : ''}"><span>${group.getChildCount()}</span></span>`,
          iconSize: L.point(36, 36),
          iconAnchor: L.point(18, 18),
        });
      },
    });
    cluster.addTo(map);
    clusterRef.current = cluster;

    cluster.on('clusterclick', (event) => {
      if (!pickingRef.current) return;
      const layer = (event as L.LeafletEvent & { layer: L.MarkerCluster }).layer;
      const latlng = layer.getLatLng();
      onPickRef.current(latlng.lat, latlng.lng);
    });

    map.on('click', (event: L.LeafletMouseEvent) => {
      if (pickingRef.current) {
        onPickRef.current(event.latlng.lat, event.latlng.lng);
      }
    });

    mapRef.current = map;
    const timer = window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();

    for (const place of places) {
      const icon = L.divIcon({
        className: 'rt-pin-wrap',
        html: `<span class="rt-pin rt-pin--${place.status}"><span class="rt-pin__inner">${
          place.status === 'visited' ? '✓' : '+'
        }</span></span>`,
        iconSize: [30, 38],
        iconAnchor: [15, 35],
        tooltipAnchor: [0, -30],
      });

      const marker = L.marker([place.lat, place.lng], {
        icon,
        title: place.name,
        riseOnHover: true,
      }) as StatusMarker;
      marker.rtStatus = place.status;
      marker.addTo(cluster);

      const tooltip = document.createElement('span');
      tooltip.textContent = place.name;
      marker.bindTooltip(tooltip, {
        direction: 'top',
        offset: [0, -8],
        className: 'rt-tooltip',
      });

      marker.on('click', () => {
        if (pickingRef.current) {
          onPickRef.current(place.lat, place.lng);
          return;
        }
        onSelectRef.current(place);
      });
    }
  }, [places]);

  const resetView = () => {
    mapRef.current?.flyToBounds(JAPAN_BOUNDS, { padding: [18, 18], duration: 0.7 });
  };

  return (
    <div className={`rt-map${picking ? ' is-picking' : ''}`}>
      <div ref={containerRef} className="rt-map__canvas" aria-label="日本旅行打卡地图" />

      <div className="rt-map__legend" aria-hidden="true">
        <span>
          <i className="rt-legend-dot rt-legend-dot--visited" />
          去过
        </span>
        <span>
          <i className="rt-legend-dot rt-legend-dot--planned" />
          计划
        </span>
      </div>

      {!picking ? (
        <button type="button" className="rt-map__reset" onClick={resetView}>
          全图
        </button>
      ) : null}

      {picking ? (
        <div className="rt-map__picking">
          <span className="rt-map__pulse" />
          <span>点地图上的位置</span>
          <button type="button" onClick={onCancelPick}>
            取消
          </button>
        </div>
      ) : null}
    </div>
  );
}
