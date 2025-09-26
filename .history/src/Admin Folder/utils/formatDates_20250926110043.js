export const formatProgramDates = (program) => {
  const { start_date, end_date, selected_dates } = program;
  let programDates = [];
  let isSelectedDates = false;

  // Case 1: Programs with start_date and end_date
  if (start_date && end_date) {
    const startDate = new Date(start_date * 1000);
    let endDateObj = new Date(end_date * 1000);

    // Case 2: If the start and end date are the same day, treat it as a single-day event
    if (startDate.toDateString() === endDateObj.toDateString()) {
      programDates = [startDate]; // Single day event
    } else {
      programDates = getDatesInRange(startDate, endDateObj); // Multiple day event
    }
  } 

  // Case 3: Programs using selected_dates (single or multiple specific dates)
  else if (selected_dates && selected_dates.length > 0) {
    programDates = selected_dates.map((date) => {
      // Firestore Timestamp
      if (date && typeof date.toDate === 'function') {
        return date.toDate();
      }
      // Unix timestamp (seconds)
      if (typeof date === 'number' && date < 1e12) {
        return new Date(date * 1000);
      }
      // JS timestamp (ms) or ISO string
      return new Date(date);
    });
    isSelectedDates = true;
  }

  return { programDates, isSelectedDates };
};

const getDatesInRange = (start, end) => {
  let dates = [];
  let currentDate = new Date(start);
  while (currentDate < end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};
