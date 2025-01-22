#!/usr/bin/env node
import { complete, getNextTask, heartBeat } from './tasks-client.js';
const heartbeatInterval = process.env.HEARTBEAT_INTERVAL || 15000; // 15 seconds

const logger = (taskId, message) => {
    console.log(`[ ${process.env.HOSTNAME} ${taskId ? ` ID: ${taskId}` : ``} ] ${message}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const doWork = async () => {
    while (true) {
        let task = null;
        try {
            logger(null, `🔍 Looking for tasks...`);
            task = await getNextTask();

            if (!task || (!task.taskData && task.message)) {
                logger(null, `📨 ${task ? task.message : 'No task'}`);
                await sleep(5000); // Wait before checking for the next task
                continue;
            }
        } catch (error) {
            logger(null, `🌋 Error: ${error.message}`);
            await sleep(5000); // Wait before retrying
            continue;
        }

        let ticks = 0;
        let heartbeatInProgress = false;
        let heartbeatTimer = setInterval(async () => {
            if (heartbeatInProgress) return;
            heartbeatInProgress = true;
            try {
                const r = await heartBeat(task);
                if (r.lease_expired) {
                    logger(task.id, `🗑️ Task Lease Expired: ${r.message}; abandoning work`);
                    clearInterval(heartbeatTimer);
                    return;
                }
                task = r;
                logger(task.id, `💓 renewed for ${(new Date(task.mustHeartBeatBefore) - new Date(task.lastHeartBeatAt)) / 1000} seconds.`);

                const chaos = Math.random();
                if (chaos < 0.1 && ticks % 2 == 0) {
                    logger(task.id, `🙊 Simulated high latency for worker.`);
                    const latency = Math.floor(Math.random() * (15000 - 4000 + 1)) + 4000;
                    await sleep(latency);
                    logger(task.id, `🔔 Resuming from latency, now working for another ${task.taskData.sleep_duration_seconds - ticks} seconds...`);
                }
            } catch (error) {
                logger(null, `Heartbeat Error: ${error.message}`);
                clearInterval(heartbeatTimer);
            } finally {
                heartbeatInProgress = false;
            }
        }, heartbeatInterval);

        try {
            logger(task.id, `🏢 Processing task ${task.id} for ${task.taskData.sleep_duration_seconds} seconds.`);
            while (ticks < task.taskData.sleep_duration_seconds) {
                if (ticks % 10 === 0) {
                    logger(task.id, `💤 Working for another ${task.taskData.sleep_duration_seconds - ticks} seconds...`);
                }

                const chaos = Math.random();
                if (chaos < 0.05 && ticks % 5 == 0) {
                    logger(task.id, `🙊 Simulated worker failure`);
                    process.exit(1);
                }

                await sleep(1000);
                ticks++;
            }

            await complete(task, { message: "done!!" });
            logger(task.id, `🏁 Finished processing task ${task.id}`);
        } catch (error) {
            logger(null, `Error: ${error.message}`);
        } finally {
            clearInterval(heartbeatTimer);
        }
    }
};

doWork();

