document.addEventListener("DOMContentLoaded", function() {
  const socket = io(); // Connect to the Socket.IO server

  // Initial data fetch
  fetchData();

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
              <td><button class="delete-btn" data-id="${outstation.id
        }">Delete</button></td>
          `;
      outstationTable.appendChild(row);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", function() {
        const id = this.getAttribute("data-id");
        deleteOutstation(id);
      });
    });
  }

  function updateNoticeTable(data) {
    const noticeTableContainer = document.getElementById("notice-board-container");
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
      button.addEventListener("click", function() {
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
});
