document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const clientsTableBody = document.querySelector('#clients-table tbody');
    const searchInput = document.getElementById('search-input');
    const staffFilter = document.getElementById('staff-filter');
    const monthFilter = document.getElementById('month-filter');
    const clientsTableHeadRow = document.querySelector('#clients-table thead tr');
    // Staff modal elements
    const staffEditModal = document.getElementById('staff-edit-modal');
    const closeStaffModalButton = staffEditModal.querySelector('.close-button');
    const staffListContainer = document.getElementById('staff-list-container');
    const newStaffInput = document.getElementById('new-staff-input');
    const addStaffButton = document.getElementById('add-staff-button');
    const saveStaffButton = document.getElementById('save-staff-button');
    const cancelStaffButton = document.getElementById('cancel-staff-button');
    
    // Data I/O buttons are disabled for now
    // const exportDataButton = document.getElementById('export-data-button');
    // const importDataButton = document.getElementById('import-data-button');
    // const importFileInput = document.getElementById('import-file-input');

    // --- State Variables ---
    let clients = [];
    let staffs = [];
    let currentSortKey = 'fiscalMonth';
    let currentSortDirection = 'asc';
    let originalStaffsState = [];
    let currentEditingStaffs = [];

    const API_BASE_URL = 'http://localhost:5001/api';

    // --- Mappings ---
    const headerMap = {
        'No.': 'id',
        '事業所名': 'name',
        '決算月': 'fiscal_month',
        '未入力期間': 'unattendedMonths',
        '月次進捗': 'monthlyProgress',
        '最終更新': 'lastUpdated',
        '担当者': 'staff_name',
        '経理方式': 'accounting_method',
        '進捗ステータス': 'status'
    };

    // --- Initial Setup ---
    async function initializeApp() {
        setupTableHeaders();
        addEventListeners();
        
        try {
            // Fetch data from backend
            [clients, staffs] = await Promise.all([
                fetchClients(),
                fetchStaffs()
            ]);

            populateFilters();
            renderClients();
            updateSortIcons();
        } catch (error) {
            console.error("Error initializing app:", error);
            alert("アプリケーションの初期化に失敗しました。");
        }
    }

    function setupTableHeaders() {
        const noTh = document.createElement('th');
        noTh.textContent = 'No.';
        clientsTableHeadRow.insertBefore(noTh, clientsTableHeadRow.firstChild);

        const editTh = document.createElement('th');
        editTh.textContent = '登録情報編集';
        clientsTableHeadRow.appendChild(editTh);

        Array.from(clientsTableHeadRow.children).forEach(th => {
            const headerText = th.textContent.trim();
            const sortKey = headerMap[headerText];
            if (sortKey) {
                th.dataset.sortKey = sortKey;
                const sortIconSpan = document.createElement('span');
                sortIconSpan.classList.add('sort-icon');
                th.appendChild(sortIconSpan);
            }
        });
    }

    function populateFilters() {
        // Staff Filter
        staffFilter.innerHTML = '<option value="">すべての担当者</option>';
        staffs.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.name;
            option.textContent = staff.name;
            staffFilter.appendChild(option);
        });

        // Month Filter
        monthFilter.innerHTML = '<option value="">すべての決算月</option>';
        for (let i = 1; i <= 12; i++) {
            const month = `${i}月`;
            const option = document.createElement('option');
            option.value = month;
            option.textContent = month;
            monthFilter.appendChild(option);
        }

        // Initialize custom dropdowns
        initializeCustomDropdown(staffFilter);
        initializeCustomDropdown(monthFilter);
    }

    function addEventListeners() {
        // Search and filter listeners
        searchInput.addEventListener('input', () => renderClients());
        staffFilter.addEventListener('change', () => renderClients());
        monthFilter.addEventListener('change', () => renderClients());

        // Sorting listener
        clientsTableHeadRow.addEventListener('click', handleSortClick);

        // Button listeners (Staff and I/O buttons are disabled for now)
        // document.getElementById('manage-staff-button').disabled = true;
        document.getElementById('add-client-button').addEventListener('click', () => {
            window.location.href = 'edit.html';
        });
        // document.getElementById('export-data-button').disabled = true;
        // document.getElementById('import-data-button').disabled = true;

        // Staff Modal listeners
        document.getElementById('manage-staff-button').addEventListener('click', openStaffModal);
        closeStaffModalButton.addEventListener('click', () => staffEditModal.style.display = 'none');
        cancelStaffButton.addEventListener('click', () => staffEditModal.style.display = 'none');
        window.addEventListener('click', (event) => {
            if (event.target === staffEditModal) {
                staffEditModal.style.display = 'none';
            }
        });

        addStaffButton.addEventListener('click', addStaff);
        saveStaffButton.addEventListener('click', saveStaff);
        staffListContainer.addEventListener('click', handleStaffListClick);
        staffListContainer.addEventListener('input', handleStaffListInput);
    }

    // --- Data Fetching Functions ---
    async function fetchClients() {
        try {
            const response = await fetch(`${API_BASE_URL}/clients`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch clients:", error);
            alert("顧客情報の読み込みに失敗しました。");
            return [];
        }
    }

    async function fetchStaffs() {
        try {
            const response = await fetch(`${API_BASE_URL}/staffs`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch staffs:", error);
            alert("担当者情報の読み込みに失敗しました。");
            return [];
        }
    }

    // --- Rendering and Filtering ---
    function renderClients() {
        clientsTableBody.innerHTML = '';

        const textFilter = searchInput.value.toLowerCase();
        const staffFilterValue = staffFilter.value;
        const monthFilterValue = monthFilter.value;

        let filteredClients = clients.filter(client => {
            const nameMatch = client.name.toLowerCase().includes(textFilter);
            const staffNameMatch = client.staff_name ? client.staff_name.toLowerCase().includes(textFilter) : false;
            const textMatch = textFilter === '' || nameMatch || staffNameMatch;

            const staffMatch = staffFilterValue === '' || client.staff_name === staffFilterValue;
            const monthMatch = monthFilterValue === '' || `${client.fiscal_month}月` === monthFilterValue;

            return textMatch && staffMatch && monthMatch;
        });

        // Sorting logic
        filteredClients.sort((a, b) => {
            let valA = a[currentSortKey];
            let valB = b[currentSortKey];

            if (currentSortKey === 'fiscal_month') {
                valA = valA; // Already a number
                valB = valB; // Already a number
            } else if (currentSortKey === 'id' || currentSortKey === 'unattendedMonths') {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            }

            if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        updateSortIcons();

        // Render rows
        filteredClients.forEach(client => {
            const row = clientsTableBody.insertRow();
            row.insertCell().textContent = client.id;
            row.insertCell().innerHTML = `<a href="details.html?no=${client.id}" class="client-name-link">${client.name}</a>`;
            row.insertCell().textContent = `${client.fiscal_month}月`;
            row.insertCell().textContent = client.unattendedMonths;
            row.insertCell().textContent = client.monthlyProgress;
            const updatedAtCell = row.insertCell();
            if (client.updated_at) {
                const date = new Date(client.updated_at);
                const jstString = date.toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Tokyo'
                });
                updatedAtCell.textContent = jstString;
            } else {
                updatedAtCell.textContent = 'N/A';
            }
            row.insertCell().textContent = client.staff_name;
            row.insertCell().textContent = client.accounting_method;
            
            const statusCell = row.insertCell();
            const customSelectWrapper = createStatusDropdown(client);
            statusCell.appendChild(customSelectWrapper);
            initializeCustomDropdown(customSelectWrapper.querySelector('select'));
            updateStatusBackgroundColor(customSelectWrapper, client.status);

            row.insertCell().innerHTML = `<a href="edit.html?no=${client.id}">編集</a>`;
        });
    }

    function createStatusDropdown(client) {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';

        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        wrapper.appendChild(trigger);

        const options = document.createElement('div');
        options.className = 'custom-options';
        wrapper.appendChild(options);

        const select = document.createElement('select');
        select.className = 'status-dropdown';
        select.style.display = 'none';
        wrapper.appendChild(select);

        const statuses = ['未着手', '依頼中', 'チェック待ち', '作業中', '完了'];
        statuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            if (client.status === status) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.addEventListener('change', (event) => {
            client.status = event.target.value;
            updateStatusBackgroundColor(wrapper, client.status);
            // TODO: Call API to save status change
            console.log(`Status for client ${client.id} changed to ${client.status}. API call to be implemented.`);
            // saveData(window.clients, window.clientDetails, window.staffs);
        });

        return wrapper;
    }

    function updateStatusBackgroundColor(element, status) {
        element.className = 'custom-select-wrapper'; // Reset classes
        element.classList.add(`status-${status}`);
    }

    // --- Sorting ---
    function handleSortClick(event) {
        const targetTh = event.target.closest('th');
        if (!targetTh || !targetTh.dataset.sortKey) return;

        const sortKey = targetTh.dataset.sortKey;
        if (currentSortKey === sortKey) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortKey = sortKey;
            currentSortDirection = 'asc';
        }
        renderClients();
    }

    function updateSortIcons() {
        clientsTableHeadRow.querySelectorAll('th[data-sort-key]').forEach(th => {
            const sortIcon = th.querySelector('.sort-icon');
            th.classList.remove('sorted-column');
            sortIcon.classList.remove('asc', 'desc');
            if (th.dataset.sortKey === currentSortKey) {
                th.classList.add('sorted-column');
                sortIcon.classList.add(currentSortDirection);
            }
        });
    }

    function monthToNumber(monthStr) {
        if (typeof monthStr !== 'string') return 0;
        return parseInt(monthStr.replace('月', ''));
    }

    // --- Staff Modal Logic ---
    function openStaffModal() {
        // The 'staffs' array is already fetched from the API in initializeApp
        originalStaffsState = JSON.parse(JSON.stringify(staffs));
        currentEditingStaffs = JSON.parse(JSON.stringify(staffs));
        renderStaffList(currentEditingStaffs);
        staffEditModal.style.display = 'block';
    }

    function renderStaffList(staffsToRender) {
        staffListContainer.innerHTML = '';
        staffsToRender.forEach(staff => {
            const staffItem = document.createElement('div');
            staffItem.classList.add('task-item'); // Assuming task-item style is generic
            staffItem.innerHTML = `
                <span class="staff-no">No. ${staff.id}</span>
                <input type="text" value="${staff.name}" data-id="${staff.id}" class="task-input">
                <button class="delete-task-button" data-id="${staff.id}">削除</button>
            `;
            staffListContainer.appendChild(staffItem);
        });
    }

    async function addStaff() {
        const newStaffName = newStaffInput.value.trim();
        if (!newStaffName) {
            alert('担当者名を入力してください。');
            return;
        }
        if (currentEditingStaffs.some(s => s.name === newStaffName)) {
            alert('その担当者は既に追加されています。');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/staffs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newStaffName }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '担当者の追加に失敗しました。');
            }

            const newStaff = await response.json();
            currentEditingStaffs.push(newStaff);
            renderStaffList(currentEditingStaffs);
            newStaffInput.value = '';

        } catch (error) {
            alert(error.message);
        }
    }

    async function handleStaffListClick(event) {
        if (!event.target.classList.contains('delete-task-button')) {
            return;
        }

        const staffIdToDelete = parseInt(event.target.dataset.id);
        const staffToDelete = currentEditingStaffs.find(s => s.id === staffIdToDelete);

        if (!staffToDelete) return;

        if (!confirm(`「${staffToDelete.name}」さんを削除します。よろしいですか？\n（既に使用中の担当者は削除できません）`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/staffs/${staffIdToDelete}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '担当者の削除に失敗しました。');
            }

            currentEditingStaffs = currentEditingStaffs.filter(staff => staff.id !== staffIdToDelete);
            renderStaffList(currentEditingStaffs);

        } catch (error) {
            alert(error.message);
        }
    }

    function handleStaffListInput(event) {
        if (event.target.classList.contains('task-input')) { // Assuming 'task-input' class is used for staff name inputs
            const staffId = parseInt(event.target.dataset.id);
            const staff = currentEditingStaffs.find(s => s.id === staffId);
            if (staff) {
                staff.name = event.target.value.trim();
            }
        }
    }

    async function saveStaff() {
        const updatePromises = [];

        // Find updated staff members
        currentEditingStaffs.forEach(editedStaff => {
            const originalStaff = originalStaffsState.find(s => s.id === editedStaff.id);
            // Check if the staff existed before and the name has changed
            if (originalStaff && originalStaff.name !== editedStaff.name) {
                const promise = fetch(`${API_BASE_URL}/staffs/${editedStaff.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: editedStaff.name }),
                });
                updatePromises.push(promise);
            }
        });

        // Note: This implementation only handles UPDATES.
        // Additions and deletions are handled instantly and are not part of the "Save" button's logic.

        if (updatePromises.length === 0) {
            // If nothing changed, just close the modal.
            staffEditModal.style.display = 'none';
            return;
        }

        try {
            const responses = await Promise.all(updatePromises);

            // Check if all API calls were successful
            const failedResponse = responses.find(res => !res.ok);
            if (failedResponse) {
                const errorData = await failedResponse.json();
                throw new Error(errorData.error || `Failed to update staff with status: ${failedResponse.status}`);
            }

            alert('保存しました！');
            window.location.reload(); // Reload the page to reflect all changes

        } catch (error) {
            alert(`保存中にエラーが発生しました: ${error.message}`);
        }
    }

    // --- Run Application ---
    initializeApp();
});