import { useEffect, useState } from 'react';
import { fetchStreetImage } from '../../utils/mapillaryEngine';
import sentinelBus from '../../utils/sentinelBus';
import ReportButton from '../inspire/ReportButton.jsx';

const ACTION_EVENTS = {
  'Add to Leg':          'LEG_STOP_ADDED',
  'Add Supply Stop':     'LOGISTICS_STOP_ADDED',
  'Save to Collection':  'COLLECTION_POI_SAVED',
  'Save POI':            'POI_SAVED',
  'Mark Safe Point':     'TACTICAL_SAFE_POINT_MARKED',
  'SOS Anchor':          'TACTICAL_SOS_ANCHOR_SET',
  'Log Expense Stop':    'BUDGET_EXPENSE_STOP_LOGGED',
  'Add to Mission':      'STRATEGY_DESTINATION_ADDED',
  'Share':               'POI_SHARE_REQUESTED',
};

const CATEGORY_ICONS = {
  cafe:            '☕',
  restaurant:      '🍽',
  hospital:        '🏥',
  pharmacy:        '💊',
  toilets:         '🚻',
  drinking_water:  '💧',
  supermarket:     '🛒',
  atm:             '💳',
  viewpoint:       '🔭',
  attraction:      '🗺',
  aerodrome:       '✈️',
  fuel:            '⛽',
};

function CategoryIcon({ category }) {
  const icon = CATEGORY_ICONS[category] ?? '📍';
  return (
    <div className="flex items-center justify-center w-full h-32 rounded-lg text-5xl"
         style={{ background: '#0E1012', border: '1px solid #E67E2230' }}>
      {icon}
    </div>
  );
}

export function POIDetailSheet({ poi, actions, onClose }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    if (!poi) return;
    setImgLoading(true);
    fetchStreetImage(poi.coords.lat, poi.coords.lng)
      .then(url => { setImgUrl(url); setImgLoading(false); });
  }, [poi]);

  if (!poi) return null;

  function handleAction(label) {
    const event = ACTION_EVENTS[label];
    if (event) sentinelBus.emit(event, { poi });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6 flex flex-col gap-4"
           style={{ background: '#0E1012', border: '1px solid #E67E2230', maxHeight: '80vh', overflowY: 'auto' }}>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#fff' }}>
              {poi.name}
            </h2>
            <span className="label-tag mt-1 inline-block">{poi.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <ReportButton cityId={poi.id} cityName={poi.name} country="" poiId={poi.id} small />
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>

        {imgLoading ? (
          <div className="h-32 rounded-lg animate-pulse" style={{ background: '#1a1c1f' }} />
        ) : imgUrl ? (
          <img src={imgUrl} alt={poi.name} className="w-full h-32 object-cover rounded-lg" />
        ) : (
          <CategoryIcon category={poi.category} />
        )}

        <div className="flex flex-col gap-1 font-mono text-sm" style={{ color: '#D9C5B2' }}>
          {poi.address && <span>{poi.address}</span>}
          {poi.osmTags?.opening_hours && <span>🕐 {poi.osmTags.opening_hours}</span>}
          {poi.osmTags?.phone && <span>📞 {poi.osmTags.phone}</span>}
          {poi.osmTags?.website && (
            <a href={poi.osmTags.website} target="_blank" rel="noreferrer"
               style={{ color: '#E67E22' }} className="truncate">
              {poi.osmTags.website}
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {actions.map(label => (
            <button key={label} onClick={() => handleAction(label)}
                    className="w-full py-2 rounded-lg font-mono text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: '#E67E22', color: '#0E1012' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
