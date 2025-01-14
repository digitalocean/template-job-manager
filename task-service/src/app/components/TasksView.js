'use client'
import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import Task from '@/app/components/Task';

const fetcher = url => fetch(url).then(res => res.json());

export default function TasksView() {
    const [filter, setFilter] = useState('all');
    const [taskId, setTaskId] = useState('');
    const [task, setTask] = useState(null);
    const [view, setView] = useState('list'); // 'list' or 'task'
    const [lookupError, setLookupError] = useState('');
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000); // Update every second

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    const { data: tasksData, error: tasksError, isLoading: isLoadingTasks } = useSWR((filter === 'all' ? '/api/tasks' : `/api/tasks/${filter}`), fetcher, { refreshInterval: 500 });
    const { data: taskData, error: taskError, isLoading: isLoadingTask } = useSWR(taskId ? `/api/tasks/${taskId}` : null, fetcher, { refreshInterval: 500 });

    const tasks = tasksData ? tasksData.tasks : [];

    useEffect(() => {
        if (taskData) {
            setTask(taskData.task);
            setView('task');
        }
    }, [taskData]);

    const handleLookup = () => {
        if (!taskId) {
            setLookupError('Please enter a task ID.');
            return;
        }
        setLookupError('');
        mutate(`/api/tasks/${taskId}`);
    };

    const handleFilterApply = () => {
        setView('list');
    };

    const handleTaskIdChange = (e) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setTaskId(value);
        }
    };

    const isWorkerLateClassNames = (task) => {
        if (!task?.mustHeartBeatBefore || !task?.lastHeartBeatAt) {
            return '';
        }
        if (task.processedAt) {
            return 'bg-green-400 text-white';
        }

        const heartbeatTimeout = (new Date(task.mustHeartBeatBefore) - new Date(task.lastHeartBeatAt)) / 1000;
        const secondsUntilLate = (new Date(task.mustHeartBeatBefore) - now) / 1000;

        // Calculate lateness percentage
        const latenessPercentage = Math.min(
            Math.max(0, (heartbeatTimeout - secondsUntilLate) / heartbeatTimeout * 100),
            Infinity
        );

        if (secondsUntilLate > heartbeatTimeout) {
            // Far ahead of schedule (very early)
            return 'bg-gradient-to-r from-blue-500 to-green-400 text-white';
        } else if (latenessPercentage <= 10) {
            // Early (close to being on time)
            return 'bg-gradient-to-r from-green-400 to-green-500 text-white';
        } else if (latenessPercentage <= 20) {
            return 'bg-gradient-to-r from-green-500 to-yellow-400 text-white';
        } else if (latenessPercentage <= 30) {
            return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
        } else if (latenessPercentage <= 40) {
            return 'bg-gradient-to-r from-yellow-500 to-orange-400 text-white';
        } else if (latenessPercentage <= 50) {
            return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white';
        } else if (latenessPercentage <= 60) {
            return 'bg-gradient-to-r from-orange-500 to-red-400 text-white';
        } else if (latenessPercentage <= 70) {
            return 'bg-gradient-to-r from-red-400 to-red-500 text-white';
        } else if (latenessPercentage <= 80) {
            return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
        } else if (latenessPercentage <= 90) {
            return 'bg-gradient-to-r from-red-600 to-red-700 text-white animate-pulse';
        } else if (latenessPercentage <= 100) {
            return 'bg-gradient-to-r from-red-700 to-red-800 text-white animate-pulse';
        } else if (latenessPercentage <= 200) {
            // Beyond 100% - Late (Flame effect)
            return 'bg-gradient-to-r from-orange-600 via-yellow-500 to-red-700 text-white animate-flame overflow-hidden';
        } else {
            return 'bg-red-400'
        }
    };

    const formatCountdown = (mustHeartBeatBefore) => {
        const now = new Date();
        let remainingTime = (new Date(mustHeartBeatBefore) - now) / 1000;


        const isLate = remainingTime < 0;
        const absoluteTime = Math.abs(remainingTime);
        const minutes = Math.floor(absoluteTime / 60);
        const seconds = Math.floor(absoluteTime % 60);

        return `${isLate ? '-' : ''}${minutes > 0 ? minutes + 'm ' : ''}${seconds}s`;
    };


    const countdownBubbleClassNames = (task) => {
        if (!task?.mustHeartBeatBefore || !task?.lastHeartBeatAt) {
            return '';
        }
        return isWorkerLateClassNames(task) + ' transition-all duration-500 ease-in-out border';
    };

    return (
        <main className="flex-grow p-8 flex">
            <div className="w-1/5 pr-4 border-r border-gray-300">
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Filter Tasks</h2>
                    <label className="block mb-4">
                        <span className="text-gray-700">Filter:</span>
                        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="block w-full mt-1 p-2 border border-gray-300 rounded">
                            <option value="all">All</option>
                            <option value="started">Started</option>
                            <option value="processed">Processed</option>
                        </select>
                    </label>
                    <button onClick={handleFilterApply} className="bg-blue-600 text-white rounded-full px-4 py-2 hover:bg-blue-700 transition">
                        Apply Filter
                    </button>
                </div>
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Lookup Task by ID</h2>
                    <label className="block mb-4">
                        <span className="text-gray-700">Task ID:</span>
                        <input
                            type="text"
                            value={taskId}
                            onChange={handleTaskIdChange}
                            placeholder="Enter task ID"
                            className="block w-full mt-1 p-2 border border-gray-300 rounded"
                        />
                    </label>
                    <button onClick={handleLookup} className="bg-blue-600 text-white rounded-full px-4 py-2 hover:bg-blue-700 transition">
                        Lookup
                    </button>
                    {lookupError && <p className="text-red-600 mt-4">{lookupError}</p>}
                    {taskError && <p className="text-red-600 mt-4">Error fetching task: {taskError.message}</p>}
                </div>
            </div>
            <div className="w-4/5 pl-4">
                {view === 'list' ? (
                    <div className="mt-4 p-4 border border-gray-300 rounded">
                        <h2 className="text-xl font-semibold mb-4">Tasks</h2>
                        {!tasks && (<p className="text-sm font-bold text-gray-500">{new Date(now).toLocaleString()}</p>)}
                        {isLoadingTasks ? (
                            <div className="spinner">Loading...</div>
                        ) : tasksError ? (
                            <p className="text-red-600 mt-4">Error fetching tasks: {tasksError.message}</p>
                        ) : (
                            tasks?.length === 0 ? (<p>No tasks found. Try <span className="cursor-pointer text-blue-600 underline" onClick={() => { setFilter('all'); }}>clearing the filter</span>.</p>) :
                                (<table className="min-w-full bg-white">
                                    <thead>
                                        <tr>
                                            <th className="py-2">ID</th>
                                            <th className="py-2">Scheduled At</th>
                                            <th className="py-2">Started At</th>
                                            <th className="py-2">Last Heartbeat At</th>
                                            <th className="py-2">Must HeartBeat Before</th>
                                            <th className="py-2">Processed At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tasks.map(task => (
                                            <tr key={task.id} className="cursor-pointer hover:bg-gray-200 hover:font-medium" onClick={() => { setTaskId(task.id); setView('task'); }}>
                                                <td className="border text-center px-4 py-2">{task.processedAt ? '🏁' : ''}{task.id}</td>
                                                <td className="border text-center px-4 py-2">{new Date(task.scheduledAt).toLocaleString()}</td>
                                                <td className="border text-center px-4 py-2">{task.startedAt && new Date(task.startedAt).toLocaleString()}</td>
                                                <td className="border text-center px-4 py-2">{task.lastHeartBeatAt && new Date(task.lastHeartBeatAt).toLocaleString()}</td>
                                                <td className={`border text-center px-4 py-2 ${isWorkerLateClassNames(task)}`}>
                                                    <div className="text-lg font-bold">{task.mustHeartBeatBefore && new Date(task.mustHeartBeatBefore).toLocaleString()}
                                                        {!task.processedAt && (
                                                            <div className={`text-sm font-semibold rounded-full inline-block align-middle px-3 py-1 ml-2 mt-2 ${countdownBubbleClassNames(task)}`}>
                                                                {task.mustHeartBeatBefore && formatCountdown(task.mustHeartBeatBefore)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={`border text-center px-4 py-2 ${task.processedAt && isWorkerLateClassNames(task)}`}>
                                                    <span className="text-lg font-bold">{task.processedAt && new Date(task.processedAt).toLocaleString()}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>)
                        )}
                    </div>
                ) : (
                    <div>
                        {isLoadingTask ? (
                            <div className="spinner">Loading...</div>
                        ) : (
                            <div>
                                <Task task={task} />
                                <button onClick={() => { setView('list'); }} className="mt-4 bg-blue-600 text-white rounded-full px-4 py-2 hover:bg-blue-700 transition">
                                    Back
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
};

