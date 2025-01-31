"use client";

import { stringifyError } from "next/dist/shared/lib/utils";
import React, { useState, useEffect } from "react";
import useSWR from 'swr';

// Fetcher function to get data from the API
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TaskGenerator() {
    // Use SWR to fetch the status of the worker
    const { data, error } = useSWR('/api/generator/status', fetcher, { refreshInterval: 500 });
    const [status, setStatus] = useState("Loading...");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Update the status based on the fetched data or error
    useEffect(() => {
        if (error) {
            setStatus("Error fetching status");
            setMessage("");
        } else if (data) {
            setStatus(data.status);
            setMessage(data.message);
        }
    }, [data, error]);

    // Handle the start button click
    const handleStart = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/generator/start', { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json();
                setStatus("Error starting worker");
                setMessage(errorData.message || "Server Error");
                return;
            }
            const result = await response.json();
            setStatus(result.status);
            setMessage(result.message);
        } catch (error) {
            setStatus("Error starting worker");
            setMessage(stringifyError(error) || "Server Error");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle the stop button click
    const handleStop = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/generator/stop', { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                setStatus("Error starting worker");
                setMessage(errorData.message || "Server Error");
                return;
            }
            const result = await response.json();
            setStatus(result.status);
            setMessage(result.message);
        } catch (error) {
            setStatus("Error stopping worker");
            setMessage(error.message || "");
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusClass = () => {
        switch (status) {
            case 'STARTED':
                return 'text-green-600';
            case 'RUNNING':
                return 'text-green-600';
            case 'STOPPED':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };
    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-2">Task Generator Status</h2>
            <p className={`font-bold ${getStatusClass()}`}>{status}</p>
            <p>{message}</p>
            <div className="flex gap-4 mt-4">
                <button
                    className="bg-green-600 text-white rounded-full px-4 py-2 hover:bg-green-700 transition"
                    onClick={handleStart}
                >
                    Start Generator
                </button>
                <button
                    className="bg-red-600 text-white rounded-full px-4 py-2 hover:bg-red-700 transition"
                    onClick={handleStop}
                >
                    Stop Generator
                </button>
            </div>
            <div className="flex gap-4 mt-4 px-4 py-4 border border-gray-300">
                The Task Generator produces tasks for the worker processes using a random sleep interval to simulate work.
            </div>
            <div className="flex gap-4 mt-4 px-4 py-4 border border-gray-300">Notice how the status fluctuates between running and stopped. This is because multiple instances are serving requests for the status data, however only the lease holder has the state as it is the instance generating the tasks.</div>
            <div className="flex gap-4 mt-4 px-4 py-4 border border-gray-300">Try starting the generator again; you&apos;ll see how the lease prevents other instances from performing the same work.</div>
            <div className="flex gap-4 mt-4 px-4 py-4 border border-gray-300">This also means Stopping the generator behaves the same way. To truely stop it&apos;ll you&apos;ll have to press it a few times hoping to get the lease holder instance.</div>
        </div>
    );
}