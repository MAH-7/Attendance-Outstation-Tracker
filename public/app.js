document.addEventListener('DOMContentLoaded', function () {
    fetch('/present')
        .then(response => response.json())
        .then(data => {
            const presentTable = document.getElementById('present-employees');
            data.forEach(employee => {
                const row = document.createElement('tr');
                const nameCell = document.createElement('td');
                nameCell.textContent = employee.employee;
                row.appendChild(nameCell);
                presentTable.appendChild(row);
            });
        });

    fetch('/outstation')
        .then(response => response.json())
        .then(data => {
            const outstationTable = document.getElementById('outstation-employees');
            data.forEach(outstation => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${outstation.employee}</td>
                    <td>${outstation.destination}</td>
                    <td>${outstation.start_date}</td>
                    <td>${outstation.end_date}</td>
                    <td>${calculateDays(outstation.start_date, outstation.end_date)}</td>
                    <td><button class="delete-btn" data-id="${outstation.id}">Delete</button></td>
                `;
                outstationTable.appendChild(row);
            });

            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const id = this.getAttribute('data-id');
                    deleteOutstation(id);
                });
            });
        });

    function calculateDays(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const timeDiff = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return diffDays;
    }

    function deleteOutstation(id) {
        fetch(`/outstation/${id}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (response.ok) {
                location.reload(); // Reload the page to get updated data
            } else {
                console.error('Failed to delete outstation');
            }
        })
        .catch(error => console.error('Error deleting outstation:', error));
    }
});
