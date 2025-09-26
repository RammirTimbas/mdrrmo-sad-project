import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timelinePlugin from "@fullcalendar/timeline";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { formatProgramDates } from "./formatDates.js";
import { MdFilterAlt, MdFilterAltOff } from "react-icons/md";

const Calendar = ({ programs, mobile = false, disableEventClick = false }) => {
  const [events, setEvents] = useState([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);

  const navigate = useNavigate();

  const trainerOptions = useMemo(() => {
    const all = programs.flatMap((p) =>
      Array.isArray(p.trainer_assigned)
        ? p.trainer_assigned
        : [p.trainer_assigned]
    );
    return [...new Set(all)];
  }, [programs]);

  const typeOptions = useMemo(() => {
    return [...new Set(programs.map((p) => p.type))];
  }, [programs]);

  const venueOptions = useMemo(() => {
    return [...new Set(programs.map((p) => p.program_venue))];
  }, [programs]);

  useEffect(() => {
    const calendarEvents = [];
    const programColorMap = {};

    programs.forEach((program) => {
      const trainerList = Array.isArray(program.trainer_assigned)
        ? program.trainer_assigned
        : [program.trainer_assigned];

      const trainerMatch =
        !selectedTrainer || trainerList.includes(selectedTrainer);
      const typeMatch = !selectedType || program.type === selectedType;
      const venueMatch =
        !selectedVenue || program.program_venue === selectedVenue;

      if (!(trainerMatch && typeMatch && venueMatch)) return;

      const { programDates, isSelectedDates } = formatProgramDates(program);
      if (!programColorMap[program.id]) {
        programColorMap[program.id] = getRandomColor();
      }

      const commonProps = {
        title: program.program_title,
        backgroundColor: programColorMap[program.id],
        extendedProps: {
          ...program,
          trainer: trainerList.join(", "),
        },
      };

      if (isSelectedDates) {
        programDates.forEach((date) => {
          calendarEvents.push({
            ...commonProps,
            start: new Date(date),
            end: new Date(date),
          });
        });
      } else {
        calendarEvents.push({
          ...commonProps,
          start: new Date(program.start_date * 1000),
          end: new Date(program.end_date * 1000),
        });
      }
    });

    setEvents(calendarEvents);
  }, [programs, selectedTrainer, selectedType, selectedVenue]);

  const clearFilters = () => {
    setSelectedTrainer("");
    setSelectedType("");
    setSelectedVenue("");
  };

  const handleEventClick = (info) => {
    setSelectedProgram(info.event.extendedProps);
  };

  const handleViewClick = (program) => {
    navigate(`/admin/training-programs/${program.id}`, { state: { program } });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%)' }}>
      <div className="w-full flex justify-between items-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-800 tracking-tight drop-shadow-lg">Training Calendar</h2>
        <button
          onClick={() => setFiltersVisible(!filtersVisible)}
          className={`transition-all duration-300 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white px-5 py-2 rounded-full shadow-lg flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-300 ${filtersVisible ? 'scale-105' : ''}`}
        >
          {filtersVisible ? <MdFilterAltOff size={24} /> : <MdFilterAlt size={24} />}
          {filtersVisible ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {filtersVisible && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 px-4 sm:px-0 animate-fade-in">
          <FilterDropdown
            label="Trainer"
            options={trainerOptions}
            value={selectedTrainer}
            onChange={setSelectedTrainer}
          />
          <FilterDropdown
            label="Type"
            options={typeOptions}
            value={selectedType}
            onChange={setSelectedType}
          />
          <FilterDropdown
            label="Venue"
            options={venueOptions}
            value={selectedVenue}
            onChange={setSelectedVenue}
          />
          <div className="col-span-1 sm:col-span-3 text-right">
            <button
              onClick={clearFilters}
              className="bg-red-100 text-sm text-red-600 underline mt-2 hover:bg-red-200 rounded px-3 py-1 transition-all"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="w-full rounded-3xl shadow-2xl bg-white/70 backdrop-blur-md p-2 sm:p-6 transition-all duration-500">
        <FullCalendar
          plugins={[timelinePlugin, dayGridPlugin, interactionPlugin]}
          events={events}
          eventContent={renderEventContent}
          eventClick={disableEventClick ? undefined : handleEventClick}
          headerToolbar={mobile ? {
            left: "prev,next",
            center: "title",
            right: "",
          } : {
            left: "prev,next today",
            center: "title",
            right: "timelineMonth,timelineWeek,timelineDay",
          }}
          initialView={mobile ? "dayGridMonth" : "timelineMonth"}
          views={{
            dayGridMonth: {
              dayMaxEvents: 3,
              moreLinkContent: (args) => `+${args.num} more`,
              eventTimeFormat: {
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }
            },
            timelineMonth: {
              slotMinWidth: 120
            }
          }}
          height={mobile ? "auto" : "80vh"}
          contentHeight="auto"
        />
      </div>

      {selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-md w-full p-8 relative border border-blue-200 animate-pop-in" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}>
            <button
              className="bg-transparent absolute top-2 right-2 text-gray-600 hover:text-red-500 text-2xl"
              onClick={() => setSelectedProgram(null)}
            >
              ✖
            </button>
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-xl font-bold text-blue-700 drop-shadow">{selectedProgram.program_title}</h3>
            </div>
            <img
              src={selectedProgram.thumbnail || "/default-thumbnail.jpg"}
              alt="Program"
              className="w-full h-44 object-cover rounded-xl mb-4 shadow-lg border border-blue-100"
              style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%)' }}
            />
            <div className="space-y-2 text-base text-gray-700">
              <p><strong>Trainer:</strong> {selectedProgram.trainer}</p>
              <p><strong>Type:</strong> {selectedProgram.type}</p>
              <p><strong>Venue:</strong> {selectedProgram.program_venue}</p>
            </div>
            <div className="mt-6 text-right">
              <button
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-6 py-2 rounded-full shadow-lg font-semibold transition-all"
                onClick={() => handleViewClick(selectedProgram)}
              >
                View Program
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Style animations and effects */}
      <style>{`
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.5s cubic-bezier(.4,0,.2,1); }
        @keyframes pop-in { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-pop-in { animation: pop-in 0.4s cubic-bezier(.4,0,.2,1); }
        @keyframes spin-slow { 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 2s linear infinite; }
      `}</style>
    </div>
  );
};

const FilterDropdown = ({ label, options, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 p-2 rounded"
    >
      <option value="">All</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

function renderEventContent(eventInfo) {
  const { title, extendedProps } = eventInfo.event;
  const { trainer, type, program_venue } = extendedProps;
  const backgroundColor = eventInfo.event.backgroundColor || "#3b82f6";
  const isMobile = window.innerWidth < 640;

  return (
    <div
      className="rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-blue-200"
      style={{
        background: `linear-gradient(135deg, ${backgroundColor} 60%, #f0fdfa 100%)`,
        padding: isMobile ? '4px 8px' : '12px',
        color: 'white',
        fontSize: isMobile ? '0.75rem' : '1rem',
        margin: '1px 0',
        minWidth: isMobile ? 'auto' : '120px',
        maxWidth: '100%',
        overflow: 'hidden',
        boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.15)'
      }}
    >
      <h4 style={{ fontWeight: 700, fontSize: isMobile ? '0.9em' : '1.1em', letterSpacing: '0.01em', textShadow: '0 1px 4px #0002' }}>{title}</h4>
      {!isMobile && (
        <>
          <p style={{ fontSize: '0.95em', opacity: 0.95 }}><span className="font-semibold">Trainer:</span> {trainer}</p>
          <p style={{ fontSize: '0.95em', opacity: 0.95 }}><span className="font-semibold">Type:</span> {type}</p>
          <p style={{ fontSize: '0.95em', opacity: 0.95 }}><span className="font-semibold">Venue:</span> {program_venue}</p>
        </>
      )}
    </div>
  );
}

function getRandomColor() {
  const colors = [
    "#60A5FA",
    "#34D399",
    "#FBBF24",
    "#F87171",
    "#A78BFA",
    "#F472B6",
    "#38BDF8",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default Calendar;
