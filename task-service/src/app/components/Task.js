export default function Task({ task }) {
    if (!task) {
        return (
            <div className="mt-4 p-4 border border-gray-300 rounded">
                <h3 className="text-lg font-semibold mb-2">Task Details</h3>
                <p>Task not found.</p>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 border border-gray-300 rounded">
            <h3 className="text-lg font-semibold mb-2">Task Details</h3>
            <p><strong>Id:</strong> {task.id}</p>
            <p><strong>Scheduled At:</strong> {new Date(task.scheduledAt).toLocaleString()}</p>
            {task.startedAt && <p><strong>Started At:</strong> {new Date(task.startedAt).toLocaleString()}</p>}
            {task.processedAt && <p><strong>Processed At:</strong> {new Date(task.processedAt).toLocaleString()}</p>}
            {task.mustHeartBeatBefore && <p><strong>Must HeartBeat Before:</strong> {new Date(task.mustHeartBeatBefore).toLocaleString()}</p>}
            {task.lastHeartBeatAt && <p><strong>Last Heartbeat At:</strong> {new Date(task.lastHeartBeatAt).toLocaleString()}</p>}
            {task.must && <p><strong>Last Heartbeat At:</strong> {new Date(task.lastHeartBeatAt).toLocaleString()}</p>}
            <div>
                <p><strong>Task Data:</strong></p>
                <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(task.taskData)}</pre>
            </div>
            {task.processedAt && <div><strong>Task Output:</strong><pre className="bg-gray-100 p-2 rounded">{JSON.stringify(task?.taskOutput)}</pre></div>}
        </div>
    );
}