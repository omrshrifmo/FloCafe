'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function KitchenStationsPage() {
  const [stations, setStations] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/v1/eg-kot/stations');
        setStations(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Kitchen Stations</h1>
      <div className="bg-card border rounded-lg p-6 space-y-4">
        {stations.map(station => (
           <div key={station.id} className="flex justify-between border-b pb-2">
              <div>
                  <h3 className="font-semibold">{station.name}</h3>
                  <p className="text-sm text-muted-foreground">Enabled: {station.enabled === 1 ? 'Yes' : 'No'}</p>
              </div>
           </div>
        ))}
      </div>
    </div>
  );
}
