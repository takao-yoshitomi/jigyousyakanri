document.addEventListener('DOMContentLoaded', () => {
    // Get elements from the DOM
    const clientNameDisplay = document.getElementById('client-name-display');
    const clientNoInput = document.getElementById('client-no');
    const clientNameInput = document.getElementById('client-name');
    const staffSelect = document.getElementById('staff-select');
    const fiscalMonthSelect = document.getElementById('fiscal-month');
    const accountingMethodSelect = document.getElementById('accounting-method');
    const saveButton = document.getElementById('save-button');

    // Get client number from URL
    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = parseInt(urlParams.get('no'));

    let currentClient = null;

    // Find the client in the global array
    if (clientNo) {
        currentClient = window.clients.find(client => client.no === clientNo);
    }

    if (currentClient) {
        // --- Populate form with existing data ---
        clientNameDisplay.textContent = currentClient.name;
        clientNoInput.value = currentClient.no;
        clientNameInput.value = currentClient.name;
        fiscalMonthSelect.value = currentClient.fiscalMonth;
        accountingMethodSelect.value = currentClient.accountingMethod;

        // Populate staff dropdown
        window.staffs.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.name;
            option.textContent = `${staff.name}`; // You can add No. here if you like, e.g., `${staff.no}: ${staff.name}`
            if (currentClient.担当者 === staff.name) {
                option.selected = true;
            }
            staffSelect.appendChild(option);
        });

        // --- Initialize custom dropdowns and update their triggers ---
        document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
            const select = wrapper.querySelector('.custom-select-target');
            if (select) {
                initializeCustomDropdown(select);
                // Manually update trigger text after populating
                const trigger = wrapper.querySelector('.custom-select-trigger');
                if (select.options.length > 0) {
                    trigger.textContent = select.options[select.selectedIndex].textContent;
                }
            }
        });

    } else {
        // Handle case where client is not found
        clientNameDisplay.textContent = 'クライアントが見つかりません。';
        saveButton.disabled = true;
        // Hide the form if no client
        document.getElementById('edit-form').style.display = 'none';
    }

    // --- Add Event Listeners ---

    // Enforce numeric input for the "No." field
    clientNoInput.addEventListener('input', () => {
        clientNoInput.value = clientNoInput.value.replace(/[^0-9]/g, '');
    });

    // Save button click handler
    saveButton.addEventListener('click', () => {
        if (currentClient) {
            // --- Data Validation ---
            const newNo = parseInt(clientNoInput.value);
            const newName = clientNameInput.value.trim();
            const newStaff = staffSelect.value;

            if (!newName) {
                alert('事業所名は必須です。');
                return;
            }
            if (isNaN(newNo) || newNo <= 0) {
                alert('No.は正の整数で入力してください。');
                return;
            }

            // Check if the new No. is already taken by another client
            if (window.clients.some(c => c.no === newNo && c.no !== currentClient.no)) {
                alert('そのNo.は既に使用されています。別のNo.を入力してください。');
                return;
            }

            // --- Update Data ---

            // Find the corresponding details object
            const clientDetail = window.clientDetails.find(detail => detail.no === currentClient.no);

            // Update clientDetails if No. has changed
            if (clientDetail) {
                clientDetail.no = newNo;
                clientDetail.name = newName;
                clientDetail.担当者 = newStaff;
            }

            // Update the main client object
            currentClient.no = newNo;
            currentClient.name = newName;
            currentClient.担当者 = newStaff;
            currentClient.fiscalMonth = fiscalMonthSelect.value;
            currentClient.accountingMethod = accountingMethodSelect.value;

            // Save all data
            saveData(window.clients, window.clientDetails, window.staffs);
            
            alert('変更を保存しました！');
            
            // Redirect to the details page, using the new 'no' in case it was changed
            window.location.href = `details.html?no=${newNo}`;
        }
    });
});

// This part should already be in your custom-dropdown.js, but ensure it's loaded.
// If not, you might need to re-initialize after dynamic population.
document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
    const select = wrapper.querySelector('.custom-select-target');
    if (select) {
        initializeCustomDropdown(select);
    }
});
