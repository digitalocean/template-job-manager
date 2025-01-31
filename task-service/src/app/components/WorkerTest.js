'use client'
import { useState } from 'react';
import { Mutex } from 'async-mutex';
import { heartBeat, complete, getNextTask } from '../lib/tasks-client';

const loggs = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export default function WorkerTest() {
    const mutex = new Mutex();

    const [log, setLog] = useState(loggs);
    const logger = (taskId, message) => {
        const m = `[ ${new Date().toLocaleString()}${taskId ? ` ID: ${taskId}` : ``} ] ${message}`;
        console.log(m);
        let output = [];
        mutex.acquire();
        loggs.push(m);
        output = Array.from(loggs);
        mutex.release();
        setLog(output.reverse().join('\n'));
    };

    const doWork = async () => {
        let task = null;
        try {
            task = await getNextTask();

            if (!task.taskData && task.message) {
                logger(null, `📨 ${task.message}`)
                return;
            }
        }
        catch (error) {
            logger(null, `🌋 Error: ${error.message}`);
        }

        let ticks = 0;

        try {
            logger(task.id, `🏢 Processing task ${task.id} for ${task.taskData.sleep_duration_seconds} seconds.`);
            // Loop to perform the task and manage heartbeats
            do {
                // Calculate the timeout and the next heartbeat interval
                let taskTimeout = (new Date(task.mustHeartBeatBefore) - new Date(task.lastHeartBeatAt));
                let heartbeatInterval = (taskTimeout * 0.5); // Heartbeat at 50% of the timeout period

                // Renew the lease if the timeout period has passed
                let now = new Date();
                if (now - new Date(task.lastHeartBeatAt) >= heartbeatInterval) {
                    const r = await heartBeat(task); // Perform the heartbeat action
                    if (r.lease_expired) {
                        logger(task.id, `🗑️ Task Lease Expired: ${r.message}; abandoning work`);
                        return;
                    }
                    task = r;

                    logger(task.id, `💓 renewed for ${(new Date(task.mustHeartBeatBefore) - new Date(task.lastHeartBeatAt)) / 1000} seconds.`);

                    logger(task.id, `⌛ Next heartbeat in ${heartbeatInterval / 1000} seconds...`);
                } else {
                    // Log a status update every 10 ticks
                    if (ticks % 10 === 0) {
                        // Log the sleep duration for debugging purposes
                        logger(task.id, `💤 Working for another ${task.taskData.sleep_duration_seconds - ticks} seconds...`);
                    }
                    if (ticks === 0) {
                        logger(task.id, `⌛ Next heartbeat in ${heartbeatInterval / 1000} seconds...`);
                    }
                }

                // Simulate chaos monkey behavior for testing robustness
                if (ticks % 15 == 0) {
                    const chaos = Math.random();
                    if (chaos < 0.05 && ticks % 5 == 0) {
                        // Simulate a failure in 3% of cases
                        throw new Error(`🙊 Simulated worker failure`);
                    } else if (chaos < 0.1 && ticks % 2 == 0) {
                        // Simulate high latency between 4 and 15 seconds
                        logger(task.id, `🙊 Simulated high latency for worker.`);
                        const latency = Math.floor(Math.random() * (15000 - 4000 + 1)) + 4000;
                        await sleep(latency); // Wait for the simulated latency period
                        logger(task.id, `🔔 Resuming from latency, now working for another ${task.taskData.sleep_duration_seconds - ticks} seconds...`);
                    }
                }

                // Sleep for 1 second to simulate work
                await sleep(1000);

                // Increment the tick counter
                ticks++;
            } while (ticks < task.taskData.sleep_duration_seconds);

            await complete(task, { message: "done!!" })

            logger(task.id, `🏁 Finished processing task ${task.id}`);
        } catch (error) {
            logger(null, `Error: ${error.message}`);
        }
    };

    return (
        <div className="mt-4 p-4">
            <h3 className="text-lg font-semibold mb-2">Worker Testing</h3>

            <div className="flex gap-4 mt-4 px-4 py-4 border border-gray-300">
                This component simulates a worker that processes tasks, inside your browser. The worker will fetch a single task from the server, process it, and then complete the task. The worker will also perform heartbeats to renew the lease on the task. The worker will simulate various failure scenarios, such as high latency and worker failures, to test the robustness of the system.
            </div>

            <button onClick={async () => { doWork() }} className="mt-4 bg-green-600 text-white rounded-full px-4 py-2 hover:bg-green-700 transition">
                Run a Single Job
            </button>
            {log?.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-md font-semibold">Log</h4>
                    <pre className="bg-gray-100 p-2 rounded scrollbar-thin scrollbar-thumb-gray-900 scrollbar-track-gray-100 overflow-y-auto">{log}</pre>
                </div>
            )}
        </div>
    );
}
