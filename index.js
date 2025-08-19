document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const clientsTableBody = document.querySelector('#clients-table tbody');
    const searchInput = document.getElementById('search-input');
    const staffFilter = document.getElementById('staff-filter');
    const monthFilter = document.getElementById('month-filter');
    const clientsTableHeadRow = document.querySelector('#clients-table thead tr');
    // Staff modal elements are disabled for now
    // const staffEditModal = document.getElementById('staff-edit-modal');
    // const closeStaffModalButton = staffEditModal.querySelector('.close-button');
    // const staffListContainer = document.getElementById('staff-list-container');
    // const newStaffInput = document.getElementById('new-staff-input');
    // const addStaffButton = document.getElementById('add-staff-button');
    // const saveStaffButton = document.getElementById('save-staff-button');
    // const cancelStaffButton = document.getElementById('cancel-staff-button');
    
    // Data I/O buttons are disabled for now
    // const exportDataButton = document.getElementById('export-data-button');
    // const importDataButton = document.getElementById('import-data-button');
    // const importFileInput = document.getElementById('import-file-input');

    // --- State Variables ---
    let clients = [];
    let staffs = [];
    let currentSortKey = 'fiscalMonth';
    let currentSortDirection = 'asc';

    const API_BASE_URL = 'http://localhost:5001/api';

    // --- Mappings ---
    const headerMap = {
        'No.': 'no',
        '事業所名': 'name',
        '決算月': 'fiscalMonth',
        '未入力期間': 'unattendedMonths',
        '月次進捗': 'monthlyProgress',
        '最終更新': 'lastUpdated',
        '担当者': '担当者',
        '経理方式': 'accountingMethod',
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
        document.getElementById('manage-staff-button').disabled = true;
        document.getElementById('add-client-button').addEventListener('click', () => {
            window.location.href = 'edit.html';
        });
        document.getElementById('export-data-button').disabled = true;
        document.getElementById('import-data-button').disabled = true;
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
            const staffNameMatch = client.担当者.toLowerCase().includes(textFilter);
            const textMatch = textFilter === '' || nameMatch || staffNameMatch;

            const staffMatch = staffFilterValue === '' || client.担当者 === staffFilterValue;
            const monthMatch = monthFilterValue === '' || client.fiscalMonth === monthFilterValue;

            return textMatch && staffMatch && monthMatch;
        });

        // Sorting logic
        filteredClients.sort((a, b) => {
            let valA = a[currentSortKey];
            let valB = b[currentSortKey];

            if (currentSortKey === 'fiscalMonth') {
                valA = monthToNumber(valA);
                valB = monthToNumber(valB);
            } else if (currentSortKey === 'no' || currentSortKey === 'unattendedMonths') {
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
            row.insertCell().textContent = client.no;
            row.insertCell().innerHTML = `<a href="details.html?no=${client.no}" class="client-name-link">${client.name}</a>`;
            row.insertCell().textContent = client.fiscalMonth;
            row.insertCell().textContent = client.unattendedMonths;
            row.insertCell().textContent = client.monthlyProgress;
            row.insertCell().textContent = 'N/A'; // lastUpdated is not available yet
            row.insertCell().textContent = client.担当者;
            row.insertCell().textContent = client.accountingMethod;
            
            const statusCell = row.insertCell();
            const customSelectWrapper = createStatusDropdown(client);
            statusCell.appendChild(customSelectWrapper);
            initializeCustomDropdown(customSelectWrapper.querySelector('select'));
            updateStatusBackgroundColor(customSelectWrapper, client.status);

            row.insertCell().innerHTML = `<a href="edit.html?no=${client.no}">編集</a>`;
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
            console.log(`Status for client ${client.no} changed to ${client.status}. API call to be implemented.`);
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

    // --- Run Application ---
    initializeApp();
});