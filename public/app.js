document.addEventListener("DOMContentLoaded", function () {
  const socket = io(); // Connect to the Socket.IO server

  // Initial data fetch
  fetchData();
  
  // Fetch additional dashboard data (only on dashboard page)
  if (document.getElementById('prayer-times-container')) {
    fetchPrayerTimes();
  }
  if (document.getElementById('public-holidays-container')) {
    fetchPublicHolidays();
  }

  // Listen for new attendance data
  socket.on("newAttendance", () => {
    fetchData(); // Fetch all data when a new attendance entry is submitted
  });

  // Listen for new outstation data
  socket.on("newOutstation", () => {
    fetchData(); // Fetch all data when a new outstation entry is submitted
  });

  // listen for new notice data
  socket.on("newNotice", () => {
    fetchData(); // Fetch all data when a new notice is submitted
  });

  // Listen for deletion of outstation records
  socket.on("deleteOutstation", (data) => {
    // Re-fetch data after deletion
    fetchData();
  });

  // Listen for deletion of notice records
  socket.on("deleteNotice", (data) => {
    // Re-fetch data after deletion
    fetchData();
  });

  function fetchData() {
    fetch("/present")
      .then((response) => response.json())
      .then((data) => {
        updatePresentTable(data);
      });

    fetch("/outstation")
      .then((response) => response.json())
      .then((data) => {
        updateOutstationTable(data);
      });

    fetch("/notice")
      .then((response) => response.json())
      .then((data) => {
        updateNoticeTable(data);
      });
  }

  function updatePresentTable(data) {
    const presentTableBody = document.getElementById("present-employees");
    presentTableBody.innerHTML = ""; // Clear previous entries
    data.forEach((employee) => {
      const row = document.createElement("tr");
      row.innerHTML = `
              <td>${employee.employee}</td>
              <td>${employee.check_in_time}</td>
              <td>${employee.back_time}</td>
          `;
      presentTableBody.appendChild(row);
    });
  }

  // Format date function for better display

  function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // bulan start dari 0
    const year = date.getFullYear(); // tahun penuh
    return `${day}-${month}-${year}`;
  }

  function updateOutstationTable(data) {
    const outstationTable = document.getElementById("outstation-employees");
    outstationTable.innerHTML = ""; // Clear previous entries
    data.forEach((outstation) => {
      const row = document.createElement("tr");
      row.innerHTML = `
              <td>${outstation.employee}</td>
              <td>${outstation.destination}</td>
              <td>${formatDate(outstation.start_date)}</td>
              <td>${formatDate(outstation.end_date)}</td>
              <td>${calculateDays(
                outstation.start_date,
                outstation.end_date
              )}</td>
              <td><button class="delete-btn" data-id="${
                outstation.id
              }">X</button></td>
          `;
      outstationTable.appendChild(row);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        deleteOutstation(id);
      });
    });
  }

  function updateNoticeTable(data) {
    const noticeTableContainer = document.getElementById(
      "notice-board-container"
    );
    if (!noticeTableContainer) return; // Exit if element doesn't exist
    noticeTableContainer.innerHTML = ""; // Clear previous entries

    data.forEach((notice) => {
      const noticeCard = document.createElement("div");
      noticeCard.classList.add("notice-board");
      noticeCard.innerHTML = `
      <h3 class="notice-date">${notice.notice_date}</h3>
      <div class="notice-content">
      <button class="delete-btn-notice" data-id="${notice.id}">&times;</button>
          <h3>${notice.title}</h3>
          <p>${notice.content}</p>
        </div>
      `;

      noticeTableContainer.appendChild(noticeCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn-notice").forEach((button) => {
      button.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        deleteNotice(id);
      });
    });
  }

  function calculateDays(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = Math.abs(endDate - startDate);
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1 + " days";
  }

  function deleteOutstation(id) {
    const pin = prompt("Enter your 4-digit PIN to confirm deletion:"); // Prompt for PIN

    if (pin && /^\d{4}$/.test(pin)) {
      // Validate PIN format (4 digits)
      fetch(`/outstation/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }), // Send the PIN in the request body
      }).then((response) => {
        if (response.ok) {
          // No need to call fetchData here since the socket will handle it
        } else {
          alert("Failed to delete outstation record: " + response.statusText);
        }
      });
    } else {
      alert("Please enter a valid 4-digit PIN.");
    }
  }

  function deleteNotice(id) {
    fetch(`/notice/${id}`, {
      method: "DELETE",
    }).then((response) => {
      if (response.ok) {
        // No need to call fetchData here since the socket will handle it
      } else {
        alert("Failed to delete notice: " + response.statusText);
      }
    });
  }

  // Fetch Prayer Times for Kuala Terengganu (TRG01)
  async function fetchPrayerTimes() {
    try {
      // Try working API with proper CORS handling
      const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Kuala%20Terengganu&country=Malaysia&method=3');
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.data && data.data.timings) {
          updatePrayerTimesAladhan(data.data);
          return;
        }
      }
      
      // Fallback to static times if API fails
      displayStaticPrayerTimes();
      
    } catch (error) {
      console.warn('Prayer API unavailable, showing static times');
      displayStaticPrayerTimes();
    }
  }

  function displayStaticPrayerTimes() {
    // Check if we're on the dashboard page
    if (!document.getElementById('prayer-times-container')) {
      return; // Exit if not on dashboard page
    }
    
    const hijriElement = document.getElementById('hijri-date');
    const hijriMobileElement = document.getElementById('hijri-date-mobile');
    const errorText = 'Prayer times service temporarily unavailable';
    
    if (hijriElement) {
      hijriElement.textContent = errorText;
    }
    if (hijriMobileElement) {
      hijriMobileElement.textContent = errorText;
    }
    
    // Show approximate times for Kuala Terengganu in 12-hour format
    const staticTimes = {
      'imsak-time': '5:40 AM',
      'fajr-time': '5:50 AM',
      'sunrise-time': '7:00 AM',
      'dhuhr-time': '1:10 PM',
      'asr-time': '4:20 PM',
      'maghrib-time': '7:15 PM',
      'isha-time': '8:25 PM'
    };
    
    // Update both desktop and mobile elements
    Object.keys(staticTimes).forEach(id => {
      const element = document.getElementById(id);
      const mobileElement = document.getElementById(id + '-mobile');
      if (element) {
        element.textContent = staticTimes[id];
      }
      if (mobileElement) {
        mobileElement.textContent = staticTimes[id];
      }
    });
  }

  function convertTo12Hour(time24) {
    if (!time24 || time24 === '--:--') return '--:--';
    const [hours, minutes] = time24.split(':');
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }

  function updatePrayerTimes(data) {
    const times = data.times;
    const elements = {
      'imsak-time': convertTo12Hour(times.imsak) || '--:--',
      'fajr-time': convertTo12Hour(times.fajr) || '--:--',
      'sunrise-time': convertTo12Hour(times.sunrise) || '--:--',
      'dhuhr-time': convertTo12Hour(times.dhuhr) || '--:--',
      'asr-time': convertTo12Hour(times.asr) || '--:--',
      'maghrib-time': convertTo12Hour(times.maghrib) || '--:--',
      'isha-time': convertTo12Hour(times.isha) || '--:--'
    };
    
    Object.keys(elements).forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = elements[id];
      }
    });
    
    // Update date
    const hijriElement = document.getElementById('hijri-date');
    if (hijriElement) {
      const today = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      hijriElement.textContent = 
        `${today.toLocaleDateString('en-MY', options)} | ${data.location || 'Kuala Terengganu'}`;
    }
  }

  function updatePrayerTimesAzanPro(data) {
    if (data && data.times) {
      const times = data.times;
      const elements = {
        'imsak-time': convertTo12Hour(times.imsak) || '--:--',
        'fajr-time': convertTo12Hour(times.fajr) || '--:--',
        'sunrise-time': convertTo12Hour(times.sunrise) || '--:--',
        'dhuhr-time': convertTo12Hour(times.dhuhr) || '--:--',
        'asr-time': convertTo12Hour(times.asr) || '--:--',
        'maghrib-time': convertTo12Hour(times.maghrib) || '--:--',
        'isha-time': convertTo12Hour(times.isha) || '--:--'
      };
      
      Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = elements[id];
        }
      });
      
      const hijriElement = document.getElementById('hijri-date');
      if (hijriElement) {
        const today = new Date();
        hijriElement.textContent = 
          `${today.toLocaleDateString('en-MY')} | Kuala Terengganu`;
      }
    }
  }

  function updatePrayerTimesAladhan(data) {
    if (data && data.timings) {
      const timings = data.timings;
      const elements = {
        'imsak-time': convertTo12Hour(timings.Imsak) || '--:--',
        'fajr-time': convertTo12Hour(timings.Fajr) || '--:--',
        'sunrise-time': convertTo12Hour(timings.Sunrise) || '--:--',
        'dhuhr-time': convertTo12Hour(timings.Dhuhr) || '--:--',
        'asr-time': convertTo12Hour(timings.Asr) || '--:--',
        'maghrib-time': convertTo12Hour(timings.Maghrib) || '--:--',
        'isha-time': convertTo12Hour(timings.Isha) || '--:--'
      };
      
      // Update both desktop and mobile elements
      Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        const mobileElement = document.getElementById(id + '-mobile');
        if (element) {
          element.textContent = elements[id];
        }
        if (mobileElement) {
          mobileElement.textContent = elements[id];
        }
      });
      
      // Update Hijri date for both desktop and mobile
      const hijriElement = document.getElementById('hijri-date');
      const hijriMobileElement = document.getElementById('hijri-date-mobile');
      const today = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const hijriDate = data.date?.hijri ? `${data.date.hijri.day} ${data.date.hijri.month.en} ${data.date.hijri.year}` : '';
      const dateText = `${today.toLocaleDateString('en-MY', options)} | ${hijriDate} | Kuala Terengganu`;
      
      if (hijriElement) {
        hijriElement.textContent = dateText;
      }
      if (hijriMobileElement) {
        hijriMobileElement.textContent = dateText;
      }
    }
  }

  function updatePrayerTimesGovMY(prayerData) {
    if (prayerData) {
      const elements = {
        'imsak-time': convertTo12Hour(prayerData.imsak) || '--:--',
        'fajr-time': convertTo12Hour(prayerData.fajr) || '--:--',
        'sunrise-time': convertTo12Hour(prayerData.syuruk) || '--:--',
        'dhuhr-time': convertTo12Hour(prayerData.dhuhr) || '--:--',
        'asr-time': convertTo12Hour(prayerData.asr) || '--:--',
        'maghrib-time': convertTo12Hour(prayerData.maghrib) || '--:--',
        'isha-time': convertTo12Hour(prayerData.isha) || '--:--'
      };
      
      Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = elements[id];
        }
      });
      
      const hijriElement = document.getElementById('hijri-date');
      if (hijriElement) {
        hijriElement.textContent = 
          `${prayerData.date} | ${prayerData.hijri || ''} | Kuala Terengganu`;
      }
    }
  }

  // Fetch Malaysia Public Holidays
  async function fetchPublicHolidays() {
    try {
      // Using free Nager.Date API (no API key required)
      const currentYear = new Date().getFullYear();
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/MY`);
      
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const holidays = await response.json();
        updatePublicHolidays(holidays);
        return;
      }
      
      // Fallback to static holidays
      displayFallbackHolidays();
      
    } catch (error) {
      console.error('Error fetching public holidays:', error);
      displayFallbackHolidays();
    }
  }

  function updatePublicHolidays(holidays) {
    const holidaysList = document.getElementById('holidays-list');
    const holidaysListMobile = document.getElementById('holidays-list-mobile');
    if (!holidaysList && !holidaysListMobile) return;
    
    // Clear both desktop and mobile containers
    if (holidaysList) holidaysList.innerHTML = '';
    if (holidaysListMobile) holidaysListMobile.innerHTML = '';
    
    // Get today's date for comparison
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Sort holidays by date
    holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Show only upcoming holidays (next 8 for better display)
    const upcomingHolidays = holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      // Include today's date if it's a holiday
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return holidayDate >= todayStart;
    }).slice(0, 8);
    
    if (upcomingHolidays.length === 0) {
      const noHolidaysHTML = `<div style="text-align: center; color: #7f8c8d; padding: 20px;">All ${currentYear} holidays have passed.<br>Will show ${currentYear + 1} holidays when available.</div>`;
      if (holidaysList) holidaysList.innerHTML = noHolidaysHTML;
      if (holidaysListMobile) holidaysListMobile.innerHTML = noHolidaysHTML;
      return;
    }
    
    upcomingHolidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      const isToday = holidayDate.toDateString() === today.toDateString();
      
      const holidayItem = document.createElement('div');
      holidayItem.className = `holiday-item ${isToday ? 'today' : ''}`;
      
      // Calculate days until holiday
      const timeDiff = holidayDate - today;
      const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      let dateDisplay = holidayDate.toLocaleDateString('en-MY', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (isToday) {
        dateDisplay += ' (Today!)';
      } else if (daysUntil === 1) {
        dateDisplay += ' (Tomorrow)';
      } else if (daysUntil <= 7) {
        dateDisplay += ` (${daysUntil} days)`;
      }
      
      holidayItem.innerHTML = `
        <span class="holiday-name">${holiday.name}</span>
        <span class="holiday-date">${dateDisplay}</span>
      `;
      
      // Append to both desktop and mobile containers
      if (holidaysList) {
        holidaysList.appendChild(holidayItem.cloneNode(true));
      }
      if (holidaysListMobile) {
        holidaysListMobile.appendChild(holidayItem);
      }
    });
  }

  function displayFallbackHolidays() {
    // Check if we're on the dashboard page
    if (!document.getElementById('public-holidays-container') && !document.getElementById('public-holidays-container-mobile')) {
      return; // Exit if not on dashboard page
    }
    
    const holidaysList = document.getElementById('holidays-list');
    const holidaysListMobile = document.getElementById('holidays-list-mobile');
    if (!holidaysList && !holidaysListMobile) return;
    const currentYear = new Date().getFullYear();
    
    // Basic list of major Malaysian holidays
    const majorHolidays = [
      { name: 'New Year\'s Day', date: `${currentYear}-01-01` },
      { name: 'Chinese New Year', date: `${currentYear}-01-29` },
      { name: 'Labour Day', date: `${currentYear}-05-01` },
      { name: 'Wesak Day', date: `${currentYear}-05-12` },
      { name: 'Hari Raya Aidilfitri', date: `${currentYear}-06-25` },
      { name: 'Malaysia Day', date: `${currentYear}-09-16` },
      { name: 'Deepavali', date: `${currentYear}-10-21` },
      { name: 'Christmas Day', date: `${currentYear}-12-25` }
    ];
    
    // Clear both containers
    if (holidaysList) holidaysList.innerHTML = '';
    if (holidaysListMobile) holidaysListMobile.innerHTML = '';
    
    const today = new Date();
    const upcomingHolidays = majorHolidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= today;
    });
    
    if (upcomingHolidays.length === 0) {
      const fallbackHTML = '<div style="text-align: center; color: #7f8c8d;">Major holidays for this year</div>';
      if (holidaysList) holidaysList.innerHTML = fallbackHTML;
      if (holidaysListMobile) holidaysListMobile.innerHTML = fallbackHTML;
      upcomingHolidays.push(...majorHolidays.slice(0, 5));
    }
    
    upcomingHolidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      const isToday = holidayDate.toDateString() === today.toDateString();
      
      const holidayItem = document.createElement('div');
      holidayItem.className = `holiday-item ${isToday ? 'today' : ''}`;
      
      holidayItem.innerHTML = `
        <span class="holiday-name">${holiday.name}</span>
        <span class="holiday-date">${holidayDate.toLocaleDateString('en-MY', { 
          month: 'short', 
          day: 'numeric' 
        })}</span>
      `;
      
      // Append to both desktop and mobile containers
      if (holidaysList) {
        holidaysList.appendChild(holidayItem.cloneNode(true));
      }
      if (holidaysListMobile) {
        holidaysListMobile.appendChild(holidayItem);
      }
    });
  }
});
