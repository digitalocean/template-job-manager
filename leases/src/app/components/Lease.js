export default function Lease({ lease }) {
    if (!lease) {
        return (
            <div className="mt-4 p-4 border border-gray-300 rounded">
                <h3 className="text-lg font-semibold mb-2">Lease Details</h3>
                <p>No lease found.</p>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 border border-gray-300 rounded">
            <h3 className="text-lg font-semibold mb-2">Lease Details</h3>
            <p><strong>Resource:</strong> {lease.resource}</p>
            <p><strong>Holder:</strong> {lease.holder}</p>
            <p><strong>Created At:</strong> {new Date(lease.createdAt).toLocaleString()}</p>
            <p><strong>Expires At:</strong> {new Date(lease.expiresAt).toLocaleString()}</p>
            {lease.releasedAt && <p><strong>Released At:</strong> {new Date(lease.releasedAt).toLocaleString()}</p>}
        </div>
    );
}
