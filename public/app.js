document.addEventListener("DOMContentLoaded", function () {
  const socket = io(); // Connect to the Socket.IO server

  // Initial data fetch
  fetchData();

  // Listen for new attendance data
  socket.on("newAttendance", () => {
    fetchData(); // Fetch all data when a new attendance entry is submitted
  });

  // Listen for deletion of outstation records
  socket.on("deleteOutstation", (data) => {
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

  function updateOutstationTable(data) {
    const outstationTable = document.getElementById("outstation-employees");
    outstationTable.innerHTML = ""; // Clear previous entries
    data.forEach((outstation) => {
      const row = document.createElement("tr");
      row.innerHTML = `
              <td>${outstation.employee}</td>
              <td>${outstation.destination}</td>
              <td>${outstation.start_date}</td>
              <td>${outstation.end_date}</td>
              <td>${calculateDays(
                outstation.start_date,
                outstation.end_date
              )}</td>
              <td><button class="delete-btn" data-id="${
                outstation.id
              }">Delete</button></td>
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

  function calculateDays(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = Math.abs(endDate - startDate);
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + " days";
  }

  function deleteOutstation(id) {
    fetch(`/outstation/${id}`, {
      method: "DELETE",
    }).then((response) => {
      if (response.ok) {
        // No need to call fetchData here since the socket will handle it
      } else {
        alert("Failed to delete outstation record.");
      }
    });
  }
});
