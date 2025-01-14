'use client'
import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import Lease from '@/app/components/Lease';

const fetcher = url => fetch(url).then(res => res.json());

export default function Home() {
  const [filter, setFilter] = useState('all');
  const [leaseId, setLeaseId] = useState('');
  const [lease, setLease] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'lease'
  const [lookupError, setLookupError] = useState('');

  const { data: leasesData, error: leasesError, isLoading: isLoadingLeases } = useSWR((filter === 'all' ? '/api/leases' : `/api/leases/${filter}`), fetcher, { refreshInterval: 1000 });
  const { data: leaseData, error: leaseError, isLoading: isLoadingLease } = useSWR(leaseId ? `/api/leases/${leaseId}` : null, fetcher, { refreshInterval: 1000 });

  const leases = leasesData ? leasesData.leases : [];

  useEffect(() => {
    if (leaseData) {
      setLease(leaseData.lease);
      setView('lease');
    }
  }, [leaseData]);

  const handleLookup = () => {
    if (!leaseId) {
      setLookupError('Please enter a lease ID.');
      return;
    }
    setLookupError('');
    mutate(`/api/leases/${leaseId}`);
  };

  const handleFilterApply = () => {
    setView('list');
  };

  const handleLeaseIdChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setLeaseId(value);
    }
  };

  return (
    <main className="flex-grow p-8 flex">
      <div className="w-1/5 pr-4 border-r border-gray-300">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Filter Leases</h2>
          <label className="block mb-4">
            <span className="text-gray-700">Filter:</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="block w-full mt-1 p-2 border border-gray-300 rounded">
              <option value="all">All</option>
              <option value="expired">Expired</option>
              <option value="active">Active</option>
              <option value="released">Released</option>
              <option value="renewed">Renewed</option>
            </select>
          </label>
          <button onClick={handleFilterApply} className="bg-blue-600 text-white rounded-full px-4 py-2 hover:bg-blue-700 transition">
            Apply Filter
          </button>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Lookup Lease by ID</h2>
          <label className="block mb-4">
            <span className="text-gray-700">Lease ID:</span>
            <input
              type="text"
              value={leaseId}
              onChange={handleLeaseIdChange}
              placeholder="Enter lease ID"
              className="block w-full mt-1 p-2 border border-gray-300 rounded"
            />
          </label>
          <button onClick={handleLookup} className="bg-blue-600 text-white rounded-full px-4 py-2 hover:bg-blue-700 transition">
            Lookup
          </button>
          {lookupError && <p className="text-red-600 mt-4">{lookupError}</p>}
          {leaseError && <p className="text-red-600 mt-4">Error fetching lease: {leaseError.message}</p>}
        </div>
      </div>
      <div className="w-4/5 pl-4">
        {view === 'list' ? (
          <div className="mt-4 p-4 border border-gray-300 rounded">
            <h2 className="text-xl font-semibold mb-4">Leases</h2>
            {isLoadingLeases ? (
              <div className="spinner">Loading...</div>
            ) : leasesError ? (
              <p className="text-red-600 mt-4">Error fetching leases: {leasesError.message}</p>
            ) : (
              <ul className="list-none list-inside">
                {leases?.length > 0 ? (
                  leases.map(lease => (
                    <li key={lease.id} className="mb-2 cursor-pointer" onClick={() => { setLeaseId(lease.id); setView('lease'); }}>
                      <strong>{lease.resource}</strong> - {lease.holder}
                    </li>
                  ))
                ) : (
                  <li>No leases found.</li>
                )}
              </ul>
            )}
          </div>
        ) : (
          <div>
            {isLoadingLease ? (
              <div className="spinner">Loading...</div>
            ) : (
              <Lease lease={lease} />
            )}
          </div>
        )}
      </div>
    </main>
  );
};
