import React from 'react';
import EventOverview from './Admin Folder/components/EventOverview';

const Schedule = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
          Training Programs Schedule
        </h1>
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <EventOverview />
        </div>
      </div>
    </div>
  );
};

export default Schedule;