document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const clientsTableBody = document.querySelector('#clients-table tbody');
    const searchInput = document.getElementById('search-input');
    const staffFilter = document.getElementById('staff-filter');
    const monthFilter = document.getElementById('month-filter');
    const clientsTableHeadRow = document.querySelector('#clients-table thead tr');
    const staffEditModal = document.getElementById('staff-edit-modal');
    const closeStaffModalButton = staffEditModal.querySelector('.close-button');
    const staffListContainer = document.getElementById('staff-list-container');
    const newStaffInput = document.getElementById('new-staff-input');
    const addStaffButton = document.getElementById('add-staff-button');
    const saveStaffButton = document.getElementById('save-staff-button');
    const cancelStaffButton = document.getElementById('cancel-staff-button');
    const exportDataButton = document.getElementById('export-data-button');
    const importDataButton = document.getElementById('import-data-button');
    const importFileInput = document.getElementById('import-file-input');

    // --- State Variables ---
    let currentSortKey = 'fiscalMonth';
    let currentSortDirection = 'asc';
    let originalStaffsState = [];
    let currentEditingStaffs = [];

    // --- Mappings ---
    const headerMap = {
        'No.': 'no',
        '事業所名': 'name',
        '決算月': 'fiscalMonth',
        '未入力期間': 'unattendedMonths',
        '月次進捗': 'monthlyProgress',
        '担当者': '担当者',
        '経理方式': 'accountingMethod',
        '進捗ステータス': 'status'
    };

    // --- Initial Setup ---
    function initializeApp() {
        setupTableHeaders();
        populateFilters();
        addEventListeners();
        renderClients();
        updateSortIcons();
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
        window.staffs.forEach(staff => {
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

        // Button listeners
        document.getElementById('manage-staff-button').addEventListener('click', openStaffModal);
        document.getElementById('add-client-button').addEventListener('click', () => {
            window.location.href = 'edit.html';
        });
        exportDataButton.addEventListener('click', exportData);
        importDataButton.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', importData);

        // Staff Modal listeners
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

    // --- Data I/O Functions ---
    function exportData() {
        const dataToExport = {
            clients: window.clients,
            clientDetails: window.clientDetails,
            staffs: window.staffs
        };

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        a.download = `jigyousyakanri-backup-${dateString}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('データのエクスポートが完了しました。');
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (!importedData.clients || !importedData.clientDetails || !importedData.staffs || !Array.isArray(importedData.clients) || !Array.isArray(importedData.clientDetails) || !Array.isArray(importedData.staffs)) {
                    throw new Error('無効なファイル形式です。');
                }

                if (confirm('ファイルをインポートすると、現在のデータはすべて上書きされます。よろしいですか？')) {
                    window.clients = importedData.clients;
                    window.clientDetails = importedData.clientDetails;
                    window.staffs = importedData.staffs;

                    saveData(window.clients, window.clientDetails, window.staffs);
                    
                    alert('データのインポートが完了しました。ページを更新します。');
                    window.location.reload();
                }
            } catch (error) {
                alert(`インポートに失敗しました: ${error.message}`);
            } finally {
                importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    }

    // --- Rendering and Filtering ---
    function calculateMonthlyProgress(client) {
        const clientDetail = window.clientDetails.find(detail => detail.no === client.no);

        if (!clientDetail || !clientDetail.monthlyTasks || clientDetail.monthlyTasks.length === 0) {
            return 'データなし';
        }

        const allTaskNames = clientDetail.customTasks || [];

        if (allTaskNames.length === 0) {
            return 'タスク未設定';
        }

        let latestCompletedMonth = null;
        let latestCompletedYearMonthNum = 0;

        clientDetail.monthlyTasks.forEach(monthData => {
            if (monthData && monthData.tasks) {
                const totalTasks = allTaskNames.length;
                const completedTasks = allTaskNames.filter(taskName => 
                    monthData.tasks[taskName] && monthData.tasks[taskName].checked
                ).length;

                if (totalTasks > 0 && totalTasks === completedTasks) {
                    const year = parseInt(monthData.month.substring(0, 4));
                    const month = parseInt(monthData.month.substring(5, 7)); 
                    const currentYearMonthNum = year * 100 + month;

                    if (currentYearMonthNum > latestCompletedYearMonthNum) {
                        latestCompletedYearMonthNum = currentYearMonthNum;
                        latestCompletedMonth = monthData.month;
                    }
                }
            }
        });

        return latestCompletedMonth ? `${latestCompletedMonth}まで完了` : '未完了';
    }

    function renderClients() {
        clientsTableBody.innerHTML = '';

        const textFilter = searchInput.value.toLowerCase();
        const staffFilterValue = staffFilter.value;
        const monthFilterValue = monthFilter.value;

        let filteredClients = window.clients.filter(client => {
            const nameMatch = client.name.toLowerCase().includes(textFilter);
            const staffNameMatch = client.担当者.toLowerCase().includes(textFilter);
            const textMatch = textFilter === '' || nameMatch || staffNameMatch;

            const staffMatch = staffFilterValue === '' || client.担当者 === staffFilterValue;
            const monthMatch = monthFilterValue === '' || client.fiscalMonth === monthFilterValue;

            return textMatch && staffMatch && monthMatch;
        });

        // Calculate monthly progress for each client
        filteredClients.forEach(client => {
            client.monthlyProgress = calculateMonthlyProgress(client);

            // 未入力期間の計算
            if (client.monthlyProgress.endsWith('まで完了')) {
                const completedMonthStr = client.monthlyProgress.replace('まで完了', ''); // "YYYY年MM月"
                const completedYear = parseInt(completedMonthStr.substring(0, 4));
                const completedMonth = parseInt(completedMonthStr.substring(5, 7));

                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth() + 1; // getMonth() は 0-11

                const completedTotalMonths = completedYear * 12 + completedMonth;
                const currentTotalMonths = currentYear * 12 + currentMonth;

                const diffMonths = currentTotalMonths - completedTotalMonths;
                client.unattendedMonths = `${diffMonths}ヶ月`;
            } else {
                // 月次進捗が「未完了」や「データなし」の場合
                client.unattendedMonths = '不明'; // または適切な表示
            }
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
            saveData(window.clients, window.clientDetails, window.staffs);
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
        return parseInt(monthStr.replace('月', ''));
    }

    // --- Staff Modal Logic ---
    function openStaffModal() {
        originalStaffsState = JSON.parse(JSON.stringify(window.staffs));
        currentEditingStaffs = JSON.parse(JSON.stringify(window.staffs));
        renderStaffList(currentEditingStaffs);
        staffEditModal.style.display = 'block';
    }

    function renderStaffList(staffs) {
        staffListContainer.innerHTML = '';
        staffs.forEach(staff => {
            const staffItem = document.createElement('div');
            staffItem.classList.add('task-item');
            staffItem.innerHTML = `
                <span class="staff-no">No. ${staff.no}</span>
                <input type="text" value="${staff.name}" data-no="${staff.no}" class="task-input">
                <button class="delete-task-button" data-no="${staff.no}">削除</button>
            `;
            staffListContainer.appendChild(staffItem);
        });
    }

    function addStaff() {
        const newStaffName = newStaffInput.value.trim();
        if (newStaffName && !currentEditingStaffs.some(s => s.name === newStaffName)) {
            const newNo = currentEditingStaffs.length > 0 ? Math.max(...currentEditingStaffs.map(s => s.no)) + 1 : 1;
            currentEditingStaffs.push({ no: newNo, name: newStaffName });
            renderStaffList(currentEditingStaffs);
            newStaffInput.value = '';
        }
    }

    function saveStaff() {
        const nameChanges = new Map();
        currentEditingStaffs.forEach(editedStaff => {
            const originalStaff = originalStaffsState.find(s => s.no === editedStaff.no);
            if (originalStaff && originalStaff.name !== editedStaff.name && editedStaff.name.trim() !== '') {
                nameChanges.set(originalStaff.name, editedStaff.name);
            }
        });

        if (nameChanges.size > 0) {
            window.clients.forEach(client => {
                if (nameChanges.has(client.担当者)) {
                    client.担当者 = nameChanges.get(client.担当者);
                }
            });
        }

        window.staffs = currentEditingStaffs.filter(staff => staff.name.trim() !== '');
        saveData(window.clients, window.clientDetails, window.staffs);
        alert('保存しました');
        staffEditModal.style.display = 'none';
        populateFilters(); // Repopulate filters with new staff names
        renderClients();
    }

    function handleStaffListClick(event) {
        if (event.target.classList.contains('delete-task-button')) {
            const staffNoToDelete = parseInt(event.target.dataset.no);
            currentEditingStaffs = currentEditingStaffs.filter(staff => staff.no !== staffNoToDelete);
            renderStaffList(currentEditingStaffs);
        }
    }

    function handleStaffListInput(event) {
        if (event.target.classList.contains('task-input')) {
            const staffNo = parseInt(event.target.dataset.no);
            const staff = currentEditingStaffs.find(s => s.no === staffNo);
            if (staff) {
                staff.name = event.target.value.trim();
            }
        }
    }

    // --- Run Application ---
    initializeApp();
});
