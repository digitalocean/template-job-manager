import React from 'react';
import TaskGenerator from '@/app/components/TaskGenerator';
import TasksView from '@/app/components/TasksView';
import WorkerTest from '@/app/components/WorkerTest';

export default function Home() {
  return (
    <main className="flex-grow p-8 flex">
      <div className="w-1/5 pr-4 border-r border-gray-300">
        <div className="mb-8 border-b border-gray-300 pb-8">
          <TaskGenerator />
        </div>

      </div>
      <div className="w-4/5 pl-4">
        <TasksView />
        <div className="mb-8 border-t border-b border-gray-300 pb-8">
          <WorkerTest />
        </div>
      </div>
    </main>
  );
};
