import { AnimatePresence, motion } from 'framer-motion';

export default function PhotoStage({ photos, photoIndex, stopLabel }) {
  const photo = photos[photoIndex];

  return (
    <div
      className="relative flex-1 flex flex-col overflow-hidden"
      style={{ background: '#0E1012' }}
    >
      <div
        className="absolute top-4 left-0 right-0 z-10 text-center font-mono text-xs tracking-widest uppercase"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {stopLabel}
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="crossfade">
          {photo ? (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <img
                src={photo.url}
                alt={photo.caption || ''}
                className="w-full h-full object-cover"
                onError={e => { e.target.style.opacity = '0.1'; }}
              />
              {photo.caption && (
                <div
                  className="absolute bottom-0 left-0 right-0 px-6 py-4"
                  style={{
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    color: '#fff',
                    fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {photo.caption}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No photos for this stop
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
