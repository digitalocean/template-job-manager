export const heartBeat = async (task) => {
    const taskServiceUrl = process.env.TASK_SERVICE_URL || '';

    const response = await fetch(`${taskServiceUrl}/api/tasks/${task.id}/heartbeat`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            processor: 'test-worker',
        }),
    });

    if (!response.ok && response.status !== 409) {
        throw new Error(`Failed to heartbeat: ${response.statusText}`);
    } else if (response.status === 409) {
        return { lease_expired: true, message: response.statusText };
    }
    return await response.json();
};

export const complete = async (task, taskOutput) => {
    const taskServiceUrl = process.env.TASK_SERVICE_URL || '';

    const response = await fetch(`${taskServiceUrl}/api/tasks/${task.id}/complete`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            processor: 'test-worker',
            task_output: taskOutput,
        }),
    });

    if (!response.ok && response.status !== 409) {
        throw new Error(`Failed to complete task: ${response.statusText}`);
    } else if (response.status === 409) {
        return { lease_expired: true, message: response.statusText };
    }
    return await response.json();
};

export const getNextTask = async () => {
    const taskServiceUrl = process.env.TASK_SERVICE_URL || '';

    const response = await fetch(`${taskServiceUrl}/api/tasks/next`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            processor: 'test-worker',
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to get next task: ${response.statusText}`);
    }
    return await response.json();
};
