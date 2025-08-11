document.addEventListener('DOMContentLoaded', () => {
    const clientsTableBody = document.querySelector('#clients-table tbody');
    const searchInput = document.getElementById('search-input');
    const clientsTableHeadRow = document.querySelector('#clients-table thead tr');

    // Add new header for No.
    const noTh = document.createElement('th');
    noTh.textContent = 'No.';
    clientsTableHeadRow.insertBefore(noTh, clientsTableHeadRow.firstChild); // Add No. at the beginning

    // Add new header for 月次進捗詳細
    const newTh = document.createElement('th');
    newTh.textContent = '月次進捗詳細';
    clientsTableHeadRow.appendChild(newTh);

    function renderClients(filterText = '') {
        clientsTableBody.innerHTML = ''; // Clear existing rows
        const filteredClients = clients.filter(client => {
            const nameMatch = client.name.includes(filterText);
            const 담당자Match = client.担当者.includes(filterText);
            return nameMatch || 담당자Match;
        });

        filteredClients.forEach(client => {
            const row = clientsTableBody.insertRow();
            // Display No.
            row.insertCell().textContent = client.no; // Add No. cell
            // Link 事業所名 to edit.html
            row.insertCell().innerHTML = `<a href="edit.html?no=${client.no}" class="client-name-link">${client.name}</a>`;
            row.insertCell().textContent = client.fiscalMonth;
            row.insertCell().textContent = client.unattendedMonths;
            row.insertCell().textContent = client.monthlyProgress;
            row.insertCell().textContent = client.担当者;
            row.insertCell().textContent = client.accountingMethod;

            const statusCell = row.insertCell();

            // Create the custom select wrapper structure
            const customSelectWrapper = document.createElement('div');
            customSelectWrapper.classList.add('custom-select-wrapper');

            const customSelectTrigger = document.createElement('div');
            customSelectTrigger.classList.add('custom-select-trigger');
            customSelectWrapper.appendChild(customSelectTrigger);

            const customOptions = document.createElement('div');
            customOptions.classList.add('custom-options');
            customSelectWrapper.appendChild(customOptions);

            const statusSelect = document.createElement('select');
            statusSelect.className = 'status-dropdown'; // Keep this class for status color logic
            statusSelect.style.display = 'none'; // Hide the original select element
            customSelectWrapper.appendChild(statusSelect); // Append original select inside the wrapper

            const statuses = ['未着手', '依頼中', '2チェック待ち', '作業中', '完了'];
            statuses.forEach(status => {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = status;
                if (client.status === status) {
                    option.selected = true;
                }
                statusSelect.appendChild(option);
            });

            statusCell.appendChild(customSelectWrapper); // Append the wrapper to the cell

            // Initialize custom dropdown after appending to DOM
            initializeCustomDropdown(statusSelect);

            // Set initial background color (apply to the wrapper of the custom select)
            updateStatusBackgroundColor(customSelectWrapper, client.status);

            statusSelect.addEventListener('change', (event) => {
                const newStatus = event.target.value;
                client.status = newStatus; // Update client data (in memory)
                updateStatusBackgroundColor(customSelectWrapper, newStatus);
                saveData(clients, clientDetails); // Save updated clients to localStorage
            });

            // Add new cell for 月次進捗詳細
            const monthlyProgressDetailCell = row.insertCell();
            monthlyProgressDetailCell.innerHTML = `<a href="details.html?no=${client.no}">詳細</a>`;
        });
    }

    function updateStatusBackgroundColor(element, status) {
        // Remove all existing status classes
        element.classList.remove('status-未着手', 'status-依頼中', 'status-2チェック待ち', 'status-作業中', 'status-完了');
        // Add the new status class
        element.classList.add(`status-${status}`);
    }

    // Initial render
    renderClients();

    // Search functionality
    searchInput.addEventListener('input', (event) => {
        renderClients(event.target.value);
    });
});