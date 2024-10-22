document.addEventListener("DOMContentLoaded", function () {
    fetchAttendanceData();

    // Function to fetch attendance data
    async function fetchAttendanceData() {
        const response = await fetch("/attendance-data");
        const data = await response.json();

        const presentEmployeesTbody = document.getElementById("present-employees");
        const outstationEmployeesTbody = document.getElementById("outstation-employees");

        presentEmployeesTbody.innerHTML = "";
        outstationEmployeesTbody.innerHTML = "";

        data.forEach(entry => {
            if (entry.status === "Present") {
                presentEmployeesTbody.innerHTML += `
                    <tr>
                        <td>${entry.employee}</td>
                        <td>${entry.check_in_time}</td>
                        <td>${entry.back_time || "N/A"}</td>
                    </tr>
                `;
            } else if (entry.status === "Outstation") {
                const startDate = new Date(entry.start_date);
                const endDate = new Date(entry.end_date);
                const numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 0;

                outstationEmployeesTbody.innerHTML += `
                    <tr>
                        <td>${entry.employee}</td>
                        <td>${entry.destination}</td>
                        <td>${entry.start_date}</td>
                        <td>${entry.end_date}</td>
                        <td>${numberOfDays} days</td>
                        <td><button onclick="deleteEntry(${entry.id})">Delete</button></td>
                    </tr>
                `;
            }
        });
    }

    // Add delete function
    window.deleteEntry = function(id) {
        fetch(`/outstation/${id}`, {
            method: "DELETE",
        })
        .then(() => fetchAttendanceData())
        .catch(err => console.error("Error deleting outstation:", err));
    };
});
