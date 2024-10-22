document.addEventListener("DOMContentLoaded", function () {
    fetch("/present")
        .then((response) => response.json())
        .then((data) => {
            const presentTableBody = document.getElementById("present-employees");
            presentTableBody.innerHTML = ""; // Clear previous entries
            data.forEach((employee) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${employee.employee}</td>
                    <td>${employee.check_in_time}</td>
                    <td>${employee.back_time || 'N/A'}</td>
                `;
                presentTableBody.appendChild(row);
            });
        })
        .catch((err) => console.error("Error fetching present employees:", err));

    fetch("/outstation")
        .then((response) => response.json())
        .then((data) => {
            const outstationTableBody = document.getElementById("outstation-employees");
            outstationTableBody.innerHTML = ""; // Clear previous entries
            data.forEach((outstation) => {
                const row = document.createElement("tr");
                const numOfDays = calculateDays(outstation.start_date, outstation.end_date);
                row.innerHTML = `
                    <td>${outstation.employee}</td>
                    <td>${outstation.destination || 'N/A'}</td>
                    <td>${outstation.start_date || 'N/A'}</td>
                    <td>${outstation.end_date || 'N/A'}</td>
                    <td>${numOfDays} days</td>
                    <td>
                        <button class="delete-btn" data-id="${outstation.id}">Delete</button>
                    </td>
                `;
                outstationTableBody.appendChild(row);
            });

            // Attach delete event listeners to each delete button
            const deleteButtons = document.querySelectorAll(".delete-btn");
            deleteButtons.forEach((button) => {
                button.addEventListener("click", function () {
                    const id = this.getAttribute("data-id");
                    fetch(`/outstation/${id}`, {
                        method: "DELETE",
                    })
                        .then(() => {
                            console.log(`Deleted outstation record with ID: ${id}`);
                            // Refresh the outstation table
                            outstationTableBody.removeChild(row);
                        })
                        .catch((err) => console.error("Error deleting outstation record:", err));
                });
            });
        })
        .catch((err) => console.error("Error fetching outstation employees:", err));
});

// Helper function to calculate the number of days between two dates
function calculateDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = Math.abs(end - start);
    return Math.ceil(timeDiff / (1000 * 3600 * 24)); // Convert milliseconds to days
}
