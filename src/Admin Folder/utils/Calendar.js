import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timelinePlugin from "@fullcalendar/timeline";
import interactionPlugin from "@fullcalendar/interaction";
import { formatProgramDates } from "./formatDates.js";

const Calendar = ({ programs }) => {
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
    <div className="p-6 max-w-7xl mx-auto relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Training Calendar</h2>
        <button
          onClick={() => setFiltersVisible(!filtersVisible)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {filtersVisible ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {filtersVisible && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
              className="bg-red-100 text-sm text-red-600 underline mt-2"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <FullCalendar
        plugins={[timelinePlugin, interactionPlugin]}
        initialView="timelineMonth"
        events={events}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timelineMonth,timelineWeek,timelineDay",
        }}
        slotMinWidth={120}
        height="auto"
      />

      {selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
            <button
              className="bg-transparent absolute top-2 right-2 text-gray-600 hover:text-red-500"
              onClick={() => setSelectedProgram(null)}
            >
              ✖
            </button>
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold">
                {selectedProgram.program_title}
              </h3>
            </div>
            <img
              src={selectedProgram.thumbnail || "/default-thumbnail.jpg"}
              alt="Program"
              className="w-full h-40 object-cover rounded-lg mb-4"
            />
            <p>
              <strong>Trainer:</strong> {selectedProgram.trainer}
            </p>
            <p>
              <strong>Type:</strong> {selectedProgram.type}
            </p>
            <p>
              <strong>Venue:</strong> {selectedProgram.program_venue}
            </p>
            <div className="mt-4 text-right">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                onClick={() => handleViewClick(selectedProgram)}
              >
                View Program
              </button>
            </div>
          </div>
        </div>
      )}
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

  return (
    <div
      style={{
        backgroundColor,
        padding: "8px",
        borderRadius: "8px",
        color: "white",
        fontSize: "0.8rem",
        margin: "2px 0",
      }}
    >
      <h4 style={{ fontWeight: "600" }}>{title}</h4>
      <p style={{ fontSize: "0.7rem" }}>Trainer: {trainer}</p>
      <p style={{ fontSize: "0.7rem" }}>Type: {type}</p>
      <p style={{ fontSize: "0.7rem" }}>Venue: {program_venue}</p>
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
