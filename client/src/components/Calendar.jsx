import { useState } from "react";
import "./Calendar.css";

function Calendar() {
  const today = new Date();

  const [currentDate, setCurrentDate] = useState(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  // First day of current month
  const firstDay = new Date(
    year,
    month,
    1
  ).getDay();

  // Number of days in current month
  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  // Go to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(year, month - 1, 1)
    );
  };

  // Go to next month
  const goToNextMonth = () => {
    setCurrentDate(
      new Date(year, month + 1, 1)
    );
  };

  // Check if date is today
  const isToday = (day) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  return (
    <div className="calendar-page">

      {/* Calendar Header */}

      <div className="calendar-header">
        <div>
          <h1>Calendar</h1>

          <p>
            View your schedule and dates
          </p>
        </div>
      </div>


      {/* Calendar Card */}

      <div className="calendar-card">

        {/* Month Navigation */}

        <div className="calendar-navigation">

          <button
            type="button"
            className="calendar-nav-btn"
            onClick={goToPreviousMonth}
          >
            ←
          </button>

          <h2>
            {monthNames[month]} {year}
          </h2>

          <button
            type="button"
            className="calendar-nav-btn"
            onClick={goToNextMonth}
          >
            →
          </button>

        </div>


        {/* Weekday Names */}

        <div className="calendar-weekdays">

          {dayNames.map((day) => (
            <div
              className="calendar-weekday"
              key={day}
            >
              {day}
            </div>
          ))}

        </div>


        {/* Calendar Days */}

        <div className="calendar-grid">

          {/* Empty spaces before first day */}

          {Array.from({
            length: firstDay,
          }).map((_, index) => (
            <div
              className="calendar-day empty"
              key={`empty-${index}`}
            />
          ))}


          {/* Actual days */}

          {Array.from({
            length: daysInMonth,
          }).map((_, index) => {

            const day = index + 1;

            return (
              <div
                key={day}
                className={`calendar-day ${
                  isToday(day)
                    ? "today"
                    : ""
                }`}
              >
                {day}
              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
}

export default Calendar;